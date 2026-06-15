from pathlib import Path
import sys
import json

from fastapi import APIRouter, HTTPException

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT_DIR))

POLICY_CASES_PATH = ROOT_DIR / "data" / "processed" / "ravenledger_policy_cases.json"

router = APIRouter(prefix="/cases", tags=["Cases"])


def load_cases() -> list[dict]:
    if not POLICY_CASES_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="Policy cases not found. Run the supervisor agent first.",
        )

    with open(POLICY_CASES_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


@router.get("")
def get_cases():
    cases = load_cases()

    return {
        "count": len(cases),
        "cases": cases,
    }


@router.get("/top-risk")
def get_top_risk_cases(limit: int = 10):
    cases = load_cases()

    sorted_cases = sorted(
        cases,
        key=lambda case: case.get("combined_risk_score", 0),
        reverse=True,
    )

    return {
        "count": min(limit, len(sorted_cases)),
        "cases": sorted_cases[:limit],
    }


@router.get("/{case_id}")
def get_case_by_id(case_id: str):
    cases = load_cases()

    for case in cases:
        if case.get("correlation_case_id") == case_id:
            return case

    raise HTTPException(
        status_code=404,
        detail=f"Case not found: {case_id}",
    )


@router.get("/{case_id}/summary")
def get_case_summary(case_id: str):
    cases = load_cases()

    for case in cases:
        if case.get("correlation_case_id") == case_id:
            return {
                "case_id": case.get("correlation_case_id"),
                "invoice_id": case.get("invoice_id"),
                "rank": case.get("rank"),
                "ranking_reason": case.get("ranking_reason"),
                "combined_risk_score": case.get("combined_risk_score"),
                "severity": case.get("severity"),
                "splunk_evidence_count": case.get("splunk_evidence_count"),
                "human_approval_required": case.get("human_approval_required"),
                "final_recommended_action": case.get("final_recommended_action"),
                "control_checklist": case.get("control_checklist", []),
            }

    raise HTTPException(
        status_code=404,
        detail=f"Case not found: {case_id}",
    )