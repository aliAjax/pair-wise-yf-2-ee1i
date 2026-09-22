import { useEffect } from 'react';
import {
  Users,
  MapPin,
  Clock,
  CheckCircle2,
  LogIn,
  LogOut,
  PlayCircle,
  PauseCircle,
  AlertTriangle,
  ClipboardList,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { useBenchStore } from '@/store/useBenchStore';
import { usePatrolMemberStore } from '@/business/patrolMemberStore';
import { usePatrolPageStore } from '@/business/patrolPageStore';
import { MIN_PATROL_MEMBERS, MAX_PATROL_MEMBERS } from '@/business/patrolRules';
import { mockMembers } from '@/data/mockMembers';
import {
  TIME_PERIOD_LABELS,
  PATROL_ROLE_LABELS,
  PATROL_MEMBER_STATUS_LABELS,
  PATROL_ORDER_STATUS_LABELS,
} from '@/types';
import type { PatrolOrder, PatrolRoleType, TimePeriodType } from '@/types';

const STATUS_BADGE: Record<PatrolOrder['status'], string> = {
  active: 'bg-moss-green/10 text-moss-green',
  paused: 'bg-ochre/10 text-ochre',
  finished: 'bg-deep-brown/10 text-deep-brown',
  cancelled: 'bg-red-500/10 text-red-500',
};

export default function PatrolPage() {
  const { benches, initialize: initBenches, initialized: benchesReady } = useBenchStore();
  const {
    orders,
    initialized: ordersReady,
    initialize: initOrders,
    createOrder,
    memberArrive,
    memberComplete,
    memberQuit,
    resumeOrder,
  } = usePatrolMemberStore();
  const {
    selectedBenchId,
    selectedMembers,
    errors,
    notice,
    quitting,
    quitReason,
    selectBench,
    toggleMember,
    setMemberRole,
    setMemberSlot,
    setErrors,
    setNotice,
    resetForm,
    openQuit,
    closeQuit,
    setQuitReason,
  } = usePatrolPageStore();

  useEffect(() => {
    if (!benchesReady) initBenches();
    if (!ordersReady) initOrders();
  }, [benchesReady, ordersReady, initBenches, initOrders]);

  const selectedIds = Object.keys(selectedMembers);

  const handleSubmit = () => {
    setNotice(null);
    const draft = {
      benchId: selectedBenchId,
      members: selectedIds.map((id) => ({
        memberId: id,
        role: selectedMembers[id].role,
        timeSlot: selectedMembers[id].timeSlot,
      })),
    };
    const result = createOrder(draft, benches);
    if (result.length > 0) {
      setErrors(result); // 整单拒绝，已有数据不变
    } else {
      resetForm();
      setNotice('巡护单创建成功，成员可以开始签到');
    }
  };

  const handleQuitConfirm = () => {
    if (!quitting || !quitReason.trim()) return;
    memberQuit(quitting.orderId, quitting.memberId, quitReason);
    closeQuit();
  };

  const sortedOrders = [...orders].sort((a, b) => {
    const weight = (o: PatrolOrder) =>
      o.status === 'active' ? 0 : o.status === 'paused' ? 1 : 2;
    return weight(a) - weight(b) || b.createdAt.localeCompare(a.createdAt);
  });

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-semibold text-deep-brown mb-1">
          结伴巡护
        </h2>
        <p className="text-ink-light text-sm">
          选择一张长椅，约上 {MIN_PATROL_MEMBERS}-{MAX_PATROL_MEMBERS} 名成员一起巡护
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 建单表单 */}
        <div className="lg:col-span-1">
          <div className="paper-texture rounded-xl shadow-paper p-6 fade-in opacity-0 stagger-1 lg:sticky lg:top-20">
            <h3 className="font-serif text-lg font-semibold text-deep-brown mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-moss-green" />
              新建巡护单
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-deep-brown mb-1.5">
                  选择长椅
                </label>
                <select
                  value={selectedBenchId ?? ''}
                  onChange={(e) => selectBench(e.target.value || null)}
                  className="w-full px-3 py-2 bg-warm-cream border border-deep-brown/15 rounded-lg text-sm text-deep-brown focus:outline-none focus:ring-2 focus:ring-moss-green/40"
                >
                  <option value="">请选择长椅</option>
                  {benches.map((bench) => (
                    <option key={bench.id} value={bench.id} disabled={bench.underMaintenance}>
                      {bench.name}{bench.underMaintenance ? '（维护中）' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-deep-brown mb-1.5">
                  选择成员（{selectedIds.length}/{MAX_PATROL_MEMBERS}）
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {mockMembers.map((member) => {
                    const checked = !!selectedMembers[member.id];
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleMember(member.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                          checked
                            ? 'bg-moss-green text-white border-moss-green shadow-md'
                            : 'bg-warm-cream text-ink-light border-deep-brown/10 hover:border-moss-green/40'
                        }`}
                      >
                        {member.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedIds.map((id) => {
                const member = mockMembers.find((m) => m.id === id)!;
                const draft = selectedMembers[id];
                return (
                  <div key={id} className="p-3 bg-warm-cream/70 rounded-lg space-y-2">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-deep-brown">
                      <UserCheck className="w-4 h-4 text-moss-green" />
                      {member.name}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={draft.timeSlot}
                        onChange={(e) => setMemberSlot(id, e.target.value as TimePeriodType)}
                        className="px-2 py-1.5 bg-white border border-deep-brown/15 rounded-lg text-xs text-deep-brown focus:outline-none focus:ring-2 focus:ring-moss-green/40"
                      >
                        {Object.entries(TIME_PERIOD_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <select
                        value={draft.role}
                        onChange={(e) => setMemberRole(id, e.target.value as PatrolRoleType)}
                        className="px-2 py-1.5 bg-white border border-deep-brown/15 rounded-lg text-xs text-deep-brown focus:outline-none focus:ring-2 focus:ring-moss-green/40"
                      >
                        {Object.entries(PATROL_ROLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}

              {errors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-1.5 text-red-600 text-sm font-medium mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    建单被拒绝
                  </div>
                  <ul className="list-disc list-inside text-xs text-red-500 space-y-0.5">
                    {errors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {notice && (
                <div className="p-3 bg-moss-green/10 border border-moss-green/30 rounded-lg flex items-center gap-1.5 text-moss-green text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  {notice}
                </div>
              )}

              <button
                onClick={handleSubmit}
                className="w-full px-4 py-2.5 bg-moss-green text-white rounded-lg font-medium text-sm hover:bg-moss-light transition-colors shadow-md hover:shadow-lg"
              >
                创建巡护单
              </button>
            </div>
          </div>
        </div>

        {/* 巡护单列表 */}
        <div className="lg:col-span-2 space-y-4">
          {sortedOrders.map((order, index) => {
            const bench = benches.find((b) => b.id === order.benchId);
            const paused = order.status === 'paused';
            const open = order.status === 'active' || paused;
            return (
              <div
                key={order.id}
                className={`paper-texture rounded-xl shadow-paper p-5 fade-in opacity-0 stagger-${Math.min(index + 1, 6)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-serif font-semibold text-deep-brown">
                        {order.benchName}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[order.status]}`}>
                        {PATROL_ORDER_STATUS_LABELS[order.status]}
                      </span>
                      {bench?.underMaintenance && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          维护中
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-ink-light">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        创建于 {new Date(order.createdAt).toLocaleString('zh-CN')}
                      </span>
                      {order.finishedAt && (
                        <span>结束于 {new Date(order.finishedAt).toLocaleString('zh-CN')}</span>
                      )}
                    </div>
                  </div>

                  {paused && bench && (
                    <button
                      onClick={() => resumeOrder(order.id, bench)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-ochre hover:bg-ochre-light rounded-lg transition-colors shadow-md"
                    >
                      <PlayCircle className="w-4 h-4" />
                      恢复巡护
                    </button>
                  )}
                </div>

                {paused && order.pauseReason && (
                  <div className="mb-3 p-3 bg-ochre/10 border border-ochre/30 rounded-lg flex items-center gap-2 text-ochre text-sm">
                    <PauseCircle className="w-4 h-4 flex-shrink-0" />
                    {order.pauseReason}，进度已保留，恢复前不可完成或结束
                  </div>
                )}

                <div className="space-y-2">
                  {order.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-wrap items-center gap-2 p-3 bg-warm-cream/60 rounded-lg"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-deep-brown text-sm">
                          {member.name}
                        </span>
                        <span className="text-xs text-ink-light px-2 py-0.5 bg-white/70 rounded">
                          {TIME_PERIOD_LABELS[member.timeSlot]}
                        </span>
                        <span className="text-xs text-ink-light px-2 py-0.5 bg-white/70 rounded">
                          {PATROL_ROLE_LABELS[member.role]}
                        </span>
                      </div>

                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          member.status === 'completed'
                            ? 'bg-moss-green/10 text-moss-green'
                            : member.status === 'quit'
                              ? 'bg-red-500/10 text-red-500'
                              : member.status === 'arrived'
                                ? 'bg-ochre/10 text-ochre'
                                : 'bg-deep-brown/5 text-ink-light'
                        }`}
                      >
                        {PATROL_MEMBER_STATUS_LABELS[member.status]}
                      </span>

                      <div className="flex-1" />

                      {open && member.status === 'pending' && (
                        <button
                          disabled={paused}
                          onClick={() => memberArrive(order.id, member.id)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-moss-green bg-moss-green/10 hover:bg-moss-green/20 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          到达
                        </button>
                      )}
                      {open && member.status === 'arrived' && (
                        <button
                          disabled={paused}
                          onClick={() => memberComplete(order.id, member.id)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-moss-green hover:bg-moss-light rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          完成
                        </button>
                      )}
                      {open && (member.status === 'pending' || member.status === 'arrived') && (
                        <button
                          disabled={paused}
                          onClick={() => openQuit(order.id, member.id, member.name)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          退出
                        </button>
                      )}
                      {member.status === 'quit' && member.quitReason && (
                        <span className="text-xs text-ink-light/70 truncate">
                          原因：{member.quitReason}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {sortedOrders.length === 0 && (
            <div className="paper-texture rounded-xl shadow-paper p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-moss-green/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-moss-green/50" />
              </div>
              <h3 className="font-serif text-lg font-medium text-deep-brown mb-2">
                还没有巡护单
              </h3>
              <p className="text-ink-light text-sm flex items-center justify-center gap-1">
                <MapPin className="w-4 h-4" />
                在左侧选择长椅和成员，发起第一次结伴巡护
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 退出原因弹窗 */}
      {quitting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="paper-texture rounded-xl shadow-paper-hover p-6 max-w-sm w-full fade-in">
            <h3 className="font-serif text-lg font-semibold text-deep-brown mb-2">
              成员退出
            </h3>
            <p className="text-ink-light text-sm mb-4">
              「{quitting.memberName}」退出后，巡护将由其余成员继续。请填写退出原因：
            </p>
            <textarea
              value={quitReason}
              onChange={(e) => setQuitReason(e.target.value)}
              placeholder="必填，例如：临时有事离开"
              rows={3}
              className="w-full px-3 py-2 bg-warm-cream border border-deep-brown/15 rounded-lg text-sm text-deep-brown focus:outline-none focus:ring-2 focus:ring-moss-green/40 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={closeQuit}
                className="flex-1 px-4 py-2 text-sm text-deep-brown bg-warm-beige hover:bg-warm-beige/80 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleQuitConfirm}
                disabled={!quitReason.trim()}
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
