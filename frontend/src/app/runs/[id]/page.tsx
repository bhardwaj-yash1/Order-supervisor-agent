'use client';

import { useEffect, useState, useRef, use } from 'react';
import { getRun, getSupervisor, addInstruction, pauseRun, resumeRun, terminateRun, injectEvent, formatTime } from '@/lib/api';

const EVENT_TYPES = [
  'order_created', 'payment_confirmed', 'payment_failed',
  'shipment_created', 'shipment_delayed', 'delivered',
  'refund_requested', 'customer_message_received', 'no_update_for_n_hours'
];

const EVENT_DEFAULTS: Record<string, string> = {
  payment_confirmed: '{"amount": 149.97, "method": "visa_ending_4242"}',
  payment_failed: '{"reason": "insufficient_funds", "amount": 149.97}',
  shipment_created: '{"carrier": "FedEx", "tracking_id": "FX123456789"}',
  shipment_delayed: '{"reason": "weather", "estimated_delay_days": 2}',
  delivered: '{"signed_by": "John Smith"}',
  refund_requested: '{"reason": "item_damaged", "amount": 89.99}',
  customer_message_received: '{"message": "Where is my order?"}',
  no_update_for_n_hours: '{"hours": 24}',
};

export default function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [run, setRun] = useState<any>(null);
  const [supervisor, setSupervisor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [newInstruction, setNewInstruction] = useState('');
  const [instrMsg, setInstrMsg] = useState('');
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [eventData, setEventData] = useState('{}');
  const [eventMsg, setEventMsg] = useState('');
  const [confirmTerminate, setConfirmTerminate] = useState(false);

  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    async function fetch() {
      try {
        const data = await getRun(id);
        setRun(data);
        if (!supervisor && data.supervisor_id) {
          try { setSupervisor(await getSupervisor(data.supervisor_id)); } catch {}
        }
      } catch {}
      setLoading(false);
    }

    fetch();
    interval = setInterval(fetch, 3000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [run?.timeline_entries?.length]);

  function handleEventTypeChange(type: string) {
    setEventType(type);
    setEventData(EVENT_DEFAULTS[type] || '{}');
  }

  async function handleSendEvent() {
    setEventMsg('');
    try {
      const data = eventData.trim() ? JSON.parse(eventData) : {};
      await injectEvent(id, eventType, data);
      setEventMsg('Event sent.');
    } catch (err: any) {
      setEventMsg('Error: ' + (err.message || 'Failed'));
    }
  }

  async function handleAddInstruction() {
    setInstrMsg('');
    if (!newInstruction.trim()) return;
    try {
      await addInstruction(id, newInstruction.trim());
      setInstrMsg('Instruction added.');
      setNewInstruction('');
    } catch (err: any) {
      setInstrMsg('Error: ' + (err.message || 'Failed'));
    }
  }

  async function handlePause() {
    try { await pauseRun(id); } catch {}
  }
  async function handleResume() {
    try { await resumeRun(id); } catch {}
  }
  async function handleTerminate() {
    if (!confirmTerminate) { setConfirmTerminate(true); return; }
    try { await terminateRun(id); setConfirmTerminate(false); } catch {}
  }

  if (loading) return <p className="text-gray-500 py-8">Loading...</p>;
  if (!run) return <p className="text-red-600 py-8">Run not found.</p>;

  const isLive = run.status === 'active' || run.status === 'paused';

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-semibold text-gray-900">Run: {run.order_id}</h1>
          <StatusBadge status={run.status} />
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {supervisor && <span>Supervisor: {supervisor.name}</span>}
          <span>Created: {formatTime(run.created_at)}</span>
          {run.sleep_until && isLive && (
            <span>Sleeping until: {formatTime(run.sleep_until)}</span>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Left column — Timeline (3/5) */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Timeline</h2>
              <span className="text-xs text-gray-400">{run.timeline_entries?.length || 0} entries</span>
            </div>
            <div ref={timelineRef} className="overflow-y-auto" style={{ maxHeight: '600px' }}>
              {(!run.timeline_entries || run.timeline_entries.length === 0) ? (
                <p className="px-5 py-8 text-sm text-gray-500">Waiting for first agent run...</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {run.timeline_entries.map((entry: any, i: number) => (
                    <div key={entry.id || i} className="px-5 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400">
                          {formatTime(entry.timestamp)}
                        </span>
                        <TypeBadge type={entry.entry_type} />
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.content}</p>
                      {entry.metadata_json && Object.keys(entry.metadata_json).length > 0 && (
                        <details className="mt-1">
                          <summary className="text-xs text-gray-400 cursor-pointer">metadata</summary>
                          <pre className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(entry.metadata_json, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column — Controls (2/5) */}
        <div className="lg:col-span-2 space-y-4">

          {/* Memory */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Memory Summary</h3>
            {run.memory ? (
              <div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{run.memory.summary}</p>
                {run.memory.key_facts?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Key Facts</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-0.5">
                      {run.memory.key_facts.map((f: string, i: number) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No memory recorded yet.</p>
            )}
          </div>

          {/* Inject Event */}
          {isLive && (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Inject Event</h3>
              <div className="space-y-3">
                <select
                  value={eventType}
                  onChange={e => handleEventTypeChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {EVENT_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <textarea
                  value={eventData}
                  onChange={e => setEventData(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Event data (JSON, optional)"
                />
                <button onClick={handleSendEvent} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                  Send Event
                </button>
                {eventMsg && (
                  <p className={`text-xs ${eventMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                    {eventMsg}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Add Instruction */}
          {isLive && (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Add Instruction</h3>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newInstruction}
                  onChange={e => setNewInstruction(e.target.value)}
                  placeholder="e.g., Prioritize speed over cost"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={e => e.key === 'Enter' && handleAddInstruction()}
                />
                <button onClick={handleAddInstruction} className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                  Add
                </button>
              </div>
              {instrMsg && (
                <p className={`text-xs mb-2 ${instrMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {instrMsg}
                </p>
              )}
              {run.instructions?.length > 0 && (
                <ul className="text-sm text-gray-600 space-y-1 mt-2">
                  {run.instructions.map((ins: any, i: number) => (
                    <li key={ins.id || i} className="text-xs text-gray-500">
                      &bull; {ins.instruction}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Run Controls */}
          {isLive && (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Run Controls</h3>
              <div className="flex gap-2">
                {run.status === 'active' && (
                  <button onClick={handlePause} className="px-3 py-1.5 text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md hover:bg-yellow-100">
                    Pause
                  </button>
                )}
                {run.status === 'paused' && (
                  <button onClick={handleResume} className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100">
                    Resume
                  </button>
                )}
                <button
                  onClick={handleTerminate}
                  className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                >
                  {confirmTerminate ? 'Confirm Terminate' : 'Terminate'}
                </button>
              </div>
            </div>
          )}

          {/* Final Summary */}
          {run.final_summary && (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Final Summary</h3>
              {run.final_summary.summary && (
                <p className="text-sm text-gray-700 mb-3">{run.final_summary.summary}</p>
              )}
              {run.final_summary.actions_taken?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Actions Taken</p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-0.5">
                    {run.final_summary.actions_taken.map((a: string, i: number) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
              {run.final_summary.key_learnings?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Key Learnings</p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-0.5">
                    {run.final_summary.key_learnings.map((l: string, i: number) => <li key={i}>{l}</li>)}
                  </ul>
                </div>
              )}
              {run.final_summary.recommendations?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Recommendations</p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-0.5">
                    {run.final_summary.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
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

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    event: 'bg-blue-50 text-blue-600',
    thought: 'bg-gray-100 text-gray-600',
    tool_call: 'bg-orange-50 text-orange-600',
    system: 'bg-gray-100 text-gray-500',
    error: 'bg-red-50 text-red-600',
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium uppercase rounded ${colors[type] || 'bg-gray-100 text-gray-500'}`}>
      {type}
    </span>
  );
}
