import { create } from 'zustand';
import type { Bench, Member, PatrolEvent, PatrolOrder } from '@/types';
import { loadPatrols, savePatrols } from '@/utils/storage';
import { generateId } from '@/utils/comfort';
import {
  canFinishOrder,
  canMemberArrive,
  canMemberComplete,
  canMemberLeave,
  isBenchChangedFromSnapshot,
  takeBenchSnapshot,
  validateCreatePatrol,
  type CreatePatrolInput,
  type RuleResult,
} from './patrolRules';

/* ===================== 页面状态 ===================== */

interface PatrolPageState {
  orders: PatrolOrder[];
  initialized: boolean;
  /** 页面提示（建单被拒绝的原因、操作反馈等） */
  notice: string | null;
  /** 正在填写退出原因的成员 */
  leavingTarget: { orderId: string; memberId: string } | null;
  leaveReasonDraft: string;
}

interface PatrolPageActions {
  initialize: () => void;
  setNotice: (notice: string | null) => void;
  openLeaveDialog: (orderId: string, memberId: string) => void;
  closeLeaveDialog: () => void;
  setLeaveReasonDraft: (reason: string) => void;

  /** 建单：校验不通过则整单拒绝，原有数据不变 */
  createOrder: (input: CreatePatrolInput, benches: Bench[], members: Member[]) => RuleResult;
  arrive: (orderId: string, memberId: string) => RuleResult;
  complete: (orderId: string, memberId: string) => RuleResult;
  leave: (orderId: string, memberId: string, reason: string) => RuleResult;
  /** 长椅评分、材质或位置变动时由档案侧调用：暂停相关巡护并保留进度 */
  pauseForBenchChange: (bench: Bench) => void;
  /** 恢复巡护：以当前档案重新留底，之后排行才允许更新 */
  resumeOrder: (orderId: string, bench: Bench) => void;

  getOrderById: (orderId: string) => PatrolOrder | undefined;
  getOrdersForBench: (benchId: string) => PatrolOrder[];
}

function makeEvent(type: PatrolEvent['type'], message: string, memberId?: string): PatrolEvent {
  return { id: generateId(), type, message, memberId, at: new Date().toISOString() };
}

export const usePatrolStore = create<PatrolPageState & PatrolPageActions>((set, get) => {
  /** 确保巡护单已从本地存储加载（供档案侧暂停时调用） */
  const ensureInitialized = () => {
    if (!get().initialized) {
      set({ orders: loadPatrols(), initialized: true });
    }
  };

  const commit = (orders: PatrolOrder[]) => {
    set({ orders });
    savePatrols(orders);
  };

  const updateOrder = (orderId: string, updater: (order: PatrolOrder) => PatrolOrder) => {
    commit(get().orders.map((order) => (order.id === orderId ? updater(order) : order)));
  };

  return {
    orders: [],
    initialized: false,
    notice: null,
    leavingTarget: null,
    leaveReasonDraft: '',

    initialize: () => {
      ensureInitialized();
    },

    setNotice: (notice) => set({ notice }),

    openLeaveDialog: (orderId, memberId) =>
      set({ leavingTarget: { orderId, memberId }, leaveReasonDraft: '' }),

    closeLeaveDialog: () => set({ leavingTarget: null, leaveReasonDraft: '' }),

    setLeaveReasonDraft: (reason) => set({ leaveReasonDraft: reason }),

    createOrder: (input, benches, members) => {
      ensureInitialized();
      const check = validateCreatePatrol(input, benches, members, get().orders);
      if (!check.ok) {
        // 整单拒绝：只给出提示，不改动任何已有数据
        set({ notice: check.reason });
        return check;
      }

      const bench = benches.find((item) => item.id === input.benchId)!;
      const order: PatrolOrder = {
        id: generateId(),
        benchId: input.benchId,
        status: 'ongoing',
        members: input.members.map((item) => ({
          memberId: item.memberId,
          timePeriods: item.timePeriods,
          arrived: false,
          completed: false,
        })),
        events: [makeEvent('create', `发起「${bench.name}」结伴巡护，共 ${input.members.length} 人`)],
        benchSnapshot: takeBenchSnapshot(bench),
        createdAt: new Date().toISOString(),
      };
      commit([order, ...get().orders]);
      set({ notice: null });
      return { ok: true };
    },

    arrive: (orderId, memberId) => {
      const order = get().getOrderById(orderId);
      if (!order) return { ok: false, reason: '巡护单不存在' };
      const check = canMemberArrive(order, memberId);
      if (!check.ok) return check;

      updateOrder(orderId, (current) => ({
        ...current,
        members: current.members.map((member) =>
          member.memberId === memberId
            ? { ...member, arrived: true, arrivedAt: new Date().toISOString() }
            : member,
        ),
        events: [...current.events, makeEvent('arrive', '到达现场', memberId)],
      }));
      return { ok: true };
    },

    complete: (orderId, memberId) => {
      const order = get().getOrderById(orderId);
      if (!order) return { ok: false, reason: '巡护单不存在' };
      const check = canMemberComplete(order, memberId);
      if (!check.ok) return check;

      updateOrder(orderId, (current) => {
        const members = current.members.map((member) =>
          member.memberId === memberId
            ? { ...member, completed: true, completedAt: new Date().toISOString() }
            : member,
        );
        const next: PatrolOrder = {
          ...current,
          members,
          events: [...current.events, makeEvent('complete', '完成本人分工', memberId)],
        };
        // 最后一名留下的成员完成时，整单结束
        if (canFinishOrder(next)) {
          next.status = 'completed';
          next.completedAt = new Date().toISOString();
          next.events = [...next.events, makeEvent('complete', '全员分工完成，巡护结束')];
        }
        return next;
      });
      return { ok: true };
    },

    leave: (orderId, memberId, reason) => {
      const order = get().getOrderById(orderId);
      if (!order) return { ok: false, reason: '巡护单不存在' };
      const check = canMemberLeave(order, memberId, reason);
      if (!check.ok) return check;

      updateOrder(orderId, (current) => {
        const next: PatrolOrder = {
          ...current,
          members: current.members.map((member) =>
            member.memberId === memberId
              ? { ...member, leaveReason: reason.trim(), leftAt: new Date().toISOString() }
              : member,
          ),
          events: [
            ...current.events,
            makeEvent('leave', `退出巡护：${reason.trim()}`, memberId),
          ],
        };
        // 退出后若其余成员均已完成分工，整单同时结束
        if (canFinishOrder(next)) {
          next.status = 'completed';
          next.completedAt = new Date().toISOString();
          next.events = [...next.events, makeEvent('complete', '其余成员分工均已完成，巡护结束')];
        }
        return next;
      });
      set({ leavingTarget: null, leaveReasonDraft: '' });
      return { ok: true };
    },

    pauseForBenchChange: (bench) => {
      ensureInitialized();
      let changed = false;
      const orders = get().orders.map((order) => {
        if (
          order.benchId === bench.id &&
          order.status === 'ongoing' &&
          order.benchSnapshot &&
          isBenchChangedFromSnapshot(bench, order.benchSnapshot)
        ) {
          changed = true;
          return {
            ...order,
            status: 'paused' as const,
            pauseReason: '长椅评分、材质或位置已变动',
            pausedAt: new Date().toISOString(),
            events: [
              ...order.events,
              makeEvent('pause', '长椅评分、材质或位置变动，巡护暂停，进度已保留'),
            ],
          };
        }
        return order;
      });
      if (changed) commit(orders);
    },

    resumeOrder: (orderId, bench) => {
      updateOrder(orderId, (current) => {
        if (current.status !== 'paused') return current;
        return {
          ...current,
          status: 'ongoing',
          pauseReason: undefined,
          pausedAt: undefined,
          // 恢复时以当前档案重新留底，此后排行按新数据更新
          benchSnapshot: takeBenchSnapshot(bench),
          events: [...current.events, makeEvent('resume', '巡护恢复，继续结伴巡护')],
        };
      });
    },

    getOrderById: (orderId) => get().orders.find((order) => order.id === orderId),

    getOrdersForBench: (benchId) => get().orders.filter((order) => order.benchId === benchId),
  };
});
