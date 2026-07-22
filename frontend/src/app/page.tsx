'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupervisors, getRuns } from '@/lib/api';

export default function DashboardPage() {
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getSupervisors(), getRuns()])
      .then(([s, r]) => { setSupervisors(s); setRuns(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeRuns = runs.filter((r: any) => r.status === 'active').length;
  const completedRuns = runs.filter((r: any) => r.status === 'completed').length;

  if (loading) return <p className="text-gray-500 py-8">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <div className="flex gap-3">
          <Link href="/supervisors" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
            New Supervisor
          </Link>
          <Link href="/runs" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            New Run
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Supervisors', value: supervisors.length },
          { label: 'Active Runs', value: activeRuns },
          { label: 'Completed Runs', value: completedRuns },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-3xl font-semibold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Recent Runs</h2>
        </div>
        {runs.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-500">No runs yet. Start one from the Runs page.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="px-5 py-3 font-medium">Order ID</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 10).map((run: any) => (
                <tr key={run.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{run.order_id}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-5 py-3 text-gray-500">{new Date(run.created_at).toLocaleString()}</td>
                  <td className="px-5 py-3">
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    paused: 'bg-yellow-50 text-yellow-700',
    completed: 'bg-blue-50 text-blue-700',
    terminated: 'bg-red-50 text-red-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}
