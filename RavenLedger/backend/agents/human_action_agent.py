from pathlib import Path
import sys
import json
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT_DIR))

ACTION_LOG_PATH = ROOT_DIR / "data" / "processed" / "action_log.json"


class HumanActionAgent:
    name = "Human Action Agent"

    def run(
        self,
        case_id: str,
        action: str,
        actor: str = "Demo Analyst",
        reason: str = "",
    ) -> dict:
        action_record = {
            "case_id": case_id,
            "action": action,
            "status": "Pending Human Approval",
            "actor": actor,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "reason": reason or f"{action} selected for {case_id}",
            "source": "RavenLedger human-in-loop simulation",
        }

        logs = load_action_log()
        logs.append(action_record)
        save_action_log(logs)

        return {
            "agent": self.name,
            "status": "completed",
            "records": 1,
            "output": "action_log.json",
            "data": action_record,
        }


def load_action_log() -> list[dict]:
    if not ACTION_LOG_PATH.exists():
        return []

    with open(ACTION_LOG_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def save_action_log(logs: list[dict]) -> None:
    ACTION_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)

    with open(ACTION_LOG_PATH, "w", encoding="utf-8") as file:
        json.dump(logs, file, indent=2)