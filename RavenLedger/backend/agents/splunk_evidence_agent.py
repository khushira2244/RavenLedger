from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT_DIR))

from backend.engines.splunk_evidence_engine import collect_splunk_evidence, save_evidence


class SplunkEvidenceAgent:
    name = "Splunk Evidence Agent"

    def run(self, query_name: str = "sample_security_events", limit: int = 20) -> dict:
        package = collect_splunk_evidence(
            query_name=query_name,
            limit=limit,
        )

        package["spl_plain_english"] = (
            "Searching BOTS v3 for live telemetry evidence that can be attached "
            "to the high-risk ERP payment investigation."
        )
        package["splunk_access_mode"] = "REST/Python live adapter"
        package["mcp_ready"] = True

        save_evidence(package)

        return {
            "agent": self.name,
            "status": "completed",
            "records": package.get("evidence_count", 0),
            "output": "splunk_evidence_sample.json",
            "data": package,
        }