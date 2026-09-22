import type { Member } from '@/types';

/** 可参与结伴巡护的成员（无需注册，本地维护） */
export const mockMembers: Member[] = [
  { id: 'member-001', name: '林小满', role: '巡护志愿者', avatarColor: '#6B8E5A' },
  { id: 'member-002', name: '陈默', role: '长椅观察员', avatarColor: '#C17F59' },
  { id: 'member-003', name: '苏晚晴', role: '社区记录员', avatarColor: '#8AA87A' },
  { id: 'member-004', name: '周屿', role: '巡护志愿者', avatarColor: '#A0784F' },
  { id: 'member-005', name: '何知秋', role: '城市漫步者', avatarColor: '#7A8FA8' },
];
