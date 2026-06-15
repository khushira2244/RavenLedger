from pathlib import Path
import sys
import json

from fastapi import APIRouter

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT_DIR))

from backend.agents.ravenledger_supervisor import RavenLedgerSupervisor
from backend.agents.investigation_modes import INVESTIGATION_MODES


router = APIRouter(prefix="/agent", tags=["Agent"])

AGENT_RESULT_PATH = ROOT_DIR / "data" / "processed" / "ravenledger_agent_result.json"


def run_investigation_handler(limit: int = 10, mode: str = "full"):
    supervisor = RavenLedgerSupervisor()
    result = supervisor.run_investigation(limit=limit, mode=mode)
    return result


def latest_agent_result_handler():
    if not AGENT_RESULT_PATH.exists():
        return {
            "status": "not_found",
            "message": "No agent result found. Run /agent/run-investigation first.",
        }

    with open(AGENT_RESULT_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


@router.get("/modes")
def get_investigation_modes():
    return {
        "count": len(INVESTIGATION_MODES),
        "modes": list(INVESTIGATION_MODES.values()),
    }


@router.get("/modes/")
def get_investigation_modes_slash():
    return get_investigation_modes()


@router.get("/run-investigation")
def run_investigation(limit: int = 10, mode: str = "full"):
    return run_investigation_handler(limit=limit, mode=mode)


@router.get("/run-investigation/")
def run_investigation_slash(limit: int = 10, mode: str = "full"):
    return run_investigation_handler(limit=limit, mode=mode)


@router.get("/latest-result")
def latest_agent_result():
    return latest_agent_result_handler()


@router.get("/latest-result/")
def latest_agent_result_slash():
    return latest_agent_result_handler()