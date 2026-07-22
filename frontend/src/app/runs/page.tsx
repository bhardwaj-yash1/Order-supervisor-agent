'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRuns, getSupervisors, createRun } from '@/lib/api';

const TABS = ['All', 'Active', 'Paused', 'Completed', 'Terminated'];

export default function RunsPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form
  const [supervisorId, setSupervisorId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [orderContext, setOrderContext] = useState('{\n  "customer_tier": "VIP",\n  "issue_type": "delayed_shipping"\n}');

  async function loadData() {
    try {
      const [runsData, supsData] = await Promise.all([getRuns(), getSupervisors()]);
      // Sort runs by created_at desc
      runsData.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRuns(runsData);
      setSupervisors(supsData);
      if (supsData.length > 0 && !supervisorId) {
        setSupervisorId(supsData[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredRuns = activeTab === 'All' 
    ? runs 
    : runs.filter(r => r.status.toLowerCase() === activeTab.toLowerCase());

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      let parsedContext = {};
      try {
        parsedContext = JSON.parse(orderContext);
      } catch (e) {
        alert("Invalid JSON in Order Context");
        setCreating(false);
        return;
      }

      await createRun({
        supervisor_id: supervisorId,
        order_id: orderId,
        order_context: parsedContext
      });
      setShowModal(false);
      setOrderId('');
      setOrderContext('{\n  "customer_tier": "VIP",\n  "issue_type": "delayed_shipping"\n}');
      await loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to start run");
    } finally {
      setCreating(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'paused': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'terminated': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="animate-in fade-in duration-500 relative min-h-full">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Runs</h1>
          <p className="text-gray-400 mt-1">Active and historical agent workflows</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all flex items-center gap-2"
        >
          <span>🚀</span> Start New Run
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeTab === tab 
                ? 'bg-gray-800 text-white border border-gray-600 shadow-sm' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 border border-transparent'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-800/50 rounded-xl border border-gray-700/50"></div>
            ))}
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="p-12 text-center bg-gray-800/20 border border-gray-700/50 rounded-xl">
            <div className="text-4xl mb-4">📭</div>
            <h3 className="text-lg font-medium text-gray-300">No runs found</h3>
            <p className="text-gray-500 text-sm mt-1">Try changing filters or start a new run.</p>
          </div>
        ) : (
          filteredRuns.map(run => {
            const sup = supervisors.find(s => s.id === run.supervisor_id);
            return (
              <Link 
                key={run.id} 
                href={`/runs/${run.id}`}
                className="bg-gray-800/50 backdrop-blur p-4 rounded-xl border border-gray-700/50 hover:border-indigo-500/50 hover:bg-gray-800 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-lg font-semibold text-gray-100">Order #{run.order_id}</span>
                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${getStatusStyle(run.status)}`}>
                      {run.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <span>🤖</span> {sup ? sup.name : run.supervisor_id}
                    </span>
                    <span className="text-gray-600">•</span>
                    <span>Created: {new Date(run.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="text-gray-500 group-hover:text-indigo-400 transition-colors transform group-hover:translate-x-1 duration-200">
                  ➔
                </div>
              </Link>
            )
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl scale-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/30">
              <h2 className="text-lg font-semibold text-gray-100">Start New Run</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Supervisor</label>
                <select 
                  required
                  value={supervisorId}
                  onChange={e => setSupervisorId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {supervisors.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                  {supervisors.length === 0 && <option value="" disabled>No supervisors available</option>}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Order ID</label>
                <input 
                  required
                  type="text" 
                  value={orderId}
                  onChange={e => setOrderId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. ORD-99321"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Order Context (JSON)</label>
                <textarea 
                  required
                  value={orderContext}
                  onChange={e => setOrderContext(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-4 py-2.5 h-32 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={creating || supervisors.length === 0}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg shadow-lg transition-all"
                >
                  {creating ? 'Starting...' : 'Start Run'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
