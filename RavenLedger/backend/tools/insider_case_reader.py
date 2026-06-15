from pathlib import Path
import json


ROOT_DIR = Path(__file__).resolve().parents[2]
TOP_USERS_PATH = ROOT_DIR / "data" / "processed" / "top_insider_risk_users.json"


def load_top_insider_users() -> list[dict]:
    if not TOP_USERS_PATH.exists():
        raise FileNotFoundError(
            f"Missing {TOP_USERS_PATH}. Run insider_risk_engine.py first."
        )

    with open(TOP_USERS_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def get_user_by_id(insider_case_id: str) -> dict | None:
    users = load_top_insider_users()

    for user in users:
        if user.get("insider_case_id") == insider_case_id:
            return user

    return None


if __name__ == "__main__":
    users = load_top_insider_users()

    print("Loaded insider risk users:", len(users))
    print("=" * 60)

    for user in users[:5]:
        print(
            user["insider_case_id"],
            "|",
            user["user"],
            "|",
            user["insider_risk_score"],
            "|",
            user["severity"],
        )