'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupervisors, getRuns } from '@/lib/api';

function getStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case 'active': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">active</span>;
    case 'paused': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">paused</span>;
    case 'completed': return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">completed</span>;
    case 'terminated': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">terminated</span>;
    default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">{status}</span>;
  }
}

export default function Dashboard() {
  const [stats, setStats] = useState({ totalSupervisors: 0, activeRuns: 0, completedRuns: 0 });
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [supervisors, runs] = await Promise.all([
          getSupervisors(),
          getRuns()
        ]);
        
        const activeRuns = runs.filter((r: any) => r.status === 'active' || r.status === 'paused').length;
        const completedRuns = runs.filter((r: any) => r.status === 'completed' || r.status === 'terminated').length;

        setStats({
          totalSupervisors: supervisors.length,
          activeRuns,
          completedRuns
        });

        const sorted = [...runs].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRecentRuns(sorted.slice(0, 5));
      } catch (e: any) {
        setError(e.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="space-x-4">
          <Link href="/supervisors" className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50">New Supervisor</Link>
          <Link href="/runs" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">New Run</Link>
        </div>
      </div>
      
      {error && <div className="text-red-600 mb-4">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 p-4 rounded-lg">
          <div className="text-sm text-gray-500">Supervisors</div>
          <div className="text-2xl font-bold">{loading ? 'Loading...' : stats.totalSupervisors}</div>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-lg">
          <div className="text-sm text-gray-500">Active Runs</div>
          <div className="text-2xl font-bold">{loading ? 'Loading...' : stats.activeRuns}</div>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-lg">
          <div className="text-sm text-gray-500">Completed Runs</div>
          <div className="text-2xl font-bold">{loading ? 'Loading...' : stats.completedRuns}</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4 border-b border-gray-200 font-semibold text-gray-800">Recent Runs</div>
        {loading ? (
          <div className="p-4 text-gray-500">Loading...</div>
        ) : recentRuns.length === 0 ? (
          <div className="p-4 text-gray-500">No runs found.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-sm text-gray-600">
                <th className="p-3 border-b border-gray-200 font-medium">Order ID</th>
                <th className="p-3 border-b border-gray-200 font-medium">Status</th>
                <th className="p-3 border-b border-gray-200 font-medium">Created</th>
                <th className="p-3 border-b border-gray-200 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((run) => (
                <tr key={run.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                  <td className="p-3 text-gray-900">{run.order_id}</td>
                  <td className="p-3">{getStatusBadge(run.status)}</td>
                  <td className="p-3 text-gray-600 text-sm">{new Date(run.created_at).toLocaleString()}</td>
                  <td className="p-3">
                    <Link href={`/runs/${run.id}`} className="text-blue-600 hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
