# RavenLedger

## Multi-Agent ERP Payment Risk Investigator on Splunk

RavenLedger investigates risky enterprise payments before money leaves the organization. It combines ERP-style payment fraud signals, insider behavior, live Splunk evidence, named controls, human-approved actions, and audit-ready reporting into one unified investigation case.

RavenLedger answers one critical enterprise question:

> Should this payment leave the enterprise right now — and what evidence supports that decision?

---

## Product & Deployment

Frontend Demo: `<ADD_NETLIFY_LINK_HERE>`

Backend: Local FastAPI backend connected to local Splunk Enterprise

Splunk: Splunk Enterprise with BOTS v3 dataset

Repository: `<ADD_GITHUB_LINK_HERE>`

The frontend is deployed for presentation. The full live Splunk workflow currently runs locally because Splunk Enterprise and BOTS v3 are installed in the local development environment. Backend deployment on Google Cloud is planned as the next step.

---

## Quick Start

### 1. Start Splunk Enterprise

Open Splunk Enterprise:

```text
http://localhost:8000
```

Verify that BOTS v3 data is searchable in Splunk Search & Reporting:

```spl
index=botsv3 earliest=0 | head 5
```

### 2. Set Splunk environment variables

PowerShell:

```powershell
$env:SPLUNK_HOST="https://localhost:8089"
$env:SPLUNK_USERNAME="YOUR_SPLUNK_USERNAME"
$env:SPLUNK_PASSWORD="YOUR_SPLUNK_PASSWORD"
```

Or create a `.env` file inside the `RavenLedger/` folder:

```env
SPLUNK_HOST=https://localhost:8089
SPLUNK_USERNAME=YOUR_SPLUNK_USERNAME
SPLUNK_PASSWORD=YOUR_SPLUNK_PASSWORD
```

### 3. Run the backend API

From the backend folder:

```powershell
cd C:\Users\Khushboo\Documents\splunk\RavenLedger\backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

Check backend health:

```text
http://localhost:8001/health
```

Expected response:

```json
{
  "status": "healthy",
  "service": "ravenledger-api",
  "splunk_mode": "REST/Python live adapter",
  "mcp_status": "MCP-ready adapter architecture"
}
```

### 4. Run the frontend locally

```powershell
cd frontend
npm install
npm run dev
```

Frontend local URL:

```text
http://localhost:5173
```

---

## What is RavenLedger?

RavenLedger is an agentic RiskOps investigation system for high-risk enterprise payments.

A risky payment is not only a finance issue. It can involve invoice fraud, supplier risk, insider behavior, security telemetry, policy violations, manual approval requirements, and audit evidence.

RavenLedger turns scattered enterprise signals into one evidence-backed investigation case.

---

## Problem

Enterprise risk is expensive and fragmented.

Finance teams see invoice fraud, blacklisted suppliers, duplicate or split invoice patterns, and abnormal payment timing.

SOC teams see suspicious logins, device activity, web behavior, and security events.

Audit teams see policy violations, approval gaps, and manual review requirements.

Operations teams see process health, log availability, job failures, and payment workflow delays.

The data exists, but Finance, SOC, Audit, and Operations usually see it separately.

---

## Market Gap

The market solves risk in separate lanes.

Finance fraud tools focus on invoice checks, vendor risk, and duplicate payments.

SOC and security platforms focus on alerts, user behavior, and telemetry.

Audit and GRC tools focus on controls, compliance, and documentation.

SOAR tools focus on playbooks, escalation, and response.

The missing layer is one shared investigation case before payment release.

RavenLedger creates that shared investigation layer by combining payment risk, insider context, Splunk evidence, named controls, and human-approved action into one audit-ready case.

---

## Core Demo Scenario

A high-risk invoice is about to be released.

RavenLedger detects:

* fraud label present
* supplier is blacklisted
* split invoice pattern detected
* late-night invoice submission detected
* insider-risk user activity
* live Splunk telemetry evidence

The system generates:

```text
Case: RL-CORR-0001
Invoice: INV_0249564
Risk Score: 89/100
Severity: Critical
Splunk Evidence: 20 live events
Recommended Action: Hold payment immediately, escalate to Finance, SOC, and Compliance, and generate audit report.
```

---

## Architecture

RavenLedger follows this investigation chain:

```text
Business Risk
   ↓
Insider Behavior
   ↓
Splunk Evidence
   ↓
Correlation
   ↓
Policy Decision
   ↓
Audit Report
   ↓
Human Action
```

The system combines:

```text
ERP-style payment risk
+ insider behavior
+ Splunk evidence
+ named controls
+ human approval
+ audit reporting
```

Architecture image:

```text
<ADD_ARCHITECTURE_IMAGE_HERE>
```

---

## Product Flow

```text
User selects investigation mode
        ↓
RavenLedger Supervisor starts the investigation
        ↓
Specialist agents process business, user, Splunk, policy, and audit evidence
        ↓
RavenLedger builds a unified investigation case
        ↓
The case is ranked in a Top Risk Queue
        ↓
The system explains why the case is first
        ↓
Named controls are checked
        ↓
A human-approved action is recorded
        ↓
An audit-ready report is generated
```

---

## Agents

RavenLedger uses one supervisor and seven specialist agents.

### 1. RavenLedger Supervisor Agent

Coordinates the full investigation workflow, selects the investigation focus, runs specialist agents, and ranks the priority case.

### 2. Business Risk Agent

Detects risky invoices, supplier fraud signals, split invoice behavior, late-night submissions, and blacklisted supplier involvement.

### 3. Insider Behavior Agent

Analyzes suspicious user behavior using logon, device, and HTTP/web activity.

### 4. Splunk Evidence Agent

Runs SPL against Splunk Enterprise and retrieves live BOTS v3 telemetry evidence.

Example SPL:

```spl
index=botsv3 earliest=0
| table _time host sourcetype source
| head 20
```

### 5. Correlation Agent

Combines business risk, insider behavior, and Splunk telemetry into one unified investigation case.

### 6. Policy Decision Agent

Maps the case to named controls such as supplier compliance, procurement threshold bypass, unusual submission time, Splunk evidence attachment, and human approval requirement.

### 7. Audit Report Agent

Generates audit-ready markdown reports for each correlated case.

### 8. Human Action Agent

Records analyst-approved actions such as hold payment, escalate to SOC, send to finance review, generate audit report, or mark false positive.

---

## Investigation Modes

The frontend selector supports five investigation modes:

```text
full
payment_fraud
insider_behavior
splunk_evidence
policy_audit
```

### Full Multi-Agent Investigation

Runs all RavenLedger agents across business fraud, insider behavior, live Splunk evidence, policy controls, audit reporting, and human-action readiness.

### Payment Fraud Investigation

Focuses on invoice fraud, supplier risk, blacklisted supplier, split invoice pattern, late-night submission, invoice amount, and payment hold recommendation.

### Insider Behavior Investigation

Focuses on suspicious user behavior connected to the payment-risk case, including logon activity, device activity, HTTP/web activity, and insider-risk score.

### Splunk Security Evidence Investigation

Focuses on live Splunk telemetry, generated SPL, BOTS v3 evidence, hosts, sourcetypes, sources, timestamps, and Splunk access mode.

### Policy & Audit Investigation

Focuses on named controls, policy violations, controls triggered, escalation targets, human approval, recommended action, and audit report generation.

---

## Main API Endpoints

Backend base URL:

```text
http://localhost:8001
```

Endpoints:

```http
GET  /health
GET  /agent/modes
GET  /agent/latest-result
GET  /agent/run-investigation?mode=full
GET  /agent/run-investigation?mode=payment_fraud
GET  /agent/run-investigation?mode=insider_behavior
GET  /agent/run-investigation?mode=splunk_evidence
GET  /agent/run-investigation?mode=policy_audit
GET  /cases/top-risk
GET  /cases/{case_id}
GET  /cases/{case_id}/summary
GET  /reports
GET  /reports/{case_id}
POST /actions/simulate
GET  /actions/log
```

---

## Example Human Action Request

```http
POST /actions/simulate
```

Example body:

```json
{
  "case_id": "RL-CORR-0001",
  "action": "Hold Payment",
  "actor": "Demo Analyst",
  "reason": "Critical case with blacklisted supplier, insider-risk context, and live Splunk evidence."
}
```

---

## Data Used

RavenLedger uses demo-safe and public datasets.

### Procurement Invoice Fraud Dataset

Used by:

```text
Business Risk Agent
```

Provides:

```text
invoice ID, supplier ID, department, amount, fraud labels, split invoice patterns, late-night submissions, supplier risk signals
```

### CERT r1 Insider Threat Dataset

Used by:

```text
Insider Behavior Agent
```

Provides:

```text
user activity, logon/logoff behavior, device connect/disconnect behavior, HTTP/web activity patterns
```

### Splunk BOTS v3 via Splunk Enterprise

Used by:

```text
Splunk Evidence Agent
```

Provides:

```text
_time, host, sourcetype, source, and live security/operational telemetry
```

---

## Demo Pages

The frontend demo contains the following flow:

```text
Landing Page
   ↓
Investigation Type Selector
   ↓
Command Center
   ↓
Investigation Case
   ↓
Splunk Evidence
   ↓
Audit & Human Action
```

### Landing Page

Explains the product, the investigation chain, the evidence convergence, named controls, Splunk evidence, and human-in-loop response.

### Investigation Type Selector

Allows the user to choose one investigation mode:

```text
Full Multi-Agent Investigation
Payment Fraud Investigation
Insider Behavior Investigation
Splunk Security Evidence Investigation
Policy & Audit Investigation
```

### Command Center

Shows the selected investigation mode, agent status, priority case, score, severity, and why the case was ranked first.

### Investigation Case

Shows business risk, insider behavior, and Splunk evidence converging into one unified case.

### Splunk Evidence

Shows generated SPL, plain-English explanation, live evidence count, and Splunk event samples.

### Audit & Human Action

Shows named controls, policy violations, escalation targets, recommended action, human action buttons, action log, and audit report.

---

## What Makes RavenLedger Different?

Most tools look at one lane.

Finance tools see invoices.

SOC tools see alerts.

Audit tools see controls.

SOAR tools run playbooks.

RavenLedger creates one shared investigation case before payment release.

It combines:

```text
Payment risk
+ supplier context
+ insider behavior
+ live Splunk evidence
+ named controls
+ human-approved action
+ audit-ready reporting
```

---

## Current Status

Completed:

```text
- Multi-agent backend
- Live Splunk REST/Python adapter
- BOTS v3 evidence retrieval
- Investigation mode selector support
- Top Risk Queue
- Ranking reason
- Named controls checklist
- Audit report generation
- Human action simulation
- Frontend demo flow
- Local Splunk Enterprise integration
```

---

## Future Expansion

RavenLedger can expand into a broader enterprise RiskOps layer.

### Splunk MCP Server Integration

Allow agents to access Splunk through standard MCP tool-calling.

### Splunk AI Assistant-style SPL Generation

Convert analyst intent into SPL investigation playbooks.

### Splunk AI Toolkit / MLTK

Add anomaly scoring for insider behavior, payment risk, and operational telemetry.

### Splunk Hosted Models

Evaluate hosted security models for deeper alert enrichment and security reasoning.

### SOAR Workflow Integration

Trigger approved playbooks after human confirmation.

### ERP / SAP / Oracle Connectors

Connect to real payment, vendor, purchase order, approval, and supplier master data.

### Operations Expansion

Add ERP job health, payment batch delay monitoring, ingestion health, and source/log availability checks.

### Cloud Backend Deployment

Deploy the backend on Google Cloud Run and support remote demo access.

---

## Local Demo Ports

```text
Splunk Enterprise UI: http://localhost:8000
Splunk REST API: https://localhost:8089
RavenLedger backend: http://localhost:8001
Frontend local: http://localhost:5173
Frontend deployed: <ADD_NETLIFY_LINK_HERE>
```

---

## Demo Notes

The live Splunk workflow is demonstrated locally.

The frontend can be deployed publicly, while the full Splunk-powered investigation is reproducible locally from this repository.

If the frontend is deployed on Netlify, the full live workflow requires the backend to be running locally or deployed separately. Google Cloud backend deployment is planned after the local demo is finalized.

---

## Conclusion

RavenLedger turns scattered enterprise risk signals into one evidence-backed decision before money leaves the organization.

It combines business payment risk, insider behavior, Splunk telemetry, policy controls, human approval, and audit reporting into a single investigation workflow.

RavenLedger is built to help Finance, SOC, Audit, and Operations work from the same evidence-backed case instead of separate risk signals.
