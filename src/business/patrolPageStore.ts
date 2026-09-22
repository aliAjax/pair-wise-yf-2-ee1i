import { create } from 'zustand';
import type { PatrolRoleType, TimePeriodType } from '@/types';
import { MAX_PATROL_MEMBERS } from '@/business/patrolRules';

/** 页面状态：建单表单草稿、校验提示、退出原因弹窗等纯 UI 状态 */

export interface MemberDraft {
  role: PatrolRoleType;
  timeSlot: TimePeriodType;
}

interface PatrolPageState {
  selectedBenchId: string | null;
  /** 已选成员（键为成员 id），选择顺序即数组顺序 */
  selectedMembers: Record<string, MemberDraft>;
  errors: string[];
  notice: string | null;
  quitting: { orderId: string; memberId: string; memberName: string } | null;
  quitReason: string;
}

interface PatrolPageActions {
  selectBench: (benchId: string | null) => void;
  toggleMember: (memberId: string) => void;
  setMemberRole: (memberId: string, role: PatrolRoleType) => void;
  setMemberSlot: (memberId: string, timeSlot: TimePeriodType) => void;
  setErrors: (errors: string[]) => void;
  setNotice: (notice: string | null) => void;
  resetForm: () => void;
  openQuit: (orderId: string, memberId: string, memberName: string) => void;
  closeQuit: () => void;
  setQuitReason: (reason: string) => void;
}

const defaultMemberDraft: MemberDraft = { role: 'record', timeSlot: 'morning' };

export const usePatrolPageStore = create<PatrolPageState & PatrolPageActions>((set, get) => ({
  selectedBenchId: null,
  selectedMembers: {},
  errors: [],
  notice: null,
  quitting: null,
  quitReason: '',

  selectBench: (benchId) => set({ selectedBenchId: benchId }),

  toggleMember: (memberId) => {
    const selected = { ...get().selectedMembers };
    if (selected[memberId]) {
      delete selected[memberId];
    } else {
      if (Object.keys(selected).length >= MAX_PATROL_MEMBERS) return;
      selected[memberId] = { ...defaultMemberDraft };
    }
    set({ selectedMembers: selected });
  },

  setMemberRole: (memberId, role) => {
    const selected = { ...get().selectedMembers };
    if (!selected[memberId]) return;
    selected[memberId] = { ...selected[memberId], role };
    set({ selectedMembers: selected });
  },

  setMemberSlot: (memberId, timeSlot) => {
    const selected = { ...get().selectedMembers };
    if (!selected[memberId]) return;
    selected[memberId] = { ...selected[memberId], timeSlot };
    set({ selectedMembers: selected });
  },

  setErrors: (errors) => set({ errors }),
  setNotice: (notice) => set({ notice }),

  resetForm: () =>
    set({ selectedBenchId: null, selectedMembers: {}, errors: [], notice: null }),

  openQuit: (orderId, memberId, memberName) =>
    set({ quitting: { orderId, memberId, memberName }, quitReason: '' }),
  closeQuit: () => set({ quitting: null, quitReason: '' }),
  setQuitReason: (reason) => set({ quitReason: reason }),
}));
