from pathlib import Path
import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[2]
BUSINESS_RISK_CSV = ROOT_DIR / "data" / "processed" / "ravenledger_business_risk_sample.csv"


REQUIRED_COLUMNS = [
    "invoice_id",
    "supplier_id",
    "department_id",
    "invoice_amount",
    "supplier_risk_score",
    "blacklisted_flag",
    "is_fraud",
    "fraud_type",
    "duplicate_invoice_flag",
    "split_invoice_flag",
    "late_night_submission_flag",
    "invoice_amount_zscore",
]


def load_business_risk_data() -> pd.DataFrame:
    if not BUSINESS_RISK_CSV.exists():
        raise FileNotFoundError(f"Missing file: {BUSINESS_RISK_CSV}")

    df = pd.read_csv(BUSINESS_RISK_CSV)

    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    return df


if __name__ == "__main__":
    df = load_business_risk_data()

    print("RavenLedger Business Risk Dataset")
    print("=" * 50)
    print("Rows, columns:", df.shape)
    print("\nFraud distribution:")
    print(df["is_fraud"].value_counts())
    print("\nFirst 10 columns:")
    print(df.columns.tolist()[:10])