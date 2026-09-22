import type {
  Bench,
  PatrolOrder,
  PatrolRoleType,
  TimePeriodType,
} from '@/types';
import type { RosterMember } from '@/data/mockMembers';

/** 巡护建单规则：纯函数校验，不修改任何数据 */

export const MIN_PATROL_MEMBERS = 2;
export const MAX_PATROL_MEMBERS = 3;

export interface PatrolDraftMember {
  memberId: string;
  role: PatrolRoleType;
  timeSlot: TimePeriodType;
}

export interface PatrolDraft {
  benchId: string | null;
  members: PatrolDraftMember[];
}

/** 进行中或已暂停的单据都视为「占用中」 */
export function isOrderOpen(order: PatrolOrder): boolean {
  return order.status === 'active' || order.status === 'paused';
}

/**
 * 校验建单草稿，返回全部拒绝原因（空数组表示通过）。
 * 任一规则不满足则整单拒绝，调用方不得改动已有数据。
 */
export function validatePatrolDraft(
  draft: PatrolDraft,
  benches: Bench[],
  orders: PatrolOrder[],
  roster: RosterMember[],
): string[] {
  const errors: string[] = [];

  if (!draft.benchId) {
    errors.push('请选择要巡护的长椅');
  }
  const bench = benches.find((b) => b.id === draft.benchId);
  if (draft.benchId && !bench) {
    errors.push('所选长椅不存在');
  }
  if (bench?.underMaintenance) {
    errors.push(`长椅「${bench.name}」正在维护中，暂不能巡护`);
  }
  if (bench && orders.some((o) => o.benchId === bench.id && isOrderOpen(o))) {
    errors.push(`长椅「${bench.name}」已有进行中的巡护任务`);
  }

  if (
    draft.members.length < MIN_PATROL_MEMBERS ||
    draft.members.length > MAX_PATROL_MEMBERS
  ) {
    errors.push(`巡护成员需为 ${MIN_PATROL_MEMBERS}-${MAX_PATROL_MEMBERS} 名`);
  }

  const ids = draft.members.map((m) => m.memberId);
  if (new Set(ids).size !== ids.length) {
    errors.push('成员不能重复选择');
  }

  for (const m of draft.members) {
    const rosterMember = roster.find((r) => r.id === m.memberId);
    if (!rosterMember) {
      errors.push('存在无效成员');
      continue;
    }
    const busy = orders.some(
      (o) =>
        isOrderOpen(o) &&
        o.members.some((pm) => pm.id === m.memberId && pm.status !== 'quit'),
    );
    if (busy) {
      errors.push(`成员「${rosterMember.name}」已在其他巡护任务中`);
    }
  }

  return errors;
}

/** 检测长椅相对建单快照是否发生评分/材质/位置变动，返回变动字段名 */
export function detectBenchDrift(order: PatrolOrder, bench: Bench): string[] {
  const changes: string[] = [];
  if (bench.rating !== order.snapshot.rating) changes.push('评分');
  if (bench.material !== order.snapshot.material) changes.push('材质');
  if (bench.location !== order.snapshot.location) changes.push('位置');
  return changes;
}

/** 长椅存在暂停中的巡护单时，排行冻结不得更新 */
export function isRankingFrozen(benchId: string, orders: PatrolOrder[]): boolean {
  return orders.some((o) => o.benchId === benchId && o.status === 'paused');
}
