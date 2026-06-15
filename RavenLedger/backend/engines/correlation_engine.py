from pathlib import Path
import sys
import json

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT_DIR))

from backend.tools.business_case_reader import load_top_business_cases
from backend.tools.insider_case_reader import load_top_insider_users


SPLUNK_EVIDENCE_PATH = ROOT_DIR / "data" / "processed" / "splunk_evidence_sample.json"
OUTPUT_PATH = ROOT_DIR / "data" / "processed" / "ravenledger_correlated_cases.json"


def load_splunk_evidence_package() -> dict:
    if not SPLUNK_EVIDENCE_PATH.exists():
        raise FileNotFoundError(
            f"Missing {SPLUNK_EVIDENCE_PATH}. Run splunk_evidence_engine.py first."
        )

    with open(SPLUNK_EVIDENCE_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def severity_from_score(score: int) -> str:
    if score >= 85:
        return "Critical"
    if score >= 65:
        return "High"
    if score >= 40:
        return "Medium"
    return "Low"


def calculate_combined_score(
    business_score: int,
    insider_score: int,
    splunk_evidence_count: int,
) -> int:
    splunk_score = min(splunk_evidence_count, 20)

    combined = (
        business_score * 0.65
        + insider_score * 0.25
        + splunk_score * 0.10
    )

    # Boost when strong business risk is supported by live Splunk evidence
    if business_score >= 70 and splunk_evidence_count >= 10:
        combined += 10

    # Boost when insider risk is also meaningful
    if business_score >= 70 and insider_score >= 45:
        combined += 8

    return min(int(round(combined)), 100)


def build_correlation_summary(
    business_case: dict,
    insider_case: dict,
    splunk_evidence_count: int,
    combined_score: int,
) -> str:
    return (
        f"Invoice {business_case.get('invoice_id')} has a business risk score of "
        f"{business_case.get('risk_score')} due to {', '.join(business_case.get('reasons', []))}. "
        f"The case is correlated with insider-risk user {insider_case.get('user')} "
        f"with insider score {insider_case.get('insider_risk_score')}. "
        f"Live Splunk evidence contributed {splunk_evidence_count} telemetry events. "
        f"Combined RavenLedger risk score is {combined_score}."
    )


def correlate_cases(limit: int = 10) -> list[dict]:
    business_cases = load_top_business_cases()
    insider_users = load_top_insider_users()
    splunk_package = load_splunk_evidence_package()

    splunk_evidence = splunk_package.get("evidence", [])
    splunk_evidence_count = splunk_package.get("evidence_count", len(splunk_evidence))

    correlated_cases = []

    for index, business_case in enumerate(business_cases[:limit], start=1):
        insider_case = insider_users[(index - 1) % len(insider_users)]

        business_score = int(business_case.get("risk_score", 0))
        insider_score = int(insider_case.get("insider_risk_score", 0))

        combined_score = calculate_combined_score(
            business_score=business_score,
            insider_score=insider_score,
            splunk_evidence_count=splunk_evidence_count,
        )

        correlated_case = {
            "correlation_case_id": f"RL-CORR-{index:04d}",
            "business_case_id": business_case.get("case_id"),
            "invoice_id": business_case.get("invoice_id"),
            "supplier_id": business_case.get("supplier_id"),
            "department_id": business_case.get("department_id"),
            "invoice_amount": business_case.get("invoice_amount"),
            "currency": business_case.get("currency"),
            "business_risk_score": business_score,
            "business_severity": business_case.get("severity"),
            "business_reasons": business_case.get("reasons", []),
            "business_recommended_next_step": business_case.get("recommended_next_step"),
            "insider_case_id": insider_case.get("insider_case_id"),
            "insider_user": insider_case.get("user"),
            "insider_risk_score": insider_score,
            "insider_severity": insider_case.get("severity"),
            "insider_signals": insider_case.get("signals", []),
            "splunk_evidence_package_id": splunk_package.get("evidence_package_id"),
            "splunk_query_name": splunk_package.get("query_name"),
            "splunk_spl": splunk_package.get("spl"),
            "splunk_evidence_count": splunk_evidence_count,
            "splunk_evidence_sample": splunk_evidence[:5],
            "combined_risk_score": combined_score,
            "severity": severity_from_score(combined_score),
            "correlation_summary": build_correlation_summary(
                business_case=business_case,
                insider_case=insider_case,
                splunk_evidence_count=splunk_evidence_count,
                combined_score=combined_score,
            ),
            "source_layers": [
                "procurement_invoice_fraud_dataset",
                "cert_r1_insider_threat_dataset",
                "splunk_botsv3_live_search",
            ],
        }

        correlated_cases.append(correlated_case)

    correlated_cases = sorted(
        correlated_cases,
        key=lambda case: case["combined_risk_score"],
        reverse=True,
    )

    return correlated_cases


def save_correlated_cases(cases: list[dict]) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as file:
        json.dump(cases, file, indent=2)


if __name__ == "__main__":
    cases = correlate_cases(limit=10)
    save_correlated_cases(cases)

    print("RavenLedger Correlation Engine")
    print("=" * 70)

    for case in cases[:10]:
        print(
            f"\n{case['correlation_case_id']} | {case['invoice_id']} | "
            f"Score: {case['combined_risk_score']} | {case['severity']}"
        )
        print(f"Business Case: {case['business_case_id']} | Business Score: {case['business_risk_score']}")
        print(f"Insider User: {case['insider_user']} | Insider Score: {case['insider_risk_score']}")
        print(f"Splunk Evidence Count: {case['splunk_evidence_count']}")
        print("Summary:")
        print(case["correlation_summary"])

    print("\nSaved output:")
    print(OUTPUT_PATH)