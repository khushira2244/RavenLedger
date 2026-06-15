from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT_DIR))

from backend.engines.business_risk_engine import build_top_risk_cases, save_cases


class BusinessRiskAgent:
    name = "Business Risk Agent"

    def run(self, limit: int = 10) -> dict:
        cases = build_top_risk_cases(limit=limit)
        save_cases(cases)

        return {
            "agent": self.name,
            "status": "completed",
            "records": len(cases),
            "output": "top_business_risk_cases.json",
            "data": cases,
        }