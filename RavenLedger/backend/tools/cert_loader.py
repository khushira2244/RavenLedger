from pathlib import Path
import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[2]
CERT_R1_DIR = ROOT_DIR / "data" / "raw" / "insider" / "cert" / "r1"

LOGON_PATH = CERT_R1_DIR / "logon.csv"
DEVICE_PATH = CERT_R1_DIR / "device.csv"
HTTP_PATH = CERT_R1_DIR / "http.csv"


HTTP_COLUMNS = ["id", "date", "user", "pc", "url"]


def load_logon_data(nrows=None) -> pd.DataFrame:
    if not LOGON_PATH.exists():
        raise FileNotFoundError(f"Missing file: {LOGON_PATH}")

    return pd.read_csv(LOGON_PATH, nrows=nrows)


def load_device_data(nrows=None) -> pd.DataFrame:
    if not DEVICE_PATH.exists():
        raise FileNotFoundError(f"Missing file: {DEVICE_PATH}")

    return pd.read_csv(DEVICE_PATH, nrows=nrows)


def load_http_data(nrows=None) -> pd.DataFrame:
    if not HTTP_PATH.exists():
        raise FileNotFoundError(f"Missing file: {HTTP_PATH}")

    return pd.read_csv(
        HTTP_PATH,
        header=None,
        names=HTTP_COLUMNS,
        nrows=nrows
    )


def summarize_user_activity(nrows=100_000) -> pd.DataFrame:
    logon = load_logon_data(nrows=nrows)
    device = load_device_data(nrows=nrows)
    http = load_http_data(nrows=nrows)

    logon_counts = logon.groupby("user").size().reset_index(name="logon_events")
    device_counts = device.groupby("user").size().reset_index(name="device_events")
    http_counts = http.groupby("user").size().reset_index(name="http_events")

    summary = (
        logon_counts
        .merge(device_counts, on="user", how="outer")
        .merge(http_counts, on="user", how="outer")
        .fillna(0)
    )

    summary["total_events"] = (
        summary["logon_events"]
        + summary["device_events"]
        + summary["http_events"]
    )

    summary = summary.sort_values("total_events", ascending=False)

    return summary


if __name__ == "__main__":
    print("CERT r1 Loader")
    print("=" * 60)

    logon = load_logon_data(nrows=5)
    device = load_device_data(nrows=5)
    http = load_http_data(nrows=5)

    print("\nLOGON")
    print("Columns:", logon.columns.tolist())
    print(logon.head())

    print("\nDEVICE")
    print("Columns:", device.columns.tolist())
    print(device.head())

    print("\nHTTP")
    print("Columns:", http.columns.tolist())
    print(http.head())

    print("\nTop users by activity sample")
    summary = summarize_user_activity(nrows=100_000)
    print(summary.head(10))