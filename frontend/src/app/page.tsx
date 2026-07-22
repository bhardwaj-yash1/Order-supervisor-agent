'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupervisors, getRuns } from '@/lib/api';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalSupervisors: 0, activeRuns: 0, completedRuns: 0 });
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [supervisors, runs] = await Promise.all([
          getSupervisors().catch(() => []),
          getRuns().catch(() => [])
        ]);

        const activeRuns = runs.filter((r: any) => r.status === 'active' || r.status === 'paused').length;
        const completedRuns = runs.filter((r: any) => r.status === 'completed' || r.status === 'terminated').length;

        setStats({
          totalSupervisors: supervisors.length,
          activeRuns,
          completedRuns
        });

        // Sort by created date desc and take top 5
        const sorted = [...runs].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRecentRuns(sorted.slice(0, 5));
      } catch (e) {
        console.error("Failed to load dashboard data", e);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">Dashboard</h1>
          <p className="text-gray-400 mt-1">Overview of your autonomous order operations</p>
        </div>
        <div className="flex gap-4">
          <Link href="/supervisors" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg border border-gray-700 transition-colors">
            Create Supervisor
          </Link>
          <Link href="/runs" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all">
            Start New Run
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Supervisors" value={stats.totalSupervisors} icon="🤖" loading={loading} gradient="from-blue-500/20 to-cyan-500/5" border="border-blue-500/20" />
        <StatCard title="Active Runs" value={stats.activeRuns} icon="⚡" loading={loading} gradient="from-indigo-500/20 to-purple-500/5" border="border-indigo-500/20" />
        <StatCard title="Completed Runs" value={stats.completedRuns} icon="✅" loading={loading} gradient="from-emerald-500/20 to-teal-500/5" border="border-emerald-500/20" />
      </div>

      <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-gray-700/50">
          <h2 className="text-xl font-semibold text-gray-100">Recent Runs</h2>
        </div>
        <div className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading recent runs...</div>
          ) : recentRuns.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No runs found. Start one to see it here!</div>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {recentRuns.map((run) => (
                <Link key={run.id} href={`/runs/${run.id}`} className="block hover:bg-gray-700/30 transition-colors p-4 px-6 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-200">Order #{run.order_id}</div>
                    <div className="text-sm text-gray-400 mt-1">Supervisor: {run.supervisor_id}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(run.status)}`}>
                      {run.status.toUpperCase()}
                    </span>
                    <span className="text-gray-500">➔</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, loading, gradient, border }: { title: string, value: number, icon: string, loading: boolean, gradient: string, border: string }) {
  return (
    <div className={`bg-gray-800/50 backdrop-blur rounded-xl p-6 border ${border} relative overflow-hidden group`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50 group-hover:opacity-100 transition-opacity duration-500`}></div>
      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p className="text-gray-400 font-medium mb-1">{title}</p>
          {loading ? (
            <div className="h-10 w-16 bg-gray-700/50 rounded animate-pulse"></div>
          ) : (
            <h3 className="text-4xl font-bold text-gray-100">{value}</h3>
          )}
        </div>
        <div className="text-3xl bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 shadow-inner">
          {icon}
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active': return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'paused': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    case 'completed': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'terminated': return 'bg-red-500/10 text-red-400 border-red-500/20';
    default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  }
}
