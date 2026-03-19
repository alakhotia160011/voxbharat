import { authFetch } from '../utils/auth';
import { CALL_SERVER } from '../utils/config';

function jsonOrThrow(res) {
  if (!res.ok) return res.json().catch(() => ({})).then(d => Promise.reject(d));
  return res.json();
}

function jsonOrEmpty(res) {
  if (!res.ok) return [];
  return res.json().then(d => (Array.isArray(d) ? d : []));
}

function post(path, body) {
  return fetch(`${CALL_SERVER}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function authPost(path, body) {
  return authFetch(`${CALL_SERVER}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function authPut(path, body) {
  return authFetch(`${CALL_SERVER}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function authDelete(path) {
  return authFetch(`${CALL_SERVER}${path}`, { method: 'DELETE' });
}

// ── Auth ──
export const api = {
  login: (email, password) => post('/api/login', { email, password }).then(jsonOrThrow),
  signup: (email, password, name) => post('/api/signup', { email, password, name: name || undefined }).then(jsonOrThrow),
  googleAuth: (credential) => post('/api/auth/google', { credential }).then(jsonOrThrow),
  forgotPassword: (email) => post('/api/forgot-password', { email }),
  me: () => authFetch(`${CALL_SERVER}/api/me`),

  // ── Projects (Surveys) ──
  getProjects: () => authFetch(`${CALL_SERVER}/api/projects`).then(jsonOrEmpty),
  getProjectCalls: (name) => authFetch(`${CALL_SERVER}/api/projects/${encodeURIComponent(name)}/calls`).then(jsonOrEmpty),
  getProjectAnalytics: (name) => authFetch(`${CALL_SERVER}/api/projects/${encodeURIComponent(name)}/analytics`).then(r => r.ok ? r.json() : null),
  getProjectBreakdowns: (name) => authFetch(`${CALL_SERVER}/api/projects/${encodeURIComponent(name)}/response-breakdowns`).then(r => r.ok ? r.json() : null),
  getProjectSurveyConfig: (name) => authFetch(`${CALL_SERVER}/api/projects/${encodeURIComponent(name)}/survey-config`).then(r => r.ok ? r.json() : null),
  saveBucketMappings: (name, mappings) => authPost(`/api/projects/${encodeURIComponent(name)}/bucket-mappings`, mappings),
  deleteBucketMappings: (name) => authPut(`/api/projects/${encodeURIComponent(name)}/bucket-mappings`, { mappings: {} }),
  exportProjectCsv: (name) => authFetch(`${CALL_SERVER}/api/projects/${encodeURIComponent(name)}/export/csv`),
  exportProjectJson: (name) => authFetch(`${CALL_SERVER}/api/projects/${encodeURIComponent(name)}/export/json`),

  // ── Calls ──
  getCall: (callId) => authFetch(`${CALL_SERVER}/api/surveys/${callId}`).then(r => r.ok ? r.json() : null),
  getCallRecording: (callId) => authFetch(`${CALL_SERVER}/api/calls/${callId}/recording`),

  // ── Campaigns ──
  getCampaigns: () => authFetch(`${CALL_SERVER}/api/campaigns`).then(jsonOrEmpty),
  getCampaign: (id) => authFetch(`${CALL_SERVER}/api/campaigns/${id}`).then(r => r.ok ? r.json() : null),
  createCampaign: (data) => authPost('/api/campaigns', data).then(jsonOrThrow),
  campaignAction: (id, action) => authPost(`/api/campaigns/${id}/${action}`, {}),

  // ── Inbound ──
  getInboundConfigs: () => authFetch(`${CALL_SERVER}/api/inbound-configs`).then(jsonOrEmpty),
  createInboundConfig: (data) => authPost('/api/inbound-configs', data).then(jsonOrThrow),
  toggleInbound: (id) => authPost(`/api/inbound-configs/${id}/toggle`, {}),
  deleteInbound: (id) => authDelete(`/api/inbound-configs/${id}`),
};
