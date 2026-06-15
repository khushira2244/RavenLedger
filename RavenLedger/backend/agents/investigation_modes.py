INVESTIGATION_MODES = {
    "full": {
        "mode": "full",
        "label": "Full Multi-Agent Investigation",
        "description": (
            "Runs all RavenLedger agents across business fraud, insider behavior, "
            "live Splunk evidence, policy controls, audit reporting, and human action readiness."
        ),
        "primary_agents": [
            "Business Risk Agent",
            "Insider Behavior Agent",
            "Splunk Evidence Agent",
            "Correlation Agent",
            "Policy Decision Agent",
            "Audit Report Agent",
            "Human Action Agent",
        ],
        "focus_fields": [
            "business_reasons",
            "insider_signals",
            "splunk_evidence_sample",
            "control_checklist",
            "final_recommended_action",
        ],
        "recommended_view": "command_center",
        "prompt": "Investigate high-risk ERP payments using the full multi-agent workflow.",
    },
    "payment_fraud": {
        "mode": "payment_fraud",
        "label": "Payment Fraud Investigation",
        "description": (
            "Focuses on invoice fraud, supplier risk, split invoice behavior, "
            "late-night submission, invoice amount, and payment hold recommendation."
        ),
        "primary_agents": [
            "Business Risk Agent",
            "Correlation Agent",
            "Policy Decision Agent",
        ],
        "focus_fields": [
            "business_reasons",
            "business_risk_score",
            "supplier_id",
            "invoice_amount",
            "business_recommended_next_step",
        ],
        "recommended_view": "investigation_case",
        "prompt": "Investigate payment fraud signals for high-risk ERP invoices.",
    },
    "insider_behavior": {
        "mode": "insider_behavior",
        "label": "Insider Behavior Investigation",
        "description": (
            "Focuses on suspicious users, logon/device/http activity, insider score, "
            "and user behavior signals attached to the payment-risk case."
        ),
        "primary_agents": [
            "Insider Behavior Agent",
            "Correlation Agent",
            "Policy Decision Agent",
        ],
        "focus_fields": [
            "insider_user",
            "insider_risk_score",
            "insider_signals",
            "insider_severity",
        ],
        "recommended_view": "investigation_case",
        "prompt": "Investigate insider behavior linked to risky ERP payment activity.",
    },
    "splunk_evidence": {
        "mode": "splunk_evidence",
        "label": "Splunk Security Evidence Investigation",
        "description": (
            "Focuses on generated SPL, live BOTS v3 telemetry, evidence count, "
            "hosts, sourcetypes, sources, and Splunk access mode."
        ),
        "primary_agents": [
            "Splunk Evidence Agent",
            "Correlation Agent",
        ],
        "focus_fields": [
            "splunk_spl",
            "spl_plain_english",
            "splunk_evidence_count",
            "splunk_evidence_sample",
            "splunk_mode",
        ],
        "recommended_view": "splunk_evidence",
        "prompt": "Investigate live Splunk security evidence for the risky payment case.",
    },
    "policy_audit": {
        "mode": "policy_audit",
        "label": "Policy & Audit Investigation",
        "description": (
            "Focuses on named controls, policy violations, escalation targets, "
            "human approval, recommended action, and audit report generation."
        ),
        "primary_agents": [
            "Policy Decision Agent",
            "Audit Report Agent",
            "Human Action Agent",
        ],
        "focus_fields": [
            "control_checklist",
            "policy_violations",
            "controls_triggered",
            "escalation_targets",
            "final_recommended_action",
            "human_approval_required",
        ],
        "recommended_view": "audit_action",
        "prompt": "Investigate policy violations and audit response for high-risk payments.",
    },
}


def get_investigation_mode(mode: str | None) -> dict:
    normalized_mode = (mode or "full").strip().lower()

    if normalized_mode not in INVESTIGATION_MODES:
        normalized_mode = "full"

    return INVESTIGATION_MODES[normalized_mode]