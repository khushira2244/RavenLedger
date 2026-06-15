from pathlib import Path
import sys

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT_DIR))

REPORTS_DIR = ROOT_DIR / "data" / "processed" / "reports"


router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("")
def list_reports():
    if not REPORTS_DIR.exists():
        return {
            "count": 0,
            "reports": [],
        }

    reports = sorted(REPORTS_DIR.glob("*.md"))

    return {
        "count": len(reports),
        "reports": [report.name for report in reports],
    }


@router.get("/{case_id}", response_class=PlainTextResponse)
def get_report(case_id: str):
    report_path = REPORTS_DIR / f"{case_id}.md"

    if not report_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Report not found for case: {case_id}",
        )

    with open(report_path, "r", encoding="utf-8") as file:
        return file.read()