'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupervisors, getRuns, createRun } from '@/lib/api';

function getStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case 'active': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">active</span>;
    case 'paused': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">paused</span>;
    case 'completed': return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">completed</span>;
    case 'terminated': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">terminated</span>;
    default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">{status}</span>;
  }
}

export default function RunsPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');

  // Form State
  const [supervisorId, setSupervisorId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [orderContext, setOrderContext] = useState('{\n  "items": [],\n  "total": 0\n}');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [sups, rs] = await Promise.all([
        getSupervisors(),
        getRuns()
      ]);
      setSupervisors(sups);
      setRuns(rs);
      if (sups.length > 0) setSupervisorId(sups[0].id);
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  const handleStartRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      let parsedContext = {};
      try {
        parsedContext = JSON.parse(orderContext);
      } catch {
        throw new Error('Order Context must be valid JSON');
      }

      await createRun({
        supervisor_id: supervisorId,
        order_id: orderId,
        order_context: parsedContext
      });
      
      setOrderId('');
      setOrderContext('{\n  "items": [],\n  "total": 0\n}');
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Failed to start run');
    } finally {
      setCreating(false);
    }
  };

  const filteredRuns = runs.filter(run => {
    if (filter === 'All') return true;
    return run.status.toLowerCase() === filter.toLowerCase();
  });

  const tabs = ['All', 'Active', 'Paused', 'Completed', 'Terminated'];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Runs</h1>
      
      {error && <div className="text-red-600 mb-4">{error}</div>}
      
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Start New Run</h2>
        <form onSubmit={handleStartRun} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor</label>
              <select required value={supervisorId} onChange={e => setSupervisorId(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-gray-900 bg-white">
                {supervisors.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
              <input type="text" required value={orderId} onChange={e => setOrderId(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order Context (JSON)</label>
            <textarea required rows={4} value={orderContext} onChange={e => setOrderContext(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-gray-900 font-mono text-sm" />
          </div>
          <div className="pt-2">
            <button type="submit" disabled={creating || supervisors.length === 0} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50">
              {creating ? 'Starting...' : 'Start Run'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 px-4" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`py-3 px-2 border-b-2 font-medium text-sm ${
                  filter === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
        
        {loading ? (
          <div className="p-4 text-gray-500">Loading...</div>
        ) : filteredRuns.length === 0 ? (
          <div className="p-4 text-gray-500">No runs found.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-sm text-gray-600">
                <th className="p-3 border-b border-gray-200 font-medium">Order ID</th>
                <th className="p-3 border-b border-gray-200 font-medium">Supervisor</th>
                <th className="p-3 border-b border-gray-200 font-medium">Status</th>
                <th className="p-3 border-b border-gray-200 font-medium">Created</th>
                <th className="p-3 border-b border-gray-200 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run) => (
                <tr key={run.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                  <td className="p-3 text-gray-900">{run.order_id}</td>
                  <td className="p-3 text-gray-600">{supervisors.find(s => s.id === run.supervisor_id)?.name || run.supervisor_id}</td>
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
