# Splunk MCP-ready Business Control Surface

RavenLedger currently uses a live Splunk REST/Python adapter to run SPL against Splunk Enterprise and retrieve BOTS v3 telemetry.

This extension defines a Splunk MCP-ready Business Control Surface: 10 agent-callable business tool contracts that convert Splunk evidence into payment release decisions, supplier checks, insider-risk correlation, control validation, action recommendation, and human decision logging.

## Current mode

- Live Splunk REST/Python adapter
- Generated SPL shown in UI
- BOTS v3 evidence attached to RavenLedger cases

## Target mode

- Official Splunk MCP Server mapping
- Agent-callable Splunk business tools
- Standard tool interface for payment risk investigation

## Tools

1. assess_payment_release_risk
2. rank_high_risk_payments
3. explain_payment_ranking_reason
4. check_supplier_blacklist_status
5. check_supplier_security_context
6. detect_insider_payment_abuse
7. retrieve_splunk_evidence_for_case
8. validate_payment_controls
9. recommend_business_action
10. log_human_decision_to_splunk