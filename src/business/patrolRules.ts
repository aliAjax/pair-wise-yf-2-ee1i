import type {
  Bench,
  Member,
  PatrolBenchSnapshot,
  PatrolOrder,
  PatrolMember,
  TimePeriodType,
} from '@/types';

/* ===================== 类型 ===================== */

export interface CreatePatrolInput {
  benchId: string;
  /** 成员 id 与时段分工 */
  members: { memberId: string; timePeriods: TimePeriodType[] }[];
}

export type RuleResult = { ok: boolean; reason?: string };

/* ===================== 快照与档案变动 ===================== */

/** 触发暂停的关键字段：评分、材质、位置 */
const WATCHED_FIELDS = ['rating', 'material', 'location', 'lat', 'lng'] as const;

export function takeBenchSnapshot(bench: Bench): PatrolBenchSnapshot {
  return {
    name: bench.name,
    location: bench.location,
    lat: bench.lat,
    lng: bench.lng,
    material: bench.material,
    orientation: bench.orientation,
    hasBackrest: bench.hasBackrest,
    shadeLevel: bench.shadeLevel,
    noiseLevel: bench.noiseLevel,
    stayDuration: bench.stayDuration,
    rating: bench.rating,
    review: bench.review,
    experiences: JSON.parse(JSON.stringify(bench.experiences)),
  };
}

/** 评分、材质或位置是否相对快照发生变动 */
export function isBenchChangedFromSnapshot(bench: Bench, snapshot: PatrolBenchSnapshot): boolean {
  return WATCHED_FIELDS.some((field) => bench[field] !== snapshot[field]);
}

/* ===================== 巡护单状态查询 ===================== */

export function isOrderActive(order: PatrolOrder): boolean {
  return order.status === 'ongoing' || order.status === 'paused';
}

export function getActiveOrderForBench(orders: PatrolOrder[], benchId: string): PatrolOrder | undefined {
  return orders.find((order) => order.benchId === benchId && isOrderActive(order));
}

/** 留在巡护中的成员（未退出） */
export function getRemainingMembers(order: PatrolOrder): PatrolMember[] {
  return order.members.filter((member) => !member.leftAt);
}

/** 巡护是否可以结束：所有留下的成员都已完成 */
export function canFinishOrder(order: PatrolOrder): boolean {
  const remaining = getRemainingMembers(order);
  return remaining.length > 0 && remaining.every((member) => member.completed);
}

export function findOrderMember(order: PatrolOrder, memberId: string): PatrolMember | undefined {
  return order.members.find((member) => member.memberId === memberId);
}

/* ===================== 建单校验（整单拒绝，原数据不变） ===================== */

export function validateCreatePatrol(
  input: CreatePatrolInput,
  benches: Bench[],
  members: Member[],
  existingOrders: PatrolOrder[],
): RuleResult {
  const bench = benches.find((item) => item.id === input.benchId);
  if (!bench) {
    return { ok: false, reason: '所选长椅不存在，无法建单' };
  }
  if (bench.underMaintenance) {
    return { ok: false, reason: `「${bench.name}」正在维护中，暂不能发起巡护` };
  }
  if (getActiveOrderForBench(existingOrders, input.benchId)) {
    return { ok: false, reason: `「${bench.name}」已有进行中的巡护任务，同椅不能重复建单` };
  }

  const count = input.members.length;
  if (count < 2 || count > 3) {
    return { ok: false, reason: '结伴巡护需要 2 至 3 名成员' };
  }

  const memberIds = input.members.map((item) => item.memberId);
  if (new Set(memberIds).size !== count) {
    return { ok: false, reason: '同一名成员不能重复加入' };
  }

  for (const item of input.members) {
    const member = members.find((candidate) => candidate.id === item.memberId);
    if (!member) {
      return { ok: false, reason: '存在无效成员，请重新选择' };
    }
    if (item.timePeriods.length === 0) {
      return { ok: false, reason: `成员「${member.name}」还没有填写时段分工` };
    }
    const busyOrder = existingOrders.find(
      (order) =>
        isOrderActive(order) &&
        order.members.some(
          (participant) => participant.memberId === item.memberId && !participant.leftAt,
        ),
    );
    if (busyOrder) {
      const busyBench = benches.find((candidate) => candidate.id === busyOrder.benchId);
      return {
        ok: false,
        reason: `成员「${member.name}」已在${busyBench ? `「${busyBench.name}」` : '另一张长椅'}的巡护中`,
      };
    }
  }

  return { ok: true };
}

/* ===================== 成员动作校验 ===================== */

/** 仅进行中的巡护单可提交成员动作；暂停期间进度冻结 */
export function ensureOrderOngoing(order: PatrolOrder): RuleResult {
  if (order.status === 'completed') {
    return { ok: false, reason: '巡护已经结束' };
  }
  if (order.status === 'paused') {
    return { ok: false, reason: '巡护因档案变动已暂停，恢复后才能继续操作' };
  }
  return { ok: true };
}

export function canMemberArrive(order: PatrolOrder, memberId: string): RuleResult {
  const stateCheck = ensureOrderOngoing(order);
  if (!stateCheck.ok) return stateCheck;

  const member = findOrderMember(order, memberId);
  if (!member) return { ok: false, reason: '该成员不在本巡护单中' };
  if (member.leftAt) return { ok: false, reason: '该成员已退出巡护' };
  if (member.arrived) return { ok: false, reason: '该成员已到达' };
  if (member.completed) return { ok: false, reason: '该成员已完成分工' };
  return { ok: true };
}

export function canMemberLeave(order: PatrolOrder, memberId: string, reason: string): RuleResult {
  const stateCheck = ensureOrderOngoing(order);
  if (!stateCheck.ok) return stateCheck;

  const member = findOrderMember(order, memberId);
  if (!member) return { ok: false, reason: '该成员不在本巡护单中' };
  if (member.leftAt) return { ok: false, reason: '该成员已经退出' };
  if (member.completed) return { ok: false, reason: '已完成分工的成员不能退出' };
  if (!reason.trim()) return { ok: false, reason: '退出时必须填写原因' };
  if (getRemainingMembers(order).length <= 1) {
    return { ok: false, reason: '最后一名成员不能退出，否则巡护无法继续' };
  }
  return { ok: true };
}

export function canMemberComplete(order: PatrolOrder, memberId: string): RuleResult {
  const stateCheck = ensureOrderOngoing(order);
  if (!stateCheck.ok) return stateCheck;

  const member = findOrderMember(order, memberId);
  if (!member) return { ok: false, reason: '该成员不在本巡护单中' };
  if (member.leftAt) return { ok: false, reason: '该成员已退出巡护' };
  if (!member.arrived) return { ok: false, reason: '请先提交到达，再完成分工' };
  if (member.completed) return { ok: false, reason: '该成员已完成分工' };
  return { ok: true };
}

/* ===================== 排行榜冻结 ===================== */

/**
 * 构造用于排行榜的长椅列表：
 * 暂停巡护中的长椅按变动前快照计分，恢复前排行不更新；
 * 其余长椅按当前档案计分。
 */
export function buildRankingBenches(benches: Bench[], orders: PatrolOrder[]): Bench[] {
  const pausedSnapshots = new Map<string, PatrolBenchSnapshot>();
  orders.forEach((order) => {
    if (order.status === 'paused' && order.benchSnapshot) {
      pausedSnapshots.set(order.benchId, order.benchSnapshot);
    }
  });

  return benches.map((bench) => {
    const snapshot = pausedSnapshots.get(bench.id);
    return snapshot ? ({ ...bench, ...snapshot } as Bench) : bench;
  });
}
