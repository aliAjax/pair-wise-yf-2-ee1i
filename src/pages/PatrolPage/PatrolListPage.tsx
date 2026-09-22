import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, MapPin, Footprints, PauseCircle, CheckCircle2, Wrench } from 'lucide-react';
import { useBenchStore } from '@/store/useBenchStore';
import { useMemberStore } from '@/business/memberStatus';
import { usePatrolStore } from '@/business/pageState';
import { PATROL_STATUS_LABELS } from '@/types';
import type { PatrolStatus } from '@/types';

const STATUS_STYLES: Record<PatrolStatus, string> = {
  ongoing: 'bg-moss-green/10 text-moss-green',
  paused: 'bg-ochre/10 text-ochre',
  completed: 'bg-deep-brown/10 text-ink-light',
};

export default function PatrolListPage() {
  const navigate = useNavigate();
  const { benches, initialize, initialized } = useBenchStore();
  const { members, initialize: initMembers } = useMemberStore();
  const { orders, initialize: initPatrols } = usePatrolStore();

  useEffect(() => {
    if (!initialized) initialize();
    initMembers();
    initPatrols();
  }, [initialized, initialize, initMembers, initPatrols]);

  const getBenchName = (benchId: string) =>
    benches.find((bench) => bench.id === benchId);

  const getMemberName = (memberId: string) =>
    members.find((member) => member.id === memberId)?.name ?? '未知成员';

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-deep-brown mb-1">
            结伴巡护
          </h2>
          <p className="text-ink-light text-sm">
            约上伙伴，分时段守护一张长椅
          </p>
        </div>
        <button
          onClick={() => navigate('/patrols/new')}
          className="flex items-center gap-1.5 px-4 py-2 bg-moss-green text-white rounded-lg font-medium text-sm hover:bg-moss-light transition-colors shadow-md hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          发起巡护
        </button>
      </div>

      {orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order, index) => {
            const bench = getBenchName(order.benchId);
            const remaining = order.members.filter((member) => !member.leftAt);
            const doneCount = remaining.filter((member) => member.completed).length;
            return (
              <div
                key={order.id}
                onClick={() => navigate(`/patrols/${order.id}`)}
                className={`paper-texture rounded-xl shadow-paper p-4 cursor-pointer card-hover fade-in opacity-0 stagger-${Math.min(index + 1, 6)}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    order.status === 'ongoing'
                      ? 'bg-moss-green/10'
                      : order.status === 'paused'
                        ? 'bg-ochre/10'
                        : 'bg-deep-brown/5'
                  }`}>
                    {order.status === 'ongoing' && <Footprints className="w-6 h-6 text-moss-green" />}
                    {order.status === 'paused' && <PauseCircle className="w-6 h-6 text-ochre" />}
                    {order.status === 'completed' && <CheckCircle2 className="w-6 h-6 text-ink-light" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-serif font-semibold text-deep-brown truncate">
                        {bench?.name ?? '已删除的长椅'}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[order.status]}`}>
                        {PATROL_STATUS_LABELS[order.status]}
                      </span>
                      {bench?.underMaintenance && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-ochre bg-ochre/10">
                          <Wrench className="w-3 h-3" />
                          维护中
                        </span>
                      )}
                    </div>

                    {bench && (
                      <div className="flex items-center gap-1 text-ink-light text-sm mb-1.5">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{bench.location}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-ink-light">
                      <Users className="w-3.5 h-3.5" />
                      <span className="truncate">
                        {order.members.map((member) => getMemberName(member.memberId)).join('、')}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold font-serif text-deep-brown">
                      {doneCount}/{remaining.length}
                    </div>
                    <div className="text-xs text-ink-light">分工完成</div>
                  </div>
                </div>

                {order.status === 'paused' && order.pauseReason && (
                  <div className="mt-3 px-3 py-2 bg-ochre/5 border border-ochre/20 rounded-lg text-xs text-ochre">
                    {order.pauseReason}，进度已保留，恢复前排行保持冻结
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="paper-texture rounded-xl shadow-paper p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-moss-green/10 flex items-center justify-center mx-auto mb-4">
            <Footprints className="w-8 h-8 text-moss-green/50" />
          </div>
          <h3 className="font-serif text-lg font-medium text-deep-brown mb-2">
            还没有巡护单
          </h3>
          <p className="text-ink-light text-sm mb-4">
            选择一张长椅，约上 2 至 3 名成员发起结伴巡护
          </p>
          <button
            onClick={() => navigate('/patrols/new')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-moss-green text-white rounded-lg text-sm font-medium hover:bg-moss-light transition-colors"
          >
            <Plus className="w-4 h-4" />
            发起巡护
          </button>
        </div>
      )}
    </div>
  );
}
