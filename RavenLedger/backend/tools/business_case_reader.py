from pathlib import Path
import json


ROOT_DIR = Path(__file__).resolve().parents[2]
TOP_CASES_PATH = ROOT_DIR / "data" / "processed" / "top_business_risk_cases.json"


def load_top_business_cases() -> list[dict]:
    if not TOP_CASES_PATH.exists():
        raise FileNotFoundError(
            f"Missing {TOP_CASES_PATH}. Run business_risk_engine.py first."
        )

    with open(TOP_CASES_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def get_case_by_id(case_id: str) -> dict | None:
    cases = load_top_business_cases()

    for case in cases:
        if case.get("case_id") == case_id:
            return case

    return None


if __name__ == "__main__":
    cases = load_top_business_cases()

    print("Loaded business risk cases:", len(cases))
    print("=" * 60)

    for case in cases[:5]:
        print(
            case["case_id"],
            "|",
            case["invoice_id"],
            "|",
            case["risk_score"],
            "|",
            case["severity"],
        )