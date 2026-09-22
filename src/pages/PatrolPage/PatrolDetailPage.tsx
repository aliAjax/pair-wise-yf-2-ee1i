import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Users,
  Footprints,
  PauseCircle,
  CheckCircle2,
  PlayCircle,
  LogOut,
  MapPinned,
  CircleCheck,
  Clock,
  AlertCircle,
  Wrench,
} from 'lucide-react';
import { useBenchStore } from '@/store/useBenchStore';
import { useMemberStore, deriveMemberOrderStatus } from '@/business/memberStatus';
import { usePatrolStore } from '@/business/pageState';
import {
  canMemberArrive,
  canMemberComplete,
  getRemainingMembers,
} from '@/business/patrolRules';
import {
  PATROL_STATUS_LABELS,
  MEMBER_STATUS_LABELS,
  TIME_PERIOD_LABELS,
} from '@/types';
import type { PatrolStatus, MemberStatus } from '@/types';

const ORDER_STATUS_STYLES: Record<PatrolStatus, string> = {
  ongoing: 'bg-moss-green/10 text-moss-green',
  paused: 'bg-ochre/10 text-ochre',
  completed: 'bg-deep-brown/10 text-ink-light',
};

const MEMBER_STATUS_STYLES: Record<MemberStatus, string> = {
  idle: 'bg-deep-brown/5 text-ink-light',
  patrolling: 'bg-moss-green/10 text-moss-green',
  left: 'bg-red-50 text-red-500',
  done: 'bg-deep-brown/10 text-ink-light',
};

export default function PatrolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { benches, initialize, initialized } = useBenchStore();
  const { members, initialize: initMembers } = useMemberStore();
  const {
    orders,
    initialize: initPatrols,
    arrive,
    complete,
    leave,
    resumeOrder,
    leavingTarget,
    leaveReasonDraft,
    openLeaveDialog,
    closeLeaveDialog,
    setLeaveReasonDraft,
  } = usePatrolStore();

  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) initialize();
    initMembers();
    initPatrols();
  }, [initialized, initialize, initMembers, initPatrols]);

  const order = orders.find((item) => item.id === id);

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-ink-light">巡护单不存在或已被清理</p>
          <button
            onClick={() => navigate('/patrols')}
            className="mt-4 px-4 py-2 bg-moss-green text-white rounded-lg text-sm"
          >
            返回巡护列表
          </button>
        </div>
      </div>
    );
  }

  const bench = benches.find((item) => item.id === order.benchId);
  const remaining = getRemainingMembers(order);
  const isPaused = order.status === 'paused';
  const isCompleted = order.status === 'completed';

  const getMember = (memberId: string) =>
    members.find((member) => member.id === memberId);

  const runAction = (action: () => { ok: boolean; reason?: string }) => {
    const result = action();
    setActionError(result.ok ? null : result.reason ?? '操作失败');
  };

  const handleLeaveConfirm = () => {
    if (!leavingTarget) return;
    runAction(() =>
      leave(leavingTarget.orderId, leavingTarget.memberId, leaveReasonDraft),
    );
  };

  const formatTime = (iso?: string) =>
    iso ? new Date(iso).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="container mx-auto px-4 py-6">
      <button
        onClick={() => navigate('/patrols')}
        className="flex items-center gap-2 text-ink-light hover:text-deep-brown mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">返回巡护列表</span>
      </button>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* 巡护单概要 */}
        <div className="paper-texture rounded-xl shadow-paper p-6 fade-in opacity-0 stagger-1">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-serif text-2xl font-bold text-deep-brown">
                  {bench?.name ?? '已删除的长椅'}
                </h1>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_STYLES[order.status]}`}>
                  {PATROL_STATUS_LABELS[order.status]}
                </span>
              </div>
              {bench && (
                <button
                  onClick={() => navigate(`/bench/${bench.id}`)}
                  className="flex items-center gap-1 text-ink-light hover:text-moss-green text-sm transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                  {bench.location}
                </button>
              )}
            </div>
            <div className="text-right text-xs text-ink-light">
              <div>发起于 {formatTime(order.createdAt)}</div>
              {order.completedAt && <div>结束于 {formatTime(order.completedAt)}</div>}
            </div>
          </div>

          {bench?.underMaintenance && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-ochre/5 border border-ochre/20 rounded-lg text-sm text-ochre">
              <Wrench className="w-4 h-4" />
              该长椅当前处于维护中
            </div>
          )}

          {/* 暂停提示与恢复 */}
          {isPaused && (
            <div className="mb-4 p-4 bg-ochre/5 border border-ochre/25 rounded-xl fade-in">
              <div className="flex items-start gap-2 mb-3">
                <PauseCircle className="w-5 h-5 text-ochre mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-deep-brown font-medium mb-0.5">
                    {order.pauseReason ?? '巡护已暂停'}
                  </p>
                  <p className="text-ink-light">
                    暂停于 {formatTime(order.pausedAt)}，成员进度已保留。恢复前不能结束巡护，舒适度排行保持冻结。
                  </p>
                </div>
              </div>
              {bench && (
                <button
                  onClick={() => {
                    resumeOrder(order.id, bench);
                    setActionError(null);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-moss-green text-white rounded-lg text-sm font-medium hover:bg-moss-light transition-colors"
                >
                  <PlayCircle className="w-4 h-4" />
                  恢复巡护
                </button>
              )}
            </div>
          )}

          {isCompleted && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-moss-green/5 border border-moss-green/20 rounded-lg text-sm text-moss-green">
              <CheckCircle2 className="w-4 h-4" />
              全员分工完成，本次结伴巡护已结束
            </div>
          )}

          {actionError && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {actionError}
            </div>
          )}

          {/* 进度条 */}
          <div className="flex items-center gap-3">
            <Footprints className="w-4 h-4 text-ink-light flex-shrink-0" />
            <div className="flex-1 h-2 bg-warm-beige rounded-full overflow-hidden">
              <div
                className="h-full bg-moss-green rounded-full transition-all duration-500"
                style={{
                  width: `${remaining.length ? (remaining.filter((m) => m.completed).length / remaining.length) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-sm text-ink-light flex-shrink-0">
              {remaining.filter((m) => m.completed).length}/{remaining.length} 完成
            </span>
          </div>
        </div>

        {/* 成员列表 */}
        <div className="paper-texture rounded-xl shadow-paper p-6 fade-in opacity-0 stagger-2">
          <h2 className="font-serif text-lg font-semibold text-deep-brown mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-moss-green" />
            巡护成员
          </h2>

          <div className="space-y-3">
            {order.members.map((orderMember) => {
              const member = getMember(orderMember.memberId);
              const status = deriveMemberOrderStatus(order, orderMember.memberId);
              const left = !!orderMember.leftAt;
              const canArrive = canMemberArrive(order, orderMember.memberId).ok;
              const canComplete = canMemberComplete(order, orderMember.memberId).ok;
              const canLeave =
                !isCompleted && !isPaused && !left && !orderMember.completed;

              return (
                <div
                  key={orderMember.memberId}
                  className={`p-4 rounded-xl border transition-colors ${
                    left
                      ? 'border-deep-brown/5 bg-warm-beige/40 opacity-75'
                      : 'border-deep-brown/10 bg-warm-cream/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0"
                      style={{ backgroundColor: member?.avatarColor ?? '#A89888' }}
                    >
                      {member?.name.charAt(0) ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-deep-brown">
                          {member?.name ?? '未知成员'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${MEMBER_STATUS_STYLES[status]}`}>
                          {MEMBER_STATUS_LABELS[status]}
                        </span>
                      </div>
                      <div className="text-xs text-ink-light mt-0.5">
                        分工时段：
                        {orderMember.timePeriods
                          .map((period) => TIME_PERIOD_LABELS[period])
                          .join('、') || '未填写'}
                      </div>
                    </div>
                  </div>

                  {/* 成员进度时间线 */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-light mb-3">
                    <span className={`inline-flex items-center gap-1 ${orderMember.arrived ? 'text-moss-green' : ''}`}>
                      <MapPinned className="w-3.5 h-3.5" />
                      到达{orderMember.arrivedAt ? ` ${formatTime(orderMember.arrivedAt)}` : '（未到达）'}
                    </span>
                    <span className={`inline-flex items-center gap-1 ${orderMember.completed ? 'text-moss-green' : ''}`}>
                      <CircleCheck className="w-3.5 h-3.5" />
                      完成{orderMember.completedAt ? ` ${formatTime(orderMember.completedAt)}` : '（未完成）'}
                    </span>
                    {left && (
                      <span className="inline-flex items-center gap-1 text-red-500">
                        <LogOut className="w-3.5 h-3.5" />
                        退出 {formatTime(orderMember.leftAt)}：{orderMember.leaveReason}
                      </span>
                    )}
                  </div>

                  {/* 成员操作 */}
                  {!isCompleted && !left && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => runAction(() => arrive(order.id, orderMember.memberId))}
                        disabled={!canArrive}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-moss-green text-white hover:bg-moss-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <MapPinned className="w-3.5 h-3.5" />
                        到达
                      </button>
                      <button
                        onClick={() => runAction(() => complete(order.id, orderMember.memberId))}
                        disabled={!canComplete}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-ochre text-white hover:bg-ochre-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <CircleCheck className="w-3.5 h-3.5" />
                        完成分工
                      </button>
                      <button
                        onClick={() => {
                          setActionError(null);
                          openLeaveDialog(order.id, orderMember.memberId);
                        }}
                        disabled={!canLeave}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg text-red-500 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        退出
                      </button>
                    </div>
                  )}
                  {isPaused && !left && !isCompleted && (
                    <p className="text-xs text-ochre mt-1">巡护暂停中，恢复后才能继续操作</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 事件记录 */}
        <div className="paper-texture rounded-xl shadow-paper p-6 fade-in opacity-0 stagger-3">
          <h2 className="font-serif text-lg font-semibold text-deep-brown mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-moss-green" />
            巡护记录
          </h2>
          <div className="space-y-2">
            {[...order.events].reverse().map((event) => {
              const member = event.memberId ? getMember(event.memberId) : undefined;
              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 px-3 py-2 bg-warm-cream/40 rounded-lg text-sm"
                >
                  <span className="text-xs text-ink-light whitespace-nowrap mt-0.5">
                    {formatTime(event.at)}
                  </span>
                  <span className="text-deep-brown">
                    {member && <span className="font-medium">{member.name} </span>}
                    {event.message}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 退出原因对话框 */}
      {leavingTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="paper-texture rounded-xl shadow-paper-hover p-6 max-w-sm w-full fade-in">
            <h3 className="font-serif text-lg font-semibold text-deep-brown mb-2">
              退出巡护
            </h3>
            <p className="text-ink-light text-sm mb-4">
              退出后由其余成员继续巡护，请填写退出原因：
            </p>
            <textarea
              value={leaveReasonDraft}
              onChange={(e) => setLeaveReasonDraft(e.target.value)}
              placeholder="例如：临时有事，先走一步"
              rows={3}
              autoFocus
              className="w-full px-3 py-2 text-sm bg-white/60 border border-deep-brown/10 rounded-lg text-deep-brown placeholder:text-ink-light/60 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={closeLeaveDialog}
                className="flex-1 px-4 py-2 text-sm text-deep-brown bg-warm-beige hover:bg-warm-beige/80 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleLeaveConfirm}
                disabled={!leaveReasonDraft.trim()}
                className="flex-1 px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                确认退出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
