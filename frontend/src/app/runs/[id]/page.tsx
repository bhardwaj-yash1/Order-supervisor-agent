'use client';

import { useEffect, useState, useRef, use } from 'react';
import { 
  getRun, 
  getSupervisor,
  addInstruction, 
  pauseRun, 
  resumeRun, 
  terminateRun, 
  injectEvent 
} from '@/lib/api';

const EVENT_TYPES = [
  'order_created', 'payment_confirmed', 'payment_failed', 
  'shipment_created', 'shipment_delayed', 'delivered', 
  'refund_requested', 'customer_message_received', 'no_update_for_n_hours'
];

export default function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  
  const [run, setRun] = useState<any>(null);
  const [supervisor, setSupervisor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Inputs
  const [newInstruction, setNewInstruction] = useState('');
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [eventData, setEventData] = useState('{\n  \n}');
  const [eventStatus, setEventStatus] = useState<{msg: string, isError: boolean} | null>(null);

  const timelineEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    async function fetchDetails() {
      try {
        const runData = await getRun(id);
        setRun(runData);
        
        if (!supervisor && runData.supervisor_id) {
          const supData = await getSupervisor(runData.supervisor_id);
          setSupervisor(supData);
        }
      } catch (e) {
        console.error("Failed to fetch run details", e);
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
    interval = setInterval(fetchDetails, 3000);
    return () => clearInterval(interval);
  }, [id, supervisor]);

  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [run?.timeline]);

  const handleAddInstruction = async () => {
    if (!newInstruction.trim()) return;
    try {
      await addInstruction(id, newInstruction);
      setNewInstruction('');
      // Optimistic refresh
      const runData = await getRun(id);
      setRun(runData);
    } catch (e) {
      alert('Failed to add instruction');
    }
  };

  const handleInjectEvent = async () => {
    setEventStatus(null);
    let parsedData = {};
    try {
      parsedData = JSON.parse(eventData);
    } catch (e) {
      setEventStatus({ msg: 'Invalid JSON', isError: true });
      return;
    }
    
    try {
      await injectEvent(id, eventType, parsedData);
      setEventStatus({ msg: 'Event injected successfully', isError: false });
      setTimeout(() => setEventStatus(null), 3000);
      setEventData('{\n  \n}');
    } catch (e) {
      setEventStatus({ msg: 'Failed to inject event', isError: true });
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

  const getTimelineIcon = (type: string) => {
    switch(type) {
      case 'event': return { icon: '📦', color: 'bg-blue-500/20 text-blue-400' };
      case 'thought': return { icon: '🧠', color: 'bg-purple-500/20 text-purple-400' };
      case 'tool_call': return { icon: '🔧', color: 'bg-orange-500/20 text-orange-400' };
      case 'system': return { icon: '⚙️', color: 'bg-gray-500/20 text-gray-400' };
      default: return { icon: '•', color: 'bg-gray-700 text-gray-300' };
    }
  };

  if (loading) {
    return <div className="animate-pulse p-8 space-y-4">
      <div className="h-12 bg-gray-800/50 rounded w-1/3"></div>
      <div className="h-96 bg-gray-800/50 rounded"></div>
    </div>;
  }

  if (!run) {
    return <div className="p-8 text-center text-red-400">Run not found</div>;
  }

  const isSleep = run.wake_time && new Date(run.wake_time).getTime() > Date.now();
  const isActiveOrPaused = run.status === 'active' || run.status === 'paused';

  return (
    <div className="animate-in fade-in duration-500 h-full flex flex-col gap-6">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur p-6 rounded-xl border border-gray-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-100">Order #{run.order_id}</h1>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusStyle(run.status)}`}>
              {run.status.toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-gray-400 flex items-center gap-2">
            <span>🤖 {supervisor?.name || run.supervisor_id}</span>
            <span className="text-gray-600">•</span>
            <span>Started {new Date(run.created_at).toLocaleString()}</span>
          </p>
        </div>
        
        {/* Sleep Status */}
        <div className="flex items-center gap-3 bg-gray-900/50 px-4 py-2 rounded-lg border border-gray-700/50">
          {isSleep ? (
            <>
              <span className="text-xl animate-pulse">💤</span>
              <div>
                <div className="text-sm font-medium text-blue-400">Sleeping</div>
                <div className="text-xs text-gray-500">until {new Date(run.wake_time).toLocaleTimeString()}</div>
              </div>
            </>
          ) : run.status === 'active' ? (
            <>
              <span className="text-xl text-green-400 animate-spin-slow">👁️</span>
              <div className="text-sm font-medium text-green-400">Awake & Processing</div>
            </>
          ) : (
            <div className="text-sm font-medium text-gray-500 px-2">Inactive</div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden min-h-[600px]">
        
        {/* Left Col: Timeline */}
        <div className="lg:col-span-2 bg-gray-800/30 backdrop-blur rounded-xl border border-gray-700/50 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-700/50 bg-gray-800/50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-200">Activity Timeline</h2>
            <span className="text-xs text-gray-500">{run.timeline?.length || 0} entries</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-700">
            {(!run.timeline || run.timeline.length === 0) ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                Waiting for first agent run...
              </div>
            ) : (
              run.timeline.map((entry: any, i: number) => {
                const style = getTimelineIcon(entry.type);
                return (
                  <div key={i} className="flex gap-4 group">
                    <div className="shrink-0 flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${style.color} shadow-lg ring-4 ring-gray-950`}>
                        {style.icon}
                      </div>
                      {i !== run.timeline.length - 1 && (
                        <div className="w-px h-full bg-gray-700/50 my-1 group-hover:bg-gray-600 transition-colors"></div>
                      )}
                    </div>
                    <div className="pb-6 pt-1 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold capitalize text-gray-300">{entry.type.replace('_', ' ')}</span>
                        <span className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="bg-gray-900/60 p-4 rounded-xl rounded-tl-none border border-gray-700/50 text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                        {typeof entry.content === 'object' ? JSON.stringify(entry.content, null, 2) : entry.content}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={timelineEndRef} />
          </div>
        </div>

        {/* Right Col: Panels */}
        <div className="space-y-6 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700">
          
          {/* Controls */}
          {isActiveOrPaused && (
            <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700/50 p-5">
              <h3 className="font-semibold text-gray-200 mb-4">Run Controls</h3>
              <div className="flex gap-3">
                {run.status === 'active' ? (
                  <button onClick={() => pauseRun(id)} className="flex-1 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-500 border border-yellow-600/50 rounded-lg transition-colors text-sm font-medium">
                    Pause
                  </button>
                ) : (
                  <button onClick={() => resumeRun(id)} className="flex-1 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-500 border border-green-600/50 rounded-lg transition-colors text-sm font-medium">
                    Resume
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (confirm("Are you sure you want to terminate this run?")) terminateRun(id);
                  }} 
                  className="flex-1 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-600/50 rounded-lg transition-colors text-sm font-medium"
                >
                  Terminate
                </button>
              </div>
            </div>
          )}

          {/* Final Summary */}
          {(run.status === 'completed' || run.status === 'terminated') && run.final_summary && (
            <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-blue-500/30 p-5 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
              <h3 className="font-semibold text-blue-400 mb-4 flex items-center gap-2"><span>📋</span> Final Summary</h3>
              <div className="space-y-4 text-sm text-gray-300">
                <p className="leading-relaxed bg-gray-900/50 p-3 rounded">{run.final_summary.summary}</p>
                
                {run.final_summary.actions_taken?.length > 0 && (
                  <div>
                    <h4 className="text-gray-200 font-medium mb-2">Actions Taken</h4>
                    <ul className="list-disc pl-5 space-y-1 text-gray-400">
                      {run.final_summary.actions_taken.map((a: string, i: number) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                )}
                
                {run.final_summary.key_learnings?.length > 0 && (
                  <div>
                    <h4 className="text-gray-200 font-medium mb-2">Key Learnings</h4>
                    <ul className="list-disc pl-5 space-y-1 text-gray-400">
                      {run.final_summary.key_learnings.map((a: string, i: number) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Memory Panel */}
          <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700/50 p-5">
            <h3 className="font-semibold text-gray-200 mb-4 flex items-center gap-2"><span>📝</span> Memory</h3>
            {run.memory ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-300 leading-relaxed">{run.memory.summary}</p>
                {run.memory.key_facts?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {run.memory.key_facts.map((fact: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-gray-700/50 text-xs text-gray-300 rounded border border-gray-600">
                        {fact}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No memory yet</p>
            )}
          </div>

          {/* Inject Event Panel */}
          <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700/50 p-5">
            <h3 className="font-semibold text-gray-200 mb-4 flex items-center gap-2"><span>🔌</span> Inject Event</h3>
            <div className="space-y-3">
              <select 
                value={eventType}
                onChange={e => setEventType(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-sm text-gray-200 rounded px-3 py-2 outline-none focus:border-indigo-500"
              >
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <textarea 
                value={eventData}
                onChange={e => setEventData(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-xs font-mono text-gray-300 rounded px-3 py-2 h-24 resize-none outline-none focus:border-indigo-500"
                placeholder="JSON data (optional)"
              />
              <button 
                onClick={handleInjectEvent}
                className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-600/50 rounded-lg transition-colors text-sm font-medium"
              >
                Send Event
              </button>
              {eventStatus && (
                <div className={`text-xs p-2 rounded ${eventStatus.isError ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                  {eventStatus.msg}
                </div>
              )}
            </div>
          </div>

          {/* Extra Instructions */}
          <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700/50 p-5">
            <h3 className="font-semibold text-gray-200 mb-4 flex items-center gap-2"><span>✍️</span> Added Instructions</h3>
            
            <div className="space-y-4 mb-4">
              {(!run.extra_instructions || run.extra_instructions.length === 0) ? (
                <p className="text-sm text-gray-500 italic">No extra instructions.</p>
              ) : (
                <ul className="space-y-3">
                  {run.extra_instructions.map((inst: any, i: number) => (
                    <li key={i} className="bg-gray-900/50 p-3 rounded border border-gray-700/50 text-sm">
                      <p className="text-gray-300">{inst.instruction}</p>
                      <span className="text-xs text-gray-500 mt-2 block">{new Date(inst.timestamp).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                value={newInstruction}
                onChange={e => setNewInstruction(e.target.value)}
                placeholder="Add new instruction..."
                className="flex-1 bg-gray-900 border border-gray-700 text-sm text-gray-200 rounded px-3 py-2 outline-none focus:border-indigo-500"
                onKeyDown={e => e.key === 'Enter' && handleAddInstruction()}
              />
              <button 
                onClick={handleAddInstruction}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-sm transition-colors"
              >
                Add
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
