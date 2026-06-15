from pathlib import Path
import sys
import json
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT_DIR))

from backend.agents.business_risk_agent import BusinessRiskAgent
from backend.agents.insider_behavior_agent import InsiderBehaviorAgent
from backend.agents.splunk_evidence_agent import SplunkEvidenceAgent
from backend.agents.correlation_agent import CorrelationAgent
from backend.agents.policy_decision_agent import PolicyDecisionAgent
from backend.agents.audit_report_agent import AuditReportAgent
from backend.agents.human_action_agent import HumanActionAgent
from backend.agents.investigation_modes import get_investigation_mode

AGENT_OUTPUT_PATH = ROOT_DIR / "data" / "processed" / "ravenledger_agent_result.json"


class RavenLedgerSupervisor:
    name = "RavenLedger Supervisor Agent"

    def __init__(self):
        self.business_agent = BusinessRiskAgent()
        self.insider_agent = InsiderBehaviorAgent()
        self.splunk_agent = SplunkEvidenceAgent()
        self.correlation_agent = CorrelationAgent()
        self.policy_agent = PolicyDecisionAgent()
        self.audit_agent = AuditReportAgent()
        self.human_action_agent = HumanActionAgent()

    def run_investigation(self, limit: int = 10, mode: str = "full") -> dict:
        started_at = datetime.now(timezone.utc).isoformat()
        investigation_focus = get_investigation_mode(mode)

        business_result = self.business_agent.run(limit=limit)
        insider_result = self.insider_agent.run(limit=limit)
        splunk_result = self.splunk_agent.run(limit=20)
        correlation_result = self.correlation_agent.run(limit=limit)
        policy_result = self.policy_agent.run(limit=limit)
        audit_result = self.audit_agent.run(limit=limit)

        cases = policy_result.get("data", [])
        top_case = cases[0] if cases else None

        result = {
            "agent_name": self.name,
            "agent_version": "v2_multi_agent",
            "status": "completed",
            "selected_mode": investigation_focus["mode"],
            "investigation_focus": investigation_focus,
            "started_at": started_at,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "user_prompt": investigation_focus["prompt"],
            "splunk_mode": "Live Splunk REST/Python adapter",
            "mcp_status": "MCP-ready adapter architecture; REST adapter used for stable demo.",
            "agents": [
                summarize_agent_result(business_result, investigation_focus),
                summarize_agent_result(insider_result, investigation_focus),
                summarize_agent_result(splunk_result, investigation_focus),
                summarize_agent_result(correlation_result, investigation_focus),
                summarize_agent_result(policy_result, investigation_focus),
                summarize_agent_result(audit_result, investigation_focus),
                {
                    "agent": "Human Action Agent",
                    "status": "ready",
                    "records": 0,
                    "output": "action_log.json",
                    "primary_for_selected_mode": "Human Action Agent" in investigation_focus["primary_agents"],
                },
            ],
            "top_case": enrich_top_case_for_mode(top_case, investigation_focus),
            "summary": build_supervisor_summary(top_case, investigation_focus),
            "report_paths": audit_result.get("data", []),
        }

        save_supervisor_result(result)
        return result


def summarize_agent_result(result: dict, investigation_focus: dict) -> dict:
    agent_name = result.get("agent")

    return {
        "agent": agent_name,
        "status": result.get("status"),
        "records": result.get("records"),
        "output": result.get("output"),
        "primary_for_selected_mode": agent_name in investigation_focus["primary_agents"],
    }


def enrich_top_case_for_mode(top_case: dict | None, investigation_focus: dict) -> dict | None:
    if not top_case:
        return None

    return {
        **top_case,
        "selected_mode": investigation_focus["mode"],
        "investigation_focus_label": investigation_focus["label"],
        "investigation_focus_description": investigation_focus["description"],
        "focus_fields": investigation_focus["focus_fields"],
        "recommended_view": investigation_focus["recommended_view"],
    }


def build_supervisor_summary(top_case: dict | None, investigation_focus: dict) -> str:
    if not top_case:
        return "No investigation case was generated."

    return (
        f"RavenLedger ran a {investigation_focus.get('label')} and ranked "
        f"{top_case.get('correlation_case_id')} as the priority case. "
        f"Invoice {top_case.get('invoice_id')} has combined risk score "
        f"{top_case.get('combined_risk_score')}/100 with severity {top_case.get('severity')}. "
        f"The supervisor coordinated business risk, insider behavior, live Splunk evidence, "
        f"correlation, policy controls, and audit reporting. "
        f"Recommended action: {top_case.get('final_recommended_action')}"
    )


def save_supervisor_result(result: dict) -> None:
    AGENT_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with open(AGENT_OUTPUT_PATH, "w", encoding="utf-8") as file:
        json.dump(result, file, indent=2)


if __name__ == "__main__":
    supervisor = RavenLedgerSupervisor()
    result = supervisor.run_investigation(limit=10, mode="full")

    print("RavenLedger Multi-Agent Supervisor")
    print("=" * 70)
    print("Status:", result["status"])
    print("Selected Mode:", result["selected_mode"])
    print("Investigation Focus:", result["investigation_focus"]["label"])
    print("Prompt:", result["user_prompt"])
    print("Splunk Mode:", result["splunk_mode"])
    print("MCP Status:", result["mcp_status"])

    print("\nSpecialist Agents:")
    for agent in result["agents"]:
        primary_marker = "PRIMARY" if agent.get("primary_for_selected_mode") else "supporting"
        print(
            f"- {agent['agent']} | {agent['status']} | "
            f"records={agent['records']} | output={agent['output']} | {primary_marker}"
        )

    top_case = result.get("top_case")

    if top_case:
        print("\nTop Risk Queue")
        print("Rank:", top_case.get("rank"))
        print("Case:", top_case.get("correlation_case_id"))
        print("Invoice:", top_case.get("invoice_id"))
        print("Score:", top_case.get("combined_risk_score"))
        print("Severity:", top_case.get("severity"))

        print("\nWhy this case first?")
        print(top_case.get("ranking_reason"))

        print("\nControls Checklist:")
        for control in top_case.get("control_checklist", []):
            print(
                f"- {control['control_id']} | {control['name']} | "
                f"{control['status']} | {control['reason']}"
            )

        print("\nSplunk Evidence:")
        print("SPL:")
        print(top_case.get("splunk_spl"))
        print("Plain English:")
        print(top_case.get("spl_plain_english"))
        print("Evidence Count:", top_case.get("splunk_evidence_count"))

        print("\nFinal Action:")
        print(top_case.get("final_recommended_action"))

    print("\nSupervisor Summary:")
    print(result["summary"])

    print("\nSaved output:")
    print(AGENT_OUTPUT_PATH)