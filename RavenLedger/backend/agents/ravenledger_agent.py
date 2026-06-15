from pathlib import Path
import sys
import time
import os
import requests
import urllib3
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT_DIR))

load_dotenv(ROOT_DIR / ".env")

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

from backend.tools.splunk_query_templates import render_query


SPLUNK_HOST = os.getenv("SPLUNK_HOST", "https://localhost:8089")
SPLUNK_USERNAME = os.getenv("SPLUNK_USERNAME", "admin")
SPLUNK_PASSWORD = os.getenv("SPLUNK_PASSWORD", "")


class SplunkSearchError(Exception):
    pass


def run_splunk_search(
    spl: str,
    max_wait_seconds: int = 30,
    count: int = 20,
) -> list[dict]:
    if not SPLUNK_PASSWORD:
        raise SplunkSearchError(
            "SPLUNK_PASSWORD is missing. Add it to RavenLedger/.env"
        )

    search_url = f"{SPLUNK_HOST}/services/search/jobs"

    search_payload = {
        "search": f"search {spl}",
        "output_mode": "json",
        "exec_mode": "normal",
    }

    response = requests.post(
        search_url,
        data=search_payload,
        auth=HTTPBasicAuth(SPLUNK_USERNAME, SPLUNK_PASSWORD),
        verify=False,
        timeout=20,
    )

    if response.status_code >= 400:
        raise SplunkSearchError(
            f"Failed to create Splunk search job. "
            f"Status={response.status_code}, Body={response.text[:500]}"
        )

    sid = response.json()["sid"]

    for _ in range(max_wait_seconds):
        status_url = f"{SPLUNK_HOST}/services/search/jobs/{sid}"

        status_response = requests.get(
            status_url,
            params={"output_mode": "json"},
            auth=HTTPBasicAuth(SPLUNK_USERNAME, SPLUNK_PASSWORD),
            verify=False,
            timeout=20,
        )

        if status_response.status_code >= 400:
            raise SplunkSearchError(
                f"Failed to check Splunk job status. "
                f"Status={status_response.status_code}, Body={status_response.text[:500]}"
            )

        job_content = status_response.json()["entry"][0]["content"]

        if job_content.get("isDone"):
            break

        time.sleep(1)

    results_url = f"{SPLUNK_HOST}/services/search/jobs/{sid}/results"

    results_response = requests.get(
        results_url,
        params={
            "output_mode": "json",
            "count": count,
        },
        auth=HTTPBasicAuth(SPLUNK_USERNAME, SPLUNK_PASSWORD),
        verify=False,
        timeout=20,
    )

    if results_response.status_code >= 400:
        raise SplunkSearchError(
            f"Failed to fetch Splunk results. "
            f"Status={results_response.status_code}, Body={results_response.text[:500]}"
        )

    return results_response.json().get("results", [])


def run_template_search(name: str, **kwargs) -> list[dict]:
    spl = render_query(name, **kwargs)
    return run_splunk_search(
        spl=spl,
        count=kwargs.get("limit", 20),
    )


if __name__ == "__main__":
    print("RavenLedger Splunk Search Adapter")
    print("=" * 70)
    print("Splunk Host:", SPLUNK_HOST)
    print("Splunk Username:", SPLUNK_USERNAME)
    print("Testing live Splunk search:")
    print("Template: sample_security_events")

    results = run_template_search("sample_security_events", limit=20)

    print(f"Results returned: {len(results)}")

    for row in results[:5]:
        print(row)