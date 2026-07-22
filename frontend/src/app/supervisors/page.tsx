'use client';

import { useEffect, useState } from 'react';
import { getSupervisors, createSupervisor } from '@/lib/api';

const ALL_TOOLS = [
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
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [baseInstruction, setBaseInstruction] = useState('');
  const [tools, setTools] = useState<string[]>(ALL_TOOLS.map(t => t.id));
  const [wakeupMinutes, setWakeupMinutes] = useState(120);
  const [aggressiveness, setAggressiveness] = useState('medium');
  const [model, setModel] = useState('llama-3.3-70b-versatile');

  async function load() {
    try {
      const data = await getSupervisors();
      setSupervisors(data);
    } catch { }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function toggleTool(id: string) {
    setTools(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!name.trim() || !baseInstruction.trim()) {
      setError('Name and Base Instruction are required.');
      return;
    }
    try {
      await createSupervisor({
        name: name.trim(),
        base_instruction: baseInstruction.trim(),
        available_tools: tools,
        default_wakeup_minutes: wakeupMinutes,
        wakeup_aggressiveness: aggressiveness,
        model_name: model,
      });
      setSuccess('Supervisor created.');
      setName('');
      setBaseInstruction('');
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to create supervisor.');
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Supervisors</h1>

      {/* Create Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Supervisor</h2>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {success && <p className="text-sm text-green-600 mb-3">{success}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="E-commerce Order Supervisor"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Instruction</label>
            <textarea
              value={baseInstruction}
              onChange={e => setBaseInstruction(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="You are an AI order supervisor. Monitor the lifecycle of e-commerce orders..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Available Tools</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_TOOLS.map(tool => (
                <label key={tool.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tools.includes(tool.id)}
                    onChange={() => toggleTool(tool.id)}
                    className="rounded border-gray-300"
                  />
                  {tool.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wake-up Interval (min)</label>
              <input
                type="number"
                value={wakeupMinutes}
                onChange={e => setWakeupMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aggressiveness</label>
              <div className="flex items-center gap-4 mt-2">
                {['low', 'medium', 'high'].map(level => (
                  <label key={level} className="flex items-center gap-1 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="aggressiveness"
                      value={level}
                      checked={aggressiveness === level}
                      onChange={e => setAggressiveness(e.target.value)}
                    />
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
            Create
          </button>
        </form>
      </div>

      {/* Existing Supervisors */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Existing Supervisors</h2>
        </div>
        {loading ? (
          <p className="px-5 py-6 text-sm text-gray-500">Loading...</p>
        ) : supervisors.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500">No supervisors yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Instruction</th>
                  <th className="px-5 py-3 font-medium">Tools</th>
                  <th className="px-5 py-3 font-medium">Wake-up</th>
                  <th className="px-5 py-3 font-medium">Aggressiveness</th>
                </tr>
              </thead>
              <tbody>
                {supervisors.map((s: any) => (
                  <tr key={s.id} className="border-b border-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-5 py-3 text-gray-600 max-w-xs truncate">{s.base_instruction}</td>
                    <td className="px-5 py-3 text-gray-600">{s.available_tools?.length || 0}</td>
                    <td className="px-5 py-3 text-gray-600">{s.default_wakeup_minutes}m</td>
                    <td className="px-5 py-3 text-gray-600">{s.wakeup_aggressiveness}</td>
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
