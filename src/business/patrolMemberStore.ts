import { create } from 'zustand';
import type { Bench, PatrolMember, PatrolOrder } from '@/types';
import { loadPatrolOrders, savePatrolOrders } from '@/utils/storage';
import { generateId } from '@/utils/comfort';
import { mockMembers } from '@/data/mockMembers';
import { detectBenchDrift, validatePatrolDraft } from '@/business/patrolRules';
import type { PatrolDraft } from '@/business/patrolRules';

/** 成员状态：巡护单与成员状态流转，所有变更即时持久化 */

interface PatrolMemberState {
  orders: PatrolOrder[];
  initialized: boolean;
}

interface PatrolMemberActions {
  initialize: () => void;
  /** 建单：返回拒绝原因数组，空数组表示成功；失败时原有数据不变 */
  createOrder: (draft: PatrolDraft, benches: Bench[]) => string[];
  memberArrive: (orderId: string, memberId: string) => void;
  memberComplete: (orderId: string, memberId: string) => void;
  memberQuit: (orderId: string, memberId: string, reason: string) => void;
  resumeOrder: (orderId: string, bench: Bench) => void;
  /** 长椅评分/材质/位置变动时暂停对应巡护单，保留进度 */
  syncBenchChange: (bench: Bench) => void;
  cancelOrdersForBench: (benchId: string, reason: string) => void;
}

function persist(orders: PatrolOrder[]) {
  savePatrolOrders(orders);
  return { orders };
}

/** 结算：未退出成员全部完成则整单结束；全部退出则终止 */
function settle(order: PatrolOrder, now: string): PatrolOrder {
  const remaining = order.members.filter((m) => m.status !== 'quit');
  if (remaining.length === 0) {
    return { ...order, status: 'cancelled', finishedAt: now };
  }
  if (remaining.every((m) => m.status === 'completed')) {
    return { ...order, status: 'finished', finishedAt: now };
  }
  return order;
}

export const usePatrolMemberStore = create<PatrolMemberState & PatrolMemberActions>((set, get) => {
  const ensureInit = () => {
    if (!get().initialized) get().initialize();
  };

  const updateMember = (
    orderId: string,
    memberId: string,
    fn: (order: PatrolOrder, member: PatrolMember) => PatrolMember | null,
  ) => {
    ensureInit();
    const now = new Date().toISOString();
    const orders = get().orders.map((order) => {
      if (order.id !== orderId || order.status !== 'active') return order;
      const members = order.members.map((m) => {
        if (m.id !== memberId) return m;
        return fn(order, m) ?? m;
      });
      return settle({ ...order, members }, now);
    });
    set(persist(orders));
  };

  return {
    orders: [],
    initialized: false,

    initialize: () => {
      set({ orders: loadPatrolOrders(), initialized: true });
    },

    createOrder: (draft, benches) => {
      ensureInit();
      const errors = validatePatrolDraft(draft, benches, get().orders, mockMembers);
      if (errors.length > 0) return errors; // 整单拒绝，原数据不变

      const bench = benches.find((b) => b.id === draft.benchId)!;
      const now = new Date().toISOString();
      const order: PatrolOrder = {
        id: generateId(),
        benchId: bench.id,
        benchName: bench.name,
        members: draft.members.map((m) => ({
          id: m.memberId,
          name: mockMembers.find((r) => r.id === m.memberId)!.name,
          role: m.role,
          timeSlot: m.timeSlot,
          status: 'pending',
        })),
        status: 'active',
        snapshot: {
          rating: bench.rating,
          material: bench.material,
          location: bench.location,
        },
        createdAt: now,
      };
      set(persist([order, ...get().orders]));
      return [];
    },

    memberArrive: (orderId, memberId) => {
      updateMember(orderId, memberId, (_order, m) =>
        m.status === 'pending' ? { ...m, status: 'arrived', arrivedAt: new Date().toISOString() } : null,
      );
    },

    memberComplete: (orderId, memberId) => {
      updateMember(orderId, memberId, (_order, m) =>
        m.status === 'arrived' ? { ...m, status: 'completed', completedAt: new Date().toISOString() } : null,
      );
    },

    memberQuit: (orderId, memberId, reason) => {
      const trimmed = reason.trim();
      if (!trimmed) return; // 退出必须填写原因
      updateMember(orderId, memberId, (_order, m) =>
        m.status === 'pending' || m.status === 'arrived'
          ? { ...m, status: 'quit', quitAt: new Date().toISOString(), quitReason: trimmed }
          : null,
      );
    },

    resumeOrder: (orderId, bench) => {
      ensureInit();
      const orders = get().orders.map((order) => {
        if (order.id !== orderId || order.status !== 'paused') return order;
        return {
          ...order,
          status: 'active' as const,
          pauseReason: undefined,
          snapshot: {
            rating: bench.rating,
            material: bench.material,
            location: bench.location,
          },
        };
      });
      set(persist(orders));
    },

    syncBenchChange: (bench) => {
      ensureInit();
      let changed = false;
      const orders = get().orders.map((order) => {
        if (order.benchId !== bench.id || order.status !== 'active') return order;
        const drift = detectBenchDrift(order, bench);
        if (drift.length === 0) return order;
        changed = true;
        return {
          ...order,
          status: 'paused' as const,
          pauseReason: `长椅${drift.join('、')}发生变动，巡护暂停`,
        };
      });
      if (changed) set(persist(orders));
    },

    cancelOrdersForBench: (benchId, reason) => {
      ensureInit();
      const now = new Date().toISOString();
      let changed = false;
      const orders = get().orders.map((order) => {
        if (order.benchId !== benchId) return order;
        if (order.status !== 'active' && order.status !== 'paused') return order;
        changed = true;
        return { ...order, status: 'cancelled' as const, pauseReason: reason, finishedAt: now };
      });
      if (changed) set(persist(orders));
    },
  };
});
