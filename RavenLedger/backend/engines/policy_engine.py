from pathlib import Path
import sys
import json

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT_DIR))

CORRELATED_CASES_PATH = ROOT_DIR / "data" / "processed" / "ravenledger_correlated_cases.json"
OUTPUT_PATH = ROOT_DIR / "data" / "processed" / "ravenledger_policy_cases.json"


def load_correlated_cases() -> list[dict]:
    if not CORRELATED_CASES_PATH.exists():
        raise FileNotFoundError(
            f"Missing {CORRELATED_CASES_PATH}. Run correlation_engine.py first."
        )

    with open(CORRELATED_CASES_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def evaluate_policy(case: dict) -> dict:
    violations = []
    escalation_targets = []
    controls_triggered = []

    combined_score = int(case.get("combined_risk_score", 0))
    business_score = int(case.get("business_risk_score", 0))
    insider_score = int(case.get("insider_risk_score", 0))
    splunk_count = int(case.get("splunk_evidence_count", 0))

    business_reasons = " ".join(case.get("business_reasons", [])).lower()
    insider_signals = " ".join(case.get("insider_signals", [])).lower()

    # Business policy checks
    if "blacklisted" in business_reasons:
        violations.append("Supplier compliance policy violation: blacklisted supplier involved.")
        controls_triggered.append("Supplier manual compliance review required.")
        escalation_targets.append("Compliance Team")

    if "duplicate invoice" in business_reasons:
        violations.append("Payment control violation: duplicate invoice signal detected.")
        controls_triggered.append("Block duplicate payment path.")
        escalation_targets.append("Accounts Payable")

    if "split invoice" in business_reasons:
        violations.append("Procurement policy violation: split invoice pattern suggests threshold bypass risk.")
        controls_triggered.append("Procurement audit review required.")
        escalation_targets.append("Procurement Audit")

    if "late-night" in business_reasons or "late night" in business_reasons:
        violations.append("Operational anomaly: invoice submitted during unusual time window.")
        controls_triggered.append("Require analyst review before release.")

    # Insider policy checks
    if insider_score >= 60:
        violations.append("Insider risk policy warning: elevated suspicious user activity.")
        controls_triggered.append("Review user access/session behavior.")
        escalation_targets.append("Security Operations Center")

    elif insider_score >= 40:
        violations.append("Insider risk observation: medium user behavior risk.")
        controls_triggered.append("Attach user activity context to investigation.")

    # Splunk evidence policy
    if splunk_count > 0:
        controls_triggered.append("Attach live Splunk telemetry evidence to the case.")
        escalation_targets.append("SOC Analyst")

    # Combined risk policy
    if combined_score >= 85:
        action = "Hold payment immediately, escalate to Finance, SOC, Compliance, and generate audit report."
        human_approval_required = True
    elif combined_score >= 65:
        action = "Hold payment for manual review and escalate to Finance + relevant risk owners."
        human_approval_required = True
    elif combined_score >= 40:
        action = "Route case to analyst queue for review before approval."
        human_approval_required = True
    else:
        action = "Monitor only; no immediate blocking action required."
        human_approval_required = False

    # Deduplicate escalation targets
    escalation_targets = sorted(set(escalation_targets))

    return {
        **case,
        "policy_violations": violations,
        "controls_triggered": controls_triggered,
        "human_approval_required": human_approval_required,
        "escalation_targets": escalation_targets,
        "final_recommended_action": action,
        "policy_engine_version": "v1_rule_based_enterprise_controls",
    }


def apply_policies(limit: int | None = None) -> list[dict]:
    cases = load_correlated_cases()

    if limit:
        cases = cases[:limit]

    return [evaluate_policy(case) for case in cases]


def save_policy_cases(cases: list[dict]) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as file:
        json.dump(cases, file, indent=2)


if __name__ == "__main__":
    policy_cases = apply_policies()
    save_policy_cases(policy_cases)

    print("RavenLedger Policy Engine")
    print("=" * 70)

    for case in policy_cases[:10]:
        print(
            f"\n{case['correlation_case_id']} | {case['invoice_id']} | "
            f"Score: {case['combined_risk_score']} | {case['severity']}"
        )

        print("Policy Violations:")
        for violation in case["policy_violations"]:
            print(f" - {violation}")

        print("Controls Triggered:")
        for control in case["controls_triggered"]:
            print(f" - {control}")

        print("Escalation Targets:", ", ".join(case["escalation_targets"]))
        print("Human Approval Required:", case["human_approval_required"])
        print("Final Action:", case["final_recommended_action"])

    print("\nSaved output:")
    print(OUTPUT_PATH)