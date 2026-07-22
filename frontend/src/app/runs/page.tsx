'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRuns, getSupervisors, createRun } from '@/lib/api';

const TABS = ['all', 'active', 'paused', 'completed', 'terminated'];

const ORDER_CONTEXT_TEMPLATE = JSON.stringify({
  customer_name: "John Smith",
  customer_email: "john@example.com",
  items: [
    { name: "Wireless Headphones", qty: 1, price: 89.99 }
  ],
  total: 89.99,
  shipping_address: "123 Main St, New York, NY"
}, null, 2);

export default function RunsPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [supervisorId, setSupervisorId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [orderContext, setOrderContext] = useState(ORDER_CONTEXT_TEMPLATE);

  async function load() {
    try {
      const [r, s] = await Promise.all([getRuns(), getSupervisors()]);
      setRuns(r);
      setSupervisors(s);
      if (s.length > 0 && !supervisorId) setSupervisorId(s[0].id);
    } catch { }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = tab === 'all' ? runs : runs.filter((r: any) => r.status === tab);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!supervisorId || !orderId.trim()) {
      setError('Supervisor and Order ID are required.');
      return;
    }
    try {
      const ctx = JSON.parse(orderContext);
      await createRun({ supervisor_id: supervisorId, order_id: orderId.trim(), order_context: ctx });
      setSuccess('Run started.');
      setOrderId('');
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to start run.');
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Runs</h1>

      {/* Start New Run */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Start New Run</h2>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {success && <p className="text-sm text-green-600 mb-3">{success}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor</label>
              <select
                value={supervisorId}
                onChange={e => setSupervisorId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {supervisors.length === 0 && <option value="">No supervisors — create one first</option>}
                {supervisors.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
              <input
                type="text"
                value={orderId}
                onChange={e => setOrderId(e.target.value)}
                placeholder="ORD-1234"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order Context (JSON)</label>
            <textarea
              value={orderContext}
              onChange={e => setOrderContext(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
            Start Run
          </button>
        </form>
      </div>

      {/* Runs Table */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-4">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-sm font-medium pb-1 ${
                tab === t
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="px-5 py-6 text-sm text-gray-500">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500">No runs found.</p>
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
              {filtered.map((run: any) => (
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
