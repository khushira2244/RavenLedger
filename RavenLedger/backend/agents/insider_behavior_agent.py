from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT_DIR))

from backend.engines.insider_risk_engine import build_top_insider_users, save_users


class InsiderBehaviorAgent:
    name = "Insider Behavior Agent"

    def run(self, limit: int = 10, nrows: int = 100_000) -> dict:
        users = build_top_insider_users(limit=limit, nrows=nrows)
        save_users(users)

        return {
            "agent": self.name,
            "status": "completed",
            "records": len(users),
            "output": "top_insider_risk_users.json",
            "data": users,
        }