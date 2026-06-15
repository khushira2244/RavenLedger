from pathlib import Path
import sys
import json
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT_DIR))

from backend.tools.cert_loader import summarize_user_activity


OUTPUT_PATH = ROOT_DIR / "data" / "processed" / "top_insider_risk_users.json"


def severity_from_score(score: int) -> str:
    if score >= 80:
        return "Critical"
    if score >= 60:
        return "High"
    if score >= 35:
        return "Medium"
    return "Low"


def score_user(row, index: int) -> dict:
    score = 0
    signals = []

    logon_events = int(row.get("logon_events", 0))
    device_events = int(row.get("device_events", 0))
    http_events = int(row.get("http_events", 0))
    total_events = int(row.get("total_events", 0))

    if total_events >= 1200:
        score += 30
        signals.append("Very high total user activity")

    elif total_events >= 900:
        score += 20
        signals.append("High total user activity")

    if device_events >= 600:
        score += 25
        signals.append("Very high device connect/disconnect activity")

    elif device_events >= 400:
        score += 15
        signals.append("High device connect/disconnect activity")

    if http_events >= 600:
        score += 20
        signals.append("Very high HTTP/web activity")

    elif http_events >= 400:
        score += 10
        signals.append("High HTTP/web activity")

    if logon_events >= 125:
        score += 15
        signals.append("High logon/logoff activity")

    elif logon_events >= 100:
        score += 10
        signals.append("Moderate-high logon/logoff activity")

    score = min(score, 100)

    return {
        "insider_case_id": f"IR-USER-{index:04d}",
        "user": row.get("user"),
        "logon_events": logon_events,
        "device_events": device_events,
        "http_events": http_events,
        "total_events": total_events,
        "insider_risk_score": score,
        "severity": severity_from_score(score),
        "signals": signals,
        "source_layer": "cert_r1_insider_threat_dataset",
    }


def build_top_insider_users(limit: int = 10, nrows: int = 100_000) -> list[dict]:
    summary = summarize_user_activity(nrows=nrows)

    users = []
    for idx, (_, row) in enumerate(summary.iterrows(), start=1):
        users.append(score_user(row, idx))

    users = sorted(users, key=lambda item: item["insider_risk_score"], reverse=True)

    return users[:limit]


def save_users(users: list[dict]) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as file:
        json.dump(users, file, indent=2)


if __name__ == "__main__":
    top_users = build_top_insider_users(limit=10, nrows=100_000)
    save_users(top_users)

    print("RavenLedger Insider Risk Engine")
    print("=" * 70)

    for user_case in top_users:
        print(
            f"\n{user_case['insider_case_id']} | {user_case['user']} | "
            f"Score: {user_case['insider_risk_score']} | {user_case['severity']}"
        )
        print(
            f"Events: total={user_case['total_events']}, "
            f"logon={user_case['logon_events']}, "
            f"device={user_case['device_events']}, "
            f"http={user_case['http_events']}"
        )
        print("Signals:")
        for signal in user_case["signals"]:
            print(f" - {signal}")

    print("\nSaved output:")
    print(OUTPUT_PATH)