from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT_DIR))

from backend.engines.correlation_engine import correlate_cases, save_correlated_cases


class CorrelationAgent:
    name = "Correlation Agent"

    def run(self, limit: int = 10) -> dict:
        cases = correlate_cases(limit=limit)
        save_correlated_cases(cases)

        return {
            "agent": self.name,
            "status": "completed",
            "records": len(cases),
            "output": "ravenledger_correlated_cases.json",
            "data": cases,
        }