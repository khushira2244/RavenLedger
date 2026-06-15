from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT_DIR))

from backend.engines.policy_engine import apply_policies, save_policy_cases


class PolicyDecisionAgent:
    name = "Policy Decision Agent"

    def run(self, limit: int = 10) -> dict:
        cases = apply_policies(limit=limit)

        enriched_cases = []
        for rank, case in enumerate(cases, start=1):
            enriched = {
                **case,
                "rank": rank,
                "ranking_reason": build_ranking_reason(case, rank),
                "control_checklist": build_control_checklist(case),
                "spl_plain_english": (
                    "Searching BOTS v3 for live telemetry evidence that can be attached "
                    "to the high-risk ERP payment investigation."
                ),
            }
            enriched_cases.append(enriched)

        save_policy_cases(enriched_cases)

        return {
            "agent": self.name,
            "status": "completed",
            "records": len(enriched_cases),
            "output": "ravenledger_policy_cases.json",
            "data": enriched_cases,
        }

def build_ranking_reason(case: dict, rank: int) -> str:
    reasons = case.get("business_reasons", [])
    insider_score = int(case.get("insider_risk_score", 0))
    splunk_count = int(case.get("splunk_evidence_count", 0))

    reason_text = ", ".join(reasons[:4]) if reasons else "available risk evidence"

    return (
        f"Ranked #{rank} because this case combines {reason_text}, "
        f"insider-risk score {insider_score}, and {splunk_count} live Splunk telemetry events."
    )


def build_control_checklist(case: dict) -> list[dict]:
    business_reasons = " ".join(case.get("business_reasons", [])).lower()
    insider_score = int(case.get("insider_risk_score", 0))
    splunk_count = int(case.get("splunk_evidence_count", 0))
    combined_score = int(case.get("combined_risk_score", 0))

    controls = []

    controls.append({
        "control_id": "CTRL-001",
        "name": "Supplier Compliance Check",
        "status": "Failed" if "blacklisted" in business_reasons else "Passed",
        "reason": "Supplier is blacklisted" if "blacklisted" in business_reasons else "No blacklisted supplier signal found",
    })

    controls.append({
        "control_id": "CTRL-002",
        "name": "Procurement Threshold Bypass Check",
        "status": "Failed" if "split invoice" in business_reasons else "Passed",
        "reason": "Split invoice pattern detected" if "split invoice" in business_reasons else "No split invoice pattern detected",
    })

    controls.append({
        "control_id": "CTRL-003",
        "name": "Unusual Submission Time Check",
        "status": "Failed" if "late-night" in business_reasons or "late night" in business_reasons else "Passed",
        "reason": "Late-night invoice submission detected" if "late-night" in business_reasons or "late night" in business_reasons else "No unusual submission time signal found",
    })

    controls.append({
        "control_id": "CTRL-004",
        "name": "Insider Behavior Context Check",
        "status": "Failed" if insider_score >= 60 else "Warning" if insider_score >= 40 else "Passed",
        "reason": f"Insider risk score is {insider_score}",
    })

    controls.append({
        "control_id": "CTRL-005",
        "name": "Splunk Evidence Attachment",
        "status": "Passed" if splunk_count > 0 else "Failed",
        "reason": f"{splunk_count} live Splunk telemetry events attached",
    })

    controls.append({
        "control_id": "CTRL-006",
        "name": "Human Approval Requirement",
        "status": "Required" if combined_score >= 40 else "Not Required",
        "reason": f"Combined risk score is {combined_score}",
    })

    return controls