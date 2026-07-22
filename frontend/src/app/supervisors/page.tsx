'use client';

import { useEffect, useState } from 'react';
import { getSupervisors, createSupervisor } from '@/lib/api';

const AVAILABLE_TOOLS = [
  { id: 'send_customer_message', label: 'Send Customer Message' },
  { id: 'create_internal_note', label: 'Create Internal Note' },
  { id: 'escalate_issue', label: 'Escalate Issue' },
  { id: 'mark_order_for_review', label: 'Mark Order for Review' },
  { id: 'schedule_wakeup', label: 'Schedule Wakeup' },
  { id: 'close_workflow', label: 'Close Workflow' },
  { id: 'message_fulfillment_team', label: 'Message Fulfillment Team' },
  { id: 'message_payments_team', label: 'Message Payments Team' },
  { id: 'message_logistics_team', label: 'Message Logistics Team' },
];

export default function SupervisorsPage() {
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form State
  const [name, setName] = useState('');
  const [instruction, setInstruction] = useState('');
  const [tools, setTools] = useState<string[]>([]);
  const [interval, setInterval] = useState(60);
  const [aggressiveness, setAggressiveness] = useState('medium');
  const [model, setModel] = useState('gpt-4');
  
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadSupervisors();
  }, []);

  async function loadSupervisors() {
    try {
      setLoading(true);
      const data = await getSupervisors();
      setSupervisors(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load supervisors');
    } finally {
      setLoading(false);
    }
  }

  const handleToolToggle = (toolId: string) => {
    if (tools.includes(toolId)) {
      setTools(tools.filter(t => t !== toolId));
    } else {
      setTools([...tools, toolId]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await createSupervisor({
        name,
        base_instruction: instruction,
        tools,
        default_wakeup_interval: interval,
        wakeup_aggressiveness: aggressiveness,
        model
      });
      setName('');
      setInstruction('');
      setTools([]);
      setInterval(60);
      setAggressiveness('medium');
      setModel('gpt-4');
      await loadSupervisors();
    } catch (e: any) {
      setError(e.message || 'Failed to create supervisor');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Supervisors</h1>
      
      {error && <div className="text-red-600 mb-4">{error}</div>}
      
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Create Supervisor</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Instruction</label>
            <textarea required rows={4} value={instruction} onChange={e => setInstruction(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-gray-900" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Available Tools</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVAILABLE_TOOLS.map(tool => (
                <label key={tool.id} className="flex items-center space-x-2">
                  <input type="checkbox" checked={tools.includes(tool.id)} onChange={() => handleToolToggle(tool.id)} className="rounded border-gray-300" />
                  <span className="text-sm text-gray-700">{tool.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Wake-up Interval (min)</label>
              <input type="number" required min={1} value={interval} onChange={e => setInterval(parseInt(e.target.value))} className="w-full border border-gray-300 rounded-md p-2 text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wake-up Aggressiveness</label>
              <div className="flex space-x-4 mt-2">
                {['low', 'medium', 'high'].map(level => (
                  <label key={level} className="flex items-center space-x-1">
                    <input type="radio" name="aggressiveness" checked={aggressiveness === level} onChange={() => setAggressiveness(level)} />
                    <span className="text-sm text-gray-700 capitalize">{level}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input type="text" required value={model} onChange={e => setModel(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-gray-900" />
            </div>
          </div>
          
          <div className="pt-2">
            <button type="submit" disabled={creating} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50">
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4 border-b border-gray-200 font-semibold text-gray-800">Existing Supervisors</div>
        {loading ? (
          <div className="p-4 text-gray-500">Loading...</div>
        ) : supervisors.length === 0 ? (
          <div className="p-4 text-gray-500">No supervisors found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-sm text-gray-600">
                  <th className="p-3 border-b border-gray-200 font-medium">Name</th>
                  <th className="p-3 border-b border-gray-200 font-medium">Instruction</th>
                  <th className="p-3 border-b border-gray-200 font-medium">Tools</th>
                  <th className="p-3 border-b border-gray-200 font-medium">Wake-up</th>
                  <th className="p-3 border-b border-gray-200 font-medium">Aggressiveness</th>
                  <th className="p-3 border-b border-gray-200 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {supervisors.map((sup) => (
                  <tr key={sup.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                    <td className="p-3 text-gray-900 font-medium">{sup.name}</td>
                    <td className="p-3 text-gray-600 text-sm max-w-xs truncate">{sup.base_instruction}</td>
                    <td className="p-3 text-gray-600 text-sm">{sup.tools?.length || 0} tools</td>
                    <td className="p-3 text-gray-600 text-sm">{sup.default_wakeup_interval}m</td>
                    <td className="p-3 text-gray-600 text-sm capitalize">{sup.wakeup_aggressiveness}</td>
                    <td className="p-3 text-gray-600 text-sm">{new Date(sup.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
