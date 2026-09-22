export type MaterialType = 'wood' | 'metal' | 'stone' | 'plastic' | 'mixed';
export type OrientationType = 'east' | 'south' | 'west' | 'north' | 'southeast' | 'northeast' | 'southwest' | 'northwest';
export type ShadeLevelType = 'none' | 'partial' | 'full';
export type NoiseLevelType = 'quiet' | 'moderate' | 'noisy';
export type StayDurationType = 'short' | 'medium' | 'long' | 'verylong';
export type TimePeriodType = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';

export interface BenchExperience {
  id: string;
  benchId: string;
  timePeriod: TimePeriodType;
  notes: string;
  rating: number;
}

export interface Bench {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  material: MaterialType;
  orientation: OrientationType;
  hasBackrest: boolean;
  shadeLevel: ShadeLevelType;
  noiseLevel: NoiseLevelType;
  stayDuration: StayDurationType;
  rating: number;
  review: string;
  experiences: BenchExperience[];
  /** 是否维护中（维护中的长椅不能发起巡护） */
  underMaintenance?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const MATERIAL_LABELS: Record<MaterialType, string> = {
  wood: '木质',
  metal: '金属',
  stone: '石质',
  plastic: '塑料',
  mixed: '混合材质',
};

export const ORIENTATION_LABELS: Record<OrientationType, string> = {
  east: '东',
  south: '南',
  west: '西',
  north: '北',
  southeast: '东南',
  northeast: '东北',
  southwest: '西南',
  northwest: '西北',
};

export const SHADE_LABELS: Record<ShadeLevelType, string> = {
  none: '无遮阴',
  partial: '部分遮阴',
  full: '完全遮阴',
};

export const NOISE_LABELS: Record<NoiseLevelType, string> = {
  quiet: '安静',
  moderate: '一般',
  noisy: '嘈杂',
};

export const STAY_DURATION_LABELS: Record<StayDurationType, string> = {
  short: '少于15分钟',
  medium: '15-30分钟',
  long: '30-60分钟',
  verylong: '1小时以上',
};

export const TIME_PERIOD_LABELS: Record<TimePeriodType, string> = {
  morning: '早晨',
  noon: '中午',
  afternoon: '下午',
  evening: '傍晚',
  night: '夜晚',
};

export const TIME_PERIOD_ICONS: Record<TimePeriodType, string> = {
  morning: 'sunrise',
  noon: 'sun',
  afternoon: 'cloud-sun',
  evening: 'sunset',
  night: 'moon',
};

/* ===================== 结伴巡护 ===================== */

/** 巡护单状态：进行中 / 已暂停（档案变动） / 已完成 */
export type PatrolStatus = 'ongoing' | 'paused' | 'completed';
/** 成员状态：空闲 / 巡护中 / 已退出 / 已完成 */
export type MemberStatus = 'idle' | 'patrolling' | 'left' | 'done';

export interface PatrolMember {
  memberId: string;
  /** 该成员认领的时段分工 */
  timePeriods: TimePeriodType[];
  /** 是否到达现场 */
  arrived: boolean;
  /** 是否完成本人分工 */
  completed: boolean;
  /** 退出原因（退出后必填） */
  leaveReason?: string;
  arrivedAt?: string;
  completedAt?: string;
  leftAt?: string;
}

export interface PatrolEvent {
  id: string;
  type: 'create' | 'arrive' | 'complete' | 'leave' | 'pause' | 'resume';
  memberId?: string;
  message: string;
  at: string;
}

/** 暂停时保留的长椅档案快照（恢复前排行按快照冻结） */
export interface PatrolBenchSnapshot {
  name: string;
  location: string;
  lat: number;
  lng: number;
  material: MaterialType;
  rating: number;
  hasBackrest: boolean;
  shadeLevel: ShadeLevelType;
  noiseLevel: NoiseLevelType;
  stayDuration: StayDurationType;
  orientation: OrientationType;
  review: string;
  experiences: BenchExperience[];
}

export interface PatrolOrder {
  id: string;
  benchId: string;
  status: PatrolStatus;
  members: PatrolMember[];
  events: PatrolEvent[];
  /** 暂停原因，如「长椅评分、材质或位置已变动」 */
  pauseReason?: string;
  /** 暂停时刻的档案快照，用于排行冻结；恢复后清空 */
  benchSnapshot?: PatrolBenchSnapshot;
  pausedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  /** 角色/称呼，如「巡护志愿者」 */
  role: string;
  avatarColor: string;
}

export const PATROL_STATUS_LABELS: Record<PatrolStatus, string> = {
  ongoing: '巡护中',
  paused: '已暂停',
  completed: '已完成',
};

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  idle: '空闲',
  patrolling: '巡护中',
  left: '已退出',
  done: '已完成',
};
