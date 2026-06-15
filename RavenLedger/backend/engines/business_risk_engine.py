from pathlib import Path
import sys
import json
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT_DIR))

from backend.tools.data_loader import load_business_risk_data


OUTPUT_PATH = ROOT_DIR / "data" / "processed" / "top_business_risk_cases.json"


def safe_number(value, default=0):
    if pd.isna(value):
        return default
    return value


def safe_text(value, default=""):
    if pd.isna(value):
        return default
    return str(value)


def severity_from_score(score: int) -> str:
    if score >= 80:
        return "Critical"
    if score >= 60:
        return "High"
    if score >= 35:
        return "Medium"
    return "Low"


def recommended_action(score: int, reasons: list[str]) -> str:
    joined = " ".join(reasons).lower()

    if score >= 80:
        return "Block auto-payment, escalate to Finance + Audit, and require manual supplier verification."

    if "blacklisted" in joined:
        return "Hold payment and send supplier for manual compliance review."

    if "duplicate" in joined:
        return "Block duplicate payment path and send to procurement audit."

    if "split invoice" in joined:
        return "Escalate to procurement audit for possible threshold bypass."

    if score >= 60:
        return "Escalate to finance analyst for review before approval."

    if score >= 35:
        return "Mark for analyst review and monitor related supplier activity."

    return "Monitor only."


def score_invoice(row, index: int) -> dict:
    score = 0
    reasons = []

    is_fraud = int(safe_number(row.get("is_fraud"), 0))
    blacklisted = int(safe_number(row.get("blacklisted_flag"), 0))
    duplicate_flag = int(safe_number(row.get("duplicate_invoice_flag"), 0))
    split_flag = int(safe_number(row.get("split_invoice_flag"), 0))
    late_night_flag = int(safe_number(row.get("late_night_submission_flag"), 0))
    image_tamper_flag = int(safe_number(row.get("image_tamper_flag"), 0))

    supplier_risk = float(safe_number(row.get("supplier_risk_score"), 0))
    zscore = float(safe_number(row.get("invoice_amount_zscore"), 0))

    if is_fraud == 1:
        score += 30
        reasons.append("Fraud label present")

    if blacklisted == 1:
        score += 20
        reasons.append("Supplier is blacklisted")

    if supplier_risk >= 0.7:
        score += 15
        reasons.append(f"High supplier risk score: {supplier_risk:.2f}")

    if duplicate_flag == 1:
        score += 15
        reasons.append("Duplicate invoice flag detected")

    if split_flag == 1:
        score += 15
        reasons.append("Split invoice pattern detected")

    if late_night_flag == 1:
        score += 10
        reasons.append("Late-night invoice submission detected")

    if image_tamper_flag == 1:
        score += 15
        reasons.append("Invoice image tamper signal detected")

    if zscore >= 2:
        score += 10
        reasons.append(f"Invoice amount is statistically abnormal: z-score {zscore:.2f}")

    score = min(score, 100)
    severity = severity_from_score(score)

    return {
        "case_id": f"RL-CASE-{index:04d}",
        "invoice_id": safe_text(row.get("invoice_id")),
        "supplier_id": safe_text(row.get("supplier_id")),
        "department_id": safe_text(row.get("department_id")),
        "invoice_date": safe_text(row.get("invoice_date")),
        "invoice_amount": float(safe_number(row.get("invoice_amount"), 0)),
        "currency": safe_text(row.get("currency")),
        "payment_terms": safe_text(row.get("payment_terms")),
        "invoice_type": safe_text(row.get("invoice_type")),
        "supplier_country": safe_text(row.get("supplier_country")),
        "supplier_risk_score": supplier_risk,
        "blacklisted_flag": blacklisted,
        "fraud_type": safe_text(row.get("fraud_type"), "UNKNOWN"),
        "fraud_tags": safe_text(row.get("fraud_tags")),
        "explanations": safe_text(row.get("explanations")),
        "risk_score": score,
        "severity": severity,
        "reasons": reasons,
        "recommended_next_step": recommended_action(score, reasons),
        "source_layer": "procurement_invoice_fraud_dataset",
    }


def build_top_risk_cases(limit: int = 10) -> list[dict]:
    df = load_business_risk_data()

    cases = []
    for idx, (_, row) in enumerate(df.iterrows(), start=1):
        case = score_invoice(row, idx)
        cases.append(case)

    cases = sorted(cases, key=lambda item: item["risk_score"], reverse=True)
    return cases[:limit]


def save_cases(cases: list[dict]) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as file:
        json.dump(cases, file, indent=2)


if __name__ == "__main__":
    top_cases = build_top_risk_cases(limit=10)
    save_cases(top_cases)

    print("RavenLedger Business Risk Engine v2")
    print("=" * 70)

    for case in top_cases:
        print(f"\n{case['case_id']} | {case['invoice_id']} | Score: {case['risk_score']} | {case['severity']}")
        print(f"Supplier: {case['supplier_id']}")
        print(f"Department: {case['department_id']}")
        print(f"Amount: {case['invoice_amount']} {case['currency']}")
        print(f"Fraud Type: {case['fraud_type']}")
        print("Reasons:")
        for reason in case["reasons"]:
            print(f" - {reason}")
        print(f"Action: {case['recommended_next_step']}")

    print("\nSaved output:")
    print(OUTPUT_PATH)