const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}`);
  }

  return response.json();
}

export function getHealth() {
  return request("/health");
}

export function getInvestigationModes() {
  return request("/agent/modes");
}

export function runInvestigationApi(mode = "full") {
  return request(`/agent/run-investigation?mode=${encodeURIComponent(mode)}`);
}

export function getLatestResult() {
  return request("/agent/latest-result");
}

export function getTopRiskCases(limit = 10) {
  return request(`/cases/top-risk?limit=${limit}`);
}

export function getCase(caseId) {
  return request(`/cases/${caseId}`);
}

export function getReport(caseId) {
  return request(`/reports/${caseId}`);
}

export function getReports() {
  return request("/reports");
}

export function getActionsLog() {
  return request("/actions/log");
}

export function simulateAction(payload) {
  return request("/actions/simulate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}