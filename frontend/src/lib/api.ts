const API_BASE = 'http://localhost:8000/api';

export async function fetchAPI(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    let msg = `API error: ${res.status}`;
    try {
      const errData = await res.json();
      if (errData.detail) msg += ` - ${JSON.stringify(errData.detail)}`;
    } catch (e) {}
    throw new Error(msg);
  }
  return res.json();
}

// Supervisor APIs
export const getSupervisors = () => fetchAPI('/supervisors');
export const getSupervisor = (id: string) => fetchAPI(`/supervisors/${id}`);
export const createSupervisor = (data: any) => fetchAPI('/supervisors', { method: 'POST', body: JSON.stringify(data) });

// Run APIs  
export const getRuns = (status?: string) => fetchAPI(`/runs${status ? `?status=${status}` : ''}`);
export const getRun = (id: string) => fetchAPI(`/runs/${id}`);
export const createRun = (data: any) => fetchAPI('/runs', { method: 'POST', body: JSON.stringify(data) });
export const addInstruction = (runId: string, instruction: string) => fetchAPI(`/runs/${runId}/instructions`, { method: 'POST', body: JSON.stringify({ instruction }) });
export const pauseRun = (runId: string) => fetchAPI(`/runs/${runId}/pause`, { method: 'POST' });
export const resumeRun = (runId: string) => fetchAPI(`/runs/${runId}/resume`, { method: 'POST' });
export const terminateRun = (runId: string) => fetchAPI(`/runs/${runId}/terminate`, { method: 'POST' });

// Event APIs
export const injectEvent = (runId: string, type: string, data?: any) => fetchAPI(`/runs/${runId}/events`, { method: 'POST', body: JSON.stringify({ type, data: data || {} }) });
