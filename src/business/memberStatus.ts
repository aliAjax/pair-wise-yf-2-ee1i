import { create } from 'zustand';
import type { Member, MemberStatus, PatrolOrder } from '@/types';
import { loadMembers, saveMembers } from '@/utils/storage';
import { mockMembers } from '@/data/mockMembers';
import { isOrderActive } from './patrolRules';

/* ===================== 成员名册（本地持久化） ===================== */

interface MemberState {
  members: Member[];
  initialized: boolean;
}

interface MemberActions {
  initialize: () => void;
  getMemberById: (id: string) => Member | undefined;
}

export const useMemberStore = create<MemberState & MemberActions>((set, get) => ({
  members: [],
  initialized: false,

  initialize: () => {
    if (get().initialized) return;
    const stored = loadMembers();
    if (stored.length > 0) {
      set({ members: stored, initialized: true });
    } else {
      set({ members: mockMembers, initialized: true });
      saveMembers(mockMembers);
    }
  },

  getMemberById: (id) => get().members.find((member) => member.id === id),
}));

/* ===================== 成员状态推导 ===================== */

/** 成员当前所在的进行中巡护单（未退出才算占用） */
export function getMemberActiveOrder(
  memberId: string,
  orders: PatrolOrder[],
): PatrolOrder | undefined {
  return orders.find(
    (order) =>
      isOrderActive(order) &&
      order.members.some((member) => member.memberId === memberId && !member.leftAt),
  );
}

/** 成员全局状态：在任一进行中巡护单里即为「巡护中」，否则「空闲」 */
export function deriveMemberStatus(memberId: string, orders: PatrolOrder[]): MemberStatus {
  return getMemberActiveOrder(memberId, orders) ? 'patrolling' : 'idle';
}

/** 成员在某一巡护单内的状态 */
export function deriveMemberOrderStatus(order: PatrolOrder, memberId: string): MemberStatus {
  const member = order.members.find((item) => item.memberId === memberId);
  if (!member) return 'idle';
  if (member.leftAt) return 'left';
  if (member.completed) return 'done';
  return 'patrolling';
}
