from pathlib import Path
import sys
import json

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT_DIR))

from backend.tools.splunk_query_templates import render_query
from backend.tools.splunk_search_adapter import run_template_search


OUTPUT_PATH = ROOT_DIR / "data" / "processed" / "splunk_evidence_sample.json"


def normalize_splunk_event(row: dict, index: int) -> dict:
    return {
        "evidence_id": f"SPL-EVID-{index:04d}",
        "time": row.get("_time", ""),
        "host": row.get("host", ""),
        "sourcetype": row.get("sourcetype", ""),
        "source": row.get("source", ""),
        "raw": row,
    }


def collect_splunk_evidence(
    query_name: str = "sample_security_events",
    limit: int = 20,
    **kwargs
) -> dict:
    spl = render_query(query_name, **kwargs)
    rows = run_template_search(query_name, limit=limit, **kwargs)

    evidence = [
        normalize_splunk_event(row, index)
        for index, row in enumerate(rows, start=1)
    ]

    return {
        "evidence_package_id": "SPL-PKG-0001",
        "query_name": query_name,
        "spl": spl,
        "evidence_count": len(evidence),
        "evidence": evidence,
        "source_layer": "splunk_botsv3_live_search",
    }


def save_evidence(package: dict) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as file:
        json.dump(package, file, indent=2)


if __name__ == "__main__":
    package = collect_splunk_evidence(
        query_name="sample_security_events",
        limit=20,
    )

    save_evidence(package)

    print("RavenLedger Splunk Evidence Engine")
    print("=" * 70)
    print("Query:", package["query_name"])
    print("Evidence count:", package["evidence_count"])
    print("Source layer:", package["source_layer"])
    print("\nSample evidence:")

    for item in package["evidence"][:5]:
        print(
            item["evidence_id"],
            "|",
            item["time"],
            "|",
            item["host"],
            "|",
            item["sourcetype"],
        )

    print("\nSaved output:")
    print(OUTPUT_PATH)