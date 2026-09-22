import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Users, ClipboardList, AlertCircle, Wrench } from 'lucide-react';
import { useBenchStore } from '@/store/useBenchStore';
import { useMemberStore, deriveMemberStatus } from '@/business/memberStatus';
import { usePatrolStore } from '@/business/pageState';
import { getActiveOrderForBench } from '@/business/patrolRules';
import { TIME_PERIOD_LABELS, MEMBER_STATUS_LABELS } from '@/types';
import type { TimePeriodType } from '@/types';

const ALL_PERIODS = Object.keys(TIME_PERIOD_LABELS) as TimePeriodType[];

export default function NewPatrolPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { benches, initialize, initialized } = useBenchStore();
  const { members, initialize: initMembers } = useMemberStore();
  const { orders, initialize: initPatrols, createOrder, notice, setNotice } = usePatrolStore();

  const [benchId, setBenchId] = useState(searchParams.get('benchId') || '');
  const [selected, setSelected] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Record<string, TimePeriodType[]>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) initialize();
    initMembers();
    initPatrols();
  }, [initialized, initialize, initMembers, initPatrols]);

  useEffect(() => {
    if (notice) {
      setError(notice);
      setNotice(null);
    }
  }, [notice, setNotice]);

  const toggleMember = (memberId: string) => {
    setError(null);
    setSelected((prev) => {
      if (prev.includes(memberId)) {
        const next = prev.filter((id) => id !== memberId);
        setAssignments((old) => {
          const copy = { ...old };
          delete copy[memberId];
          return copy;
        });
        return next;
      }
      if (prev.length >= 3) {
        setError('结伴巡护最多 3 名成员');
        return prev;
      }
      return [...prev, memberId];
    });
  };

  const togglePeriod = (memberId: string, period: TimePeriodType) => {
    setError(null);
    setAssignments((old) => {
      const current = old[memberId] || [];
      const next = current.includes(period)
        ? current.filter((item) => item !== period)
        : [...current, period];
      return { ...old, [memberId]: next };
    });
  };

  const selectedBench = useMemo(
    () => benches.find((bench) => bench.id === benchId),
    [benches, benchId],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!benchId) {
      setError('请先选择要巡护的长椅');
      return;
    }
    if (selected.length < 2) {
      setError('结伴巡护至少需要 2 名成员');
      return;
    }
    for (const memberId of selected) {
      if (!assignments[memberId] || assignments[memberId].length === 0) {
        const member = members.find((item) => item.id === memberId);
        setError(`请为成员「${member?.name ?? memberId}」填写时段分工`);
        return;
      }
    }

    const result = createOrder(
      {
        benchId,
        members: selected.map((memberId) => ({
          memberId,
          timePeriods: assignments[memberId],
        })),
      },
      benches,
      members,
    );

    if (result.ok) {
      navigate('/patrols');
    } else {
      // 整单拒绝：仅提示，原有数据不变
      setError(result.reason);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-ink-light hover:text-deep-brown mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">返回</span>
      </button>

      <div className="max-w-3xl mx-auto">
        <h1 className="font-serif text-2xl font-bold text-deep-brown mb-1">
          发起结伴巡护
        </h1>
        <p className="text-ink-light text-sm mb-6">
          选择一张长椅，约上 2 至 3 名成员，填好时段分工
        </p>

        {error && (
          <div className="mb-4 flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 fade-in">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>建单被拒绝：{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="paper-texture rounded-xl shadow-paper p-6 fade-in opacity-0 stagger-1">
            <h2 className="font-serif text-lg font-semibold text-deep-brown mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-moss-green" />
              选择长椅
            </h2>

            <select
              value={benchId}
              onChange={(e) => {
                setBenchId(e.target.value);
                setError(null);
              }}
              className="w-full px-4 py-2.5 bg-white/50 border border-deep-brown/10 rounded-lg text-deep-brown focus:bg-white cursor-pointer"
            >
              <option value="">请选择长椅...</option>
              {benches.map((bench) => {
                const busy = !!getActiveOrderForBench(orders, bench.id);
                const maintenance = !!bench.underMaintenance;
                return (
                  <option key={bench.id} value={bench.id} disabled={busy || maintenance}>
                    {bench.name}（{bench.location}）
                    {maintenance ? ' - 维护中' : busy ? ' - 已有巡护任务' : ''}
                  </option>
                );
              })}
            </select>

            {selectedBench?.underMaintenance && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-ochre">
                <Wrench className="w-3.5 h-3.5" />
                该长椅正在维护中，暂不能发起巡护
              </p>
            )}
          </div>

          <div className="paper-texture rounded-xl shadow-paper p-6 fade-in opacity-0 stagger-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-semibold text-deep-brown flex items-center gap-2">
                <Users className="w-5 h-5 text-moss-green" />
                选择成员
              </h2>
              <span className="text-sm text-ink-light">
                已选 <span className="font-medium text-deep-brown">{selected.length}</span> / 2-3 人
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {members.map((member) => {
                const status = deriveMemberStatus(member.id, orders);
                const busy = status === 'patrolling';
                const isSelected = selected.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    disabled={busy && !isSelected}
                    onClick={() => toggleMember(member.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-moss-green bg-moss-green/10 shadow-sm'
                        : busy
                          ? 'border-deep-brown/5 bg-warm-beige/50 opacity-50 cursor-not-allowed'
                          : 'border-deep-brown/10 bg-white/50 hover:border-moss-green/50 hover:bg-moss-green/5'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0"
                      style={{ backgroundColor: member.avatarColor }}
                    >
                      {member.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-deep-brown text-sm">{member.name}</div>
                      <div className="text-xs text-ink-light">{member.role}</div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        busy
                          ? 'bg-ochre/10 text-ochre'
                          : 'bg-moss-green/10 text-moss-green'
                      }`}
                    >
                      {MEMBER_STATUS_LABELS[status]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {selected.length > 0 && (
            <div className="paper-texture rounded-xl shadow-paper p-6 fade-in">
              <h2 className="font-serif text-lg font-semibold text-deep-brown mb-1">
                时段分工
              </h2>
              <p className="text-xs text-ink-light mb-4">
                为每位成员勾选负责的时段，至少一个
              </p>

              <div className="space-y-4">
                {selected.map((memberId) => {
                  const member = members.find((item) => item.id === memberId);
                  if (!member) return null;
                  const periods = assignments[memberId] || [];
                  return (
                    <div key={memberId} className="p-4 bg-warm-cream/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: member.avatarColor }}
                        >
                          {member.name.charAt(0)}
                        </div>
                        <span className="font-medium text-deep-brown text-sm">{member.name}</span>
                        {periods.length === 0 && (
                          <span className="text-xs text-ochre">尚未分工</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ALL_PERIODS.map((period) => {
                          const active = periods.includes(period);
                          return (
                            <button
                              key={period}
                              type="button"
                              onClick={() => togglePeriod(memberId, period)}
                              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                active
                                  ? 'bg-moss-green text-white shadow-sm'
                                  : 'bg-white/60 text-ink-light hover:bg-moss-green/10 hover:text-moss-green'
                              }`}
                            >
                              {TIME_PERIOD_LABELS[period]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-4 pb-6">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-6 py-3 bg-warm-beige text-deep-brown rounded-xl font-medium hover:bg-warm-beige/80 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-moss-green text-white rounded-xl font-medium hover:bg-moss-light transition-colors shadow-md hover:shadow-lg"
            >
              发起巡护
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
