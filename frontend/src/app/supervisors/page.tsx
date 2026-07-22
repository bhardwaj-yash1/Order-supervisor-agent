'use client';

import { useEffect, useState } from 'react';
import { getSupervisors, createSupervisor } from '@/lib/api';

const ALL_TOOLS = [
  'send_customer_message',
  'create_internal_note',
  'escalate_issue',
  'mark_order_for_review',
  'schedule_wakeup',
  'close_workflow'
];

export default function SupervisorsPage() {
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [baseInstruction, setBaseInstruction] = useState('');
  const [tools, setTools] = useState<string[]>(ALL_TOOLS);
  const [defaultWakeupInterval, setDefaultWakeupInterval] = useState(60);
  const [wakeupAggressiveness, setWakeupAggressiveness] = useState('medium');
  const [model, setModel] = useState('llama-3.3-70b-versatile');

  async function loadSupervisors() {
    try {
      const data = await getSupervisors();
      setSupervisors(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSupervisors();
  }, []);

  const handleToolToggle = (tool: string) => {
    setTools(prev => prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createSupervisor({
        name,
        base_instruction: baseInstruction,
        available_tools: tools,
        default_wakeup_interval_minutes: defaultWakeupInterval,
        wakeup_aggressiveness: wakeupAggressiveness,
        model
      });
      // Reset form
      setName('');
      setBaseInstruction('');
      setTools(ALL_TOOLS);
      setDefaultWakeupInterval(60);
      setWakeupAggressiveness('medium');
      setModel('llama-3.3-70b-versatile');
      // Reload list
      await loadSupervisors();
    } catch (err) {
      console.error("Failed to create supervisor", err);
      alert("Failed to create supervisor");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 flex flex-col md:flex-row gap-8">
      {/* Left side: List */}
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Supervisors</h1>
          <p className="text-gray-400 mt-1">Manage agent templates and their instructions</p>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-800/50 rounded-xl border border-gray-700/50"></div>
            ))}
          </div>
        ) : supervisors.length === 0 ? (
          <div className="p-8 text-center text-gray-500 bg-gray-800/20 border border-gray-700/50 rounded-xl">
            No supervisors found. Create one to get started.
          </div>
        ) : (
          <div className="grid gap-4">
            {supervisors.map(sup => (
              <div key={sup.id} className="bg-gray-800/50 backdrop-blur p-5 rounded-xl border border-gray-700/50 shadow-lg hover:border-indigo-500/30 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-semibold text-gray-200">{sup.name}</h3>
                  <span className="text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded border border-gray-700">
                    {new Date(sup.created_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-400 text-sm line-clamp-2 mb-4 bg-gray-900/50 p-2 rounded">
                  {sup.base_instruction}
                </p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20">
                    {sup.available_tools?.length || 0} tools
                  </span>
                  <span className="px-2 py-1 bg-gray-700/50 text-gray-300 rounded-full border border-gray-600">
                    {sup.model}
                  </span>
                  <span className="px-2 py-1 bg-gray-700/50 text-gray-300 rounded-full border border-gray-600">
                    {sup.wakeup_aggressiveness}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right side: Form */}
      <div className="w-full md:w-[450px] shrink-0">
        <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700/50 p-6 sticky top-8">
          <h2 className="text-xl font-semibold text-gray-100 mb-6 flex items-center gap-2">
            <span className="text-indigo-500">✨</span> Create New
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
              <input 
                required
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-gray-900/80 border border-gray-700 text-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="e.g. VIP Order Handler"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Base Instruction</label>
              <textarea 
                required
                value={baseInstruction}
                onChange={e => setBaseInstruction(e.target.value)}
                className="w-full bg-gray-900/80 border border-gray-700 text-gray-100 rounded-lg px-4 py-2 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="You are responsible for..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Available Tools</label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_TOOLS.map(tool => (
                  <label key={tool} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={tools.includes(tool)}
                      onChange={() => handleToolToggle(tool)}
                      className="rounded border-gray-600 bg-gray-900 text-indigo-500 focus:ring-indigo-500/50"
                    />
                    <span className="truncate" title={tool}>{tool.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Wake-up Int. (min)</label>
                <input 
                  type="number" 
                  min="1"
                  value={defaultWakeupInterval}
                  onChange={e => setDefaultWakeupInterval(parseInt(e.target.value))}
                  className="w-full bg-gray-900/80 border border-gray-700 text-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Aggressiveness</label>
                <select 
                  value={wakeupAggressiveness}
                  onChange={e => setWakeupAggressiveness(e.target.value)}
                  className="w-full bg-gray-900/80 border border-gray-700 text-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Model</label>
              <input 
                type="text" 
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full bg-gray-900/80 border border-gray-700 text-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <button 
              type="submit" 
              disabled={creating}
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.2)] transition-all flex justify-center items-center gap-2"
            >
              {creating ? 'Creating...' : 'Create Supervisor'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
