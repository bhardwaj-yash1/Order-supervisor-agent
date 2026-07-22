'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { getRun, getSupervisor, pauseRun, resumeRun, terminateRun, injectEvent, addInstruction } from '@/lib/api';

function getStatusBadge(status: string) {
  switch (status?.toLowerCase()) {
    case 'active': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">ACTIVE</span>;
    case 'paused': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-medium">PAUSED</span>;
    case 'completed': return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">COMPLETED</span>;
    case 'terminated': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm font-medium">TERMINATED</span>;
    default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium">{status?.toUpperCase() || ''}</span>;
  }
}

function getTypeBadge(type: string) {
  switch (type?.toUpperCase()) {
    case 'EVENT': return <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-mono">EVENT</span>;
    case 'THOUGHT': return <span className="px-1.5 py-0.5 bg-gray-200 text-gray-800 rounded text-xs font-mono">THOUGHT</span>;
    case 'TOOL_CALL': return <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded text-xs font-mono">TOOL_CALL</span>;
    case 'SYSTEM': return <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">SYSTEM</span>;
    default: return <span className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-mono">{type}</span>;
  }
}

export default function RunDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [run, setRun] = useState<any>(null);
  const [supervisor, setSupervisor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [eventType, setEventType] = useState('message_received');
  const [eventData, setEventData] = useState('{\n  "message": "Hello"\n}');
  const [injecting, setInjecting] = useState(false);
  const [injectMsg, setInjectMsg] = useState('');

  const [newInstruction, setNewInstruction] = useState('');
  const [addingInst, setAddingInst] = useState(false);

  const timelineRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    try {
      const runData = await getRun(id);
      setRun(runData);
      if (runData.supervisor_id && (!supervisor || supervisor.id !== runData.supervisor_id)) {
        const supData = await getSupervisor(runData.supervisor_id).catch(() => null);
        if (supData) setSupervisor(supData);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load run details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      setRun((currentRun: any) => {
        if (currentRun && (currentRun.status === 'active' || currentRun.status === 'paused')) {
          loadData();
        }
        return currentRun;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [run?.timeline?.length]);

  if (loading && !run) {
    return <div className="p-4 text-gray-500">Loading...</div>;
  }

  if (error || !run) {
    return <div className="p-4 text-red-600">{error || 'Run not found'}</div>;
  }

  const handleAction = async (action: 'pause' | 'resume' | 'terminate') => {
    try {
      if (action === 'pause') await pauseRun(id);
      if (action === 'resume') await resumeRun(id);
      if (action === 'terminate') await terminateRun(id);
      await loadData();
    } catch (e: any) {
      alert(e.message || `Failed to ${action} run`);
    }
  };

  const handleInject = async (e: React.FormEvent) => {
    e.preventDefault();
    setInjecting(true);
    setInjectMsg('');
    try {
      let parsedData = {};
      if (eventData.trim()) {
        parsedData = JSON.parse(eventData);
      }
      await injectEvent(id, eventType, parsedData);
      setInjectMsg('Event injected successfully');
      setEventData('{}');
      await loadData();
    } catch (e: any) {
      setInjectMsg(`Error: ${e.message || 'Invalid JSON'}`);
    } finally {
      setInjecting(false);
      setTimeout(() => setInjectMsg(''), 3000);
    }
  };

  const handleAddInstruction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstruction.trim()) return;
    setAddingInst(true);
    try {
      await addInstruction(id, newInstruction);
      setNewInstruction('');
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to add instruction');
    } finally {
      setAddingInst(false);
    }
  };

  const isActiveOrPaused = run.status === 'active' || run.status === 'paused';
  const isCompletedOrTerminated = run.status === 'completed' || run.status === 'terminated';

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
              <span>Run: {run.order_id}</span>
              {getStatusBadge(run.status)}
            </h1>
            <p className="text-gray-600 mt-2">Supervisor: {supervisor ? supervisor.name : run.supervisor_id}</p>
            <p className="text-gray-500 text-sm">Created: {new Date(run.created_at).toLocaleString()}</p>
          </div>
          {run.sleeping_until && new Date(run.sleeping_until) > new Date() && (
            <div className="bg-gray-100 border border-gray-200 px-3 py-2 rounded text-sm text-gray-700">
              Sleeping until: {new Date(run.sleeping_until).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column */}
        <div className="w-full lg:w-[60%] space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg flex flex-col h-[500px]">
            <div className="p-4 border-b border-gray-200 font-semibold text-gray-800 flex justify-between items-center">
              <span>Timeline</span>
              <span className="text-sm font-normal text-gray-500">{run.timeline?.length || 0} entries</span>
            </div>
            <div ref={timelineRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 font-mono text-sm">
              {run.timeline?.map((entry: any, i: number) => (
                <div key={i} className="flex space-x-3 text-gray-800">
                  <span className="text-gray-500 shrink-0">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>
                  <span className="shrink-0">{getTypeBadge(entry.type)}</span>
                  <span className="break-all whitespace-pre-wrap">{entry.content}</span>
                </div>
              ))}
              {(!run.timeline || run.timeline.length === 0) && (
                <div className="text-gray-400">No timeline entries yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="w-full lg:w-[40%] space-y-6">
          
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200 font-semibold text-gray-800">Memory Summary</div>
            <div className="p-4 text-sm text-gray-700 space-y-4">
              {run.memory?.summary ? (
                <>
                  <p>{run.memory.summary}</p>
                  {run.memory.facts && run.memory.facts.length > 0 && (
                    <ul className="list-disc pl-5 space-y-1">
                      {run.memory.facts.map((fact: string, i: number) => (
                        <li key={i}>{fact}</li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-gray-500">No memory recorded yet.</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200 font-semibold text-gray-800">Inject Event</div>
            <div className="p-4">
              <form onSubmit={handleInject} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                  <select value={eventType} onChange={e => {
                    setEventType(e.target.value);
                    if (e.target.value === 'message_received') setEventData('{\n  "message": ""\n}');
                    else setEventData('{}');
                  }} className="w-full border border-gray-300 rounded-md p-2 text-sm">
                    <option value="message_received">Message Received</option>
                    <option value="status_update">Status Update</option>
                    <option value="user_action">User Action</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Data (JSON)</label>
                  <textarea rows={3} value={eventData} onChange={e => setEventData(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm font-mono" />
                </div>
                <button type="submit" disabled={injecting} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                  {injecting ? 'Sending...' : 'Send Event'}
                </button>
                {injectMsg && <div className={`text-sm ${injectMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{injectMsg}</div>}
              </form>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200 font-semibold text-gray-800">Add Instruction</div>
            <div className="p-4">
              <form onSubmit={handleAddInstruction} className="space-y-3">
                <input type="text" required value={newInstruction} onChange={e => setNewInstruction(e.target.value)} placeholder="New instruction..." className="w-full border border-gray-300 rounded-md p-2 text-sm" />
                <button type="submit" disabled={addingInst} className="bg-gray-800 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-900 disabled:opacity-50">
                  {addingInst ? 'Adding...' : 'Add'}
                </button>
              </form>
              {run.instructions && run.instructions.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Existing Instructions</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    {run.instructions.map((inst: string, i: number) => (
                      <li key={i} className="bg-gray-50 p-2 rounded border border-gray-100">{inst}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {isActiveOrPaused && (
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-4 border-b border-gray-200 font-semibold text-gray-800">Run Controls</div>
              <div className="p-4 flex space-x-3">
                {run.status === 'active' && (
                  <button onClick={() => handleAction('pause')} className="bg-yellow-500 text-white px-4 py-2 rounded text-sm hover:bg-yellow-600">Pause</button>
                )}
                {run.status === 'paused' && (
                  <button onClick={() => handleAction('resume')} className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">Resume</button>
                )}
                <button onClick={() => handleAction('terminate')} className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700">Terminate</button>
              </div>
            </div>
          )}

          {isCompletedOrTerminated && run.final_summary && (
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-4 border-b border-gray-200 font-semibold text-gray-800">Final Summary</div>
              <div className="p-4 text-sm text-gray-700 space-y-4">
                <p>{run.final_summary.summary}</p>
                
                {run.final_summary.actions_taken?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-1">Actions Taken</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {run.final_summary.actions_taken.map((item: string, i: number) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                )}
                
                {run.final_summary.key_learnings?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-1">Key Learnings</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {run.final_summary.key_learnings.map((item: string, i: number) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                )}
                
                {run.final_summary.recommendations?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-1">Recommendations</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {run.final_summary.recommendations.map((item: string, i: number) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
