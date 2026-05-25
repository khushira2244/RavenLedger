
# 1st plan


# **Sift Sentinel**

## **Agentic ERP RiskOps Investigator on Splunk**

Core idea:

> **Sift Sentinel is not a connector, not a dashboard, and not a generic fraud detector. It is an agentic ERP RiskOps investigator that turns Splunk telemetry and ERP business events into one audit-ready risk case.** 

And yes — in 21 days, we can build a strong version if we separate **core product** from **Splunk-native enhancement**.

---

# Final Splunk Stack We Will Use

| Layer                              | Splunk Capability                                      | How Sift Sentinel uses it                                                   |
| ---------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------- |
| **Core log/search layer**          | Splunk Cloud / Enterprise or local SPL-style simulator | Store/search ERP, identity, security, and observability events              |
| **Natural language investigation** | Splunk AI Assistant-style NL → SPL                     | User asks: “Investigate high-risk ERP payments,” system shows generated SPL |
| **Agentic query execution**        | Splunk MCP Server                                      | Agent queries Splunk indexes securely and performs multi-step investigation |
| **Security detections**            | Enterprise Security-style detections                   | Insider abuse, role escalation, unusual login, suspicious access            |
| **Response workflow**              | SOAR-style actions                                     | Escalate case, block/review payment, notify SOC/finance, create audit task  |
| **Observability panel**            | ITSI / Observability-style health                      | ERP payment batch health, job failures, approval queue delay                |

Splunk’s hackathon resources explicitly mention AI for Splunk Apps, MCP Server, AI Assistant, and AI Toolkit as the latest AI capabilities for participants. ([Splunk][1]) The MCP Server is designed to connect AI assistants and agents with Splunk platform data through a standardized secure interface. ([Splunk Docs][2]) Splunk AI Assistant helps users generate, edit, and understand SPL using natural language. ([Splunk][3])

---

# Final Product Flow

```text
User Prompt:
"Investigate high-risk ERP payments in the last 24 hours."

        ↓

AI Assistant-style NL → SPL:
Generates searches for payment, invoice, vendor, login, role, alert, and job-health events.

        ↓

MCP / Splunk Query Layer:
Runs searches against Splunk or local SPL-style simulator.

        ↓

Sift Sentinel Agent:
Correlates vendor → PO → invoice → payment → user → role → login → alert.

        ↓

Risk Engine:
Calculates fraud, insider abuse, vendor risk, policy risk, observability risk.

        ↓

Timeline Engine:
Builds chronological evidence chain.

        ↓

SOAR-style Action Layer:
Recommend block / escalate / manual verification / SOC review.

        ↓

Audit Engine:
Generates audit-ready risk case.
```

---

# Product Modules We Will Complete

| Module                                | Splunk capability connected             | Output                                                             |
| ------------------------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| **Payment Fraud Investigation**       | Splunk Enterprise / SPL search          | Finds risky invoices/payments                                      |
| **Insider / Privileged Access Abuse** | ES-style detections + UEBA-style logic  | Finds unusual login, role escalation, same-user conflict           |
| **Vendor / Procurement Risk**         | SPL correlation                         | Finds bank changes, duplicate vendor signals, risky vendor history |
| **Audit / Policy Violation Agent**    | AI reasoning + evidence from SPL        | Finds SoD, manual verification, approval violations                |
| **Observability Mini-Layer**          | ITSI / Observability-style health panel | Shows ERP job failure/payment batch delay                          |
| **SOAR-style Action Panel**           | Human-approved workflow                 | Escalate/block/review/export report                                |

This matches our final five-module product direction. 

---

# 21-Day Plan to Build the Best Version

## Phase 1 — Product Foundation + Data Layer

|   Day | Build target                     | Output                                                 |
| ----: | -------------------------------- | ------------------------------------------------------ |
| **1** | Repo + architecture + README     | Clean project foundation                               |
| **2** | Data strategy + folder structure | `data/raw`, `data/erp_bridge`, `data/processed`        |
| **3** | ERP bridge schema                | vendor, PO, invoice, payment, approval, user role      |
| **4** | Splunk-style event schema        | auth, IAM, ERP transaction, security alert, job health |
| **5** | Seed 3 strong demo cases         | Critical, medium-risk, safe/false-positive             |

Use public security/fraud datasets where possible and an anonymized ERP bridge layer; this was our fixed data strategy. 

---

## Phase 2 — Core Risk Intelligence

|    Day | Build target                     | Output                                                  |
| -----: | -------------------------------- | ------------------------------------------------------- |
|  **6** | Data loader                      | Load ERP + Splunk-style logs                            |
|  **7** | Payment Fraud Engine             | invoice > PO, incomplete GR, bank change                |
|  **8** | Insider Abuse Engine             | unusual IP, temp role, failed login, same-user conflict |
|  **9** | Vendor / Procurement Risk Engine | risky vendor, duplicate bank, abnormal PO               |
| **10** | Combined Risk Engine             | 0–100 score + severity                                  |

---

## Phase 3 — Agentic Investigation

|    Day | Build target             | Output                                              |
| -----: | ------------------------ | --------------------------------------------------- |
| **11** | Correlation engine       | Link vendor → PO → invoice → payment → user → login |
| **12** | Timeline engine          | Chronological evidence timeline                     |
| **13** | Policy violation agent   | SoD, approval bypass, manual verification           |
| **14** | AI explanation generator | Grounded explanation from evidence                  |
| **15** | Audit report generator   | Markdown/HTML audit-ready case                      |

---

## Phase 4 — Splunk-Native Layer

|    Day | Build target                | Output                                         |
| -----: | --------------------------- | ---------------------------------------------- |
| **16** | SPL query simulator         | Show generated SPL for each investigation step |
| **17** | AI Assistant-style NL → SPL | Prompt becomes multiple SPL searches           |
| **18** | MCP-style agent adapter     | Agent calls query tools step-by-step           |
| **19** | SOAR-style action panel     | Block/review/escalate/create case actions      |
| **20** | Observability mini-layer    | ERP job health, batch delay, ingestion health  |
| **21** | Final polish                | demo video, README, screenshots, Devpost text  |

---

# What “All Capabilities” Means Practically

We should not depend on full real enterprise access for everything. We implement it like this:

| Capability                               | Hackathon implementation                                                         |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| **Splunk Cloud/Enterprise**              | Real if available; fallback local simulator                                      |
| **AI Assistant-style NL → SPL**          | Build our own NL prompt → SPL query templates                                    |
| **MCP Server**                           | Use if setup works; fallback: MCP-style tool wrapper calling local/Splunk search |
| **Enterprise Security-style detections** | Implement detection rules and label them ES-style                                |
| **SOAR-style action**                    | Human-approved action buttons, no real money movement                            |
| **ITSI/Observability-style panel**       | ERP health dashboard with job/payment batch status                               |

This way, even if one Splunk setup is difficult, the product still works.

---

# Final Demo Script

```text
A finance payment is about to be released.

Sift Sentinel receives the user prompt:
"Investigate high-risk ERP payments in the last 24 hours."

The AI Assistant-style layer generates SPL searches.

The agent uses the Splunk/MCP query layer to search payment, invoice, vendor, login, role-change, alert, and ERP job-health events.

It finds:
- Vendor bank account changed recently
- Invoice exceeds purchase order
- Goods receipt is incomplete
- Same user changed bank and approved invoice
- Temporary finance role was assigned
- User logged in from unusual IP
- Payment batch had a delay
- Policy requires manual verification

Sift Sentinel produces:
Risk Score: 96/100
Severity: Critical
Recommendation: Block payment release, escalate to Finance + SOC, verify vendor bank, review temporary role access, generate audit report.
```

This main demo aligns with our planned high-risk ERP payment case. 

---




```text
Sift Sentinel
├── Splunk search/log layer
├── AI Assistant-style NL → SPL
├── MCP-style agent query layer
├── Enterprise Security-style detections
├── SOAR-style human action panel
├── ITSI/Observability-style health panel
└── Audit-ready ERP RiskOps case report
```


The key is: **build the core product first, then layer Splunk-native features on top.**

[1]: https://www.splunk.com/en_us/blog/artificial-intelligence/splunk-agentic-ops-hackathon.html?utm_source=chatgpt.com "Announcing the Splunk Agentic Ops Hackathon"
[2]: https://help.splunk.com/splunk-cloud-platform/mcp-server-for-splunk-platform/about-mcp-server-for-splunk-platform?utm_source=chatgpt.com "About MCP Server for Splunk platform"
[3]: https://www.splunk.com/en_us/products/splunk-ai-assistant-for-spl.html?utm_source=chatgpt.com "Splunk AI Assistant for SPL"
