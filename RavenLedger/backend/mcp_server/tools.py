from typing import Dict, List, Any


SPLUNK_MCP_TOOLS: List[Dict[str, Any]] = [
    {
        "name": "assess_payment_release_risk",
        "title": "Assess Payment Release Risk",
        "business_effect": "Decides whether a payment should be held, reviewed, or released.",
        "input": {"case_id": "RL-CORR-0001"},
        "output": {
            "risk_score": 89,
            "severity": "Critical",
            "decision": "HOLD_PAYMENT",
            "reason": "Blacklisted supplier, split invoice pattern, insider-risk context, and live Splunk evidence attached.",
        },
        "used_by_agent": "RavenLedger Supervisor Agent",
        "status": "Live Adapter",
    },
    {
        "name": "rank_high_risk_payments",
        "title": "Rank High-Risk Payments",
        "business_effect": "Ranks payment cases so Finance and SOC know what to investigate first.",
        "input": {"limit": 10},
        "output": {
            "top_case": "RL-CORR-0001",
            "rank": 1,
            "risk_score": 89,
            "severity": "Critical",
        },
        "used_by_agent": "Business Risk Agent",
        "status": "Live Adapter",
    },
    {
        "name": "explain_payment_ranking_reason",
        "title": "Explain Payment Ranking Reason",
        "business_effect": "Explains why a payment case is ranked first.",
        "input": {"case_id": "RL-CORR-0001"},
        "output": {
            "ranking_reason": "Ranked #1 because it combines blacklisted supplier, split invoice pattern, insider-risk score, and live Splunk telemetry.",
        },
        "used_by_agent": "RavenLedger Supervisor Agent",
        "status": "Live Adapter",
    },
    {
        "name": "check_supplier_blacklist_status",
        "title": "Check Supplier Blacklist Status",
        "business_effect": "Checks whether the supplier is blacklisted or requires manual review.",
        "input": {"supplier_id": "67443fb8-81bd-45d5-b5a6-571c4fa5c35e"},
        "output": {
            "supplier_status": "Blacklisted",
            "risk_level": "High",
            "recommended_control": "Supplier manual compliance review required.",
        },
        "used_by_agent": "Business Risk Agent",
        "status": "Live Adapter",
    },
    {
        "name": "check_supplier_security_context",
        "title": "Check Supplier Security Context",
        "business_effect": "Uses Splunk telemetry to check suspicious context around the supplier or payment.",
        "input": {
            "case_id": "RL-CORR-0001",
            "supplier_id": "67443fb8-81bd-45d5-b5a6-571c4fa5c35e",
        },
        "output": {
            "splunk_evidence_count": 20,
            "evidence_summary": "Live Splunk telemetry is attached to the supplier/payment risk case.",
        },
        "used_by_agent": "Splunk Evidence Agent",
        "status": "Splunk MCP-ready Contract",
    },
    {
        "name": "detect_insider_payment_abuse",
        "title": "Detect Insider Payment Abuse",
        "business_effect": "Checks whether an internal user shows suspicious activity around a risky payment.",
        "input": {"case_id": "RL-CORR-0001", "user": "DTAA/ABB0272"},
        "output": {
            "insider_score": 80,
            "severity": "Critical",
            "signals": [
                "Very high total user activity",
                "Very high device connect/disconnect activity",
                "High HTTP/web activity",
                "High logon/logoff activity",
            ],
        },
        "used_by_agent": "Insider Behavior Agent",
        "status": "Live Adapter",
    },
    {
        "name": "retrieve_splunk_evidence_for_case",
        "title": "Retrieve Splunk Evidence For Case",
        "business_effect": "Retrieves SPL, evidence count, host, sourcetype, source, and timestamp fields.",
        "input": {"case_id": "RL-CORR-0001"},
        "output": {
            "spl": "index=botsv3 earliest=0 | table _time host sourcetype source | head 20",
            "evidence_count": 20,
            "fields": ["_time", "host", "sourcetype", "source"],
        },
        "used_by_agent": "Splunk Evidence Agent",
        "status": "Live Adapter",
    },
    {
        "name": "validate_payment_controls",
        "title": "Validate Payment Controls",
        "business_effect": "Shows which controls failed, passed, warned, or require human approval.",
        "input": {"case_id": "RL-CORR-0001"},
        "output": {
            "controls": [
                {"control_id": "CTRL-001", "name": "Supplier Compliance Check", "status": "Failed"},
                {"control_id": "CTRL-002", "name": "Procurement Threshold Bypass Check", "status": "Failed"},
                {"control_id": "CTRL-003", "name": "Unusual Submission Time Check", "status": "Failed"},
                {"control_id": "CTRL-004", "name": "Insider Behavior Context Check", "status": "Failed"},
                {"control_id": "CTRL-005", "name": "Splunk Evidence Attachment", "status": "Passed"},
                {"control_id": "CTRL-006", "name": "Human Approval Requirement", "status": "Required"},
            ]
        },
        "used_by_agent": "Policy Decision Agent",
        "status": "Live Adapter",
    },
    {
        "name": "recommend_business_action",
        "title": "Recommend Business Action",
        "business_effect": "Recommends the next human-approved business action.",
        "input": {"case_id": "RL-CORR-0001"},
        "output": {
            "recommended_action": "HOLD_PAYMENT",
            "escalation_targets": ["Finance", "SOC", "Compliance"],
            "human_approval_required": True,
        },
        "used_by_agent": "Policy Decision Agent + Human Action Agent",
        "status": "Live Adapter",
    },
    {
        "name": "log_human_decision_to_splunk",
        "title": "Log Human Decision To Splunk",
        "business_effect": "Records analyst-approved decision as audit evidence.",
        "input": {
            "case_id": "RL-CORR-0001",
            "actor": "Demo Analyst",
            "decision": "HOLD_PAYMENT",
            "reason": "Critical case with blacklisted supplier, insider-risk context, and Splunk evidence.",
        },
        "output": {
            "status": "logged",
            "audit_event_type": "human_payment_risk_decision",
            "destination": "Splunk audit log / RavenLedger action log",
        },
        "used_by_agent": "Human Action Agent",
        "status": "Splunk MCP-ready Contract",
    },
]


def list_tools() -> List[Dict[str, Any]]:
    return SPLUNK_MCP_TOOLS


def get_tool(tool_name: str) -> Dict[str, Any] | None:
    for tool in SPLUNK_MCP_TOOLS:
        if tool["name"] == tool_name:
            return tool
    return None


def simulate_tool(tool_name: str, payload: Dict[str, Any] | None = None) -> Dict[str, Any]:
    tool = get_tool(tool_name)

    if not tool:
        return {
            "status": "not_found",
            "message": f"Tool '{tool_name}' does not exist.",
        }

    return {
        "status": "simulated",
        "tool_name": tool["name"],
        "title": tool["title"],
        "business_effect": tool["business_effect"],
        "received_input": payload or tool["input"],
        "output": tool["output"],
        "used_by_agent": tool["used_by_agent"],
        "adapter_mode": tool["status"],
        "note": "This is a Splunk MCP-ready business tool contract mapped to RavenLedger's live Splunk REST/Python investigation workflow.",
    }