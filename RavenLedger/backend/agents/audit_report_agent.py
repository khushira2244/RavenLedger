from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT_DIR))

from backend.engines.audit_report_engine import generate_reports


class AuditReportAgent:
    name = "Audit Report Agent"

    def run(self, limit: int = 10) -> dict:
        report_paths = generate_reports(limit=limit)

        return {
            "agent": self.name,
            "status": "completed",
            "records": len(report_paths),
            "output": "data/processed/reports/*.md",
            "data": [str(path) for path in report_paths],
        }


if __name__ == "__main__":
    agent = AuditReportAgent()
    result = agent.run(limit=10)

    print("RavenLedger Audit Report Agent")
    print("=" * 70)
    print("Status:", result["status"])
    print("Records:", result["records"])
    print("Output:", result["output"])

    for path in result["data"][:10]:
        print("Generated:", path)