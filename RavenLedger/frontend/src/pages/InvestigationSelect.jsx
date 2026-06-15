import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./InvestigationSelect.module.css";
import { getInvestigationModes } from "../api/ravenledgerApi";

const MODE_KEY = "ravenledger_selected_mode";
const SELECTED_CASE_ID_KEY = "ravenledger:selectedCaseId";
const SELECTED_CASE_DETAIL_KEY = "ravenledger:selectedCaseDetail";
const SELECTED_REPORT_KEY = "ravenledger:selectedReport";
const SELECTED_ACTION_LOG_KEY = "ravenledger:selectedActionLog";

const FALLBACK_MODES = [
  {
    mode: "full",
    title: "Full Payment Risk Investigation",
    tag: "Full",
    icon: "🧠",
    meaning:
      "Connects Finance, SOC, Audit, and Splunk evidence into one complete investigation before payment release. This is the strongest end-to-end RavenLedger story.",
    agents: [
      "Business Risk Agent",
      "Insider Behavior Agent",
      "Splunk Evidence Agent",
      "Correlation Agent",
      "Policy Decision Agent",
      "Audit Report Agent",
      "Human Action Agent",
    ],
    bestFor:
      "End-to-end demo: finance risk, security telemetry, audit controls, and human action.",
    apiMode: "GET /agent/run-investigation?mode=full",
    dataSources: [
      "ERP payment risk",
      "CERT insider behavior",
      "Splunk BOTS v3 telemetry",
    ],
  },
  {
    mode: "payment_fraud",
    title: "Finance Payment Fraud Review",
    tag: "Finance",
    icon: "🧾",
    meaning:
      "Focuses on why Finance should not approve the payment yet: blacklisted supplier, split invoice behavior, unusual submission time, invoice amount, and payment hold recommendation.",
    agents: [
      "Business Risk Agent",
      "Correlation Agent",
      "Policy Decision Agent",
    ],
    bestFor:
      "Finance and procurement teams deciding whether to hold, review, or release a risky payment.",
    apiMode: "GET /agent/run-investigation?mode=payment_fraud",
    dataSources: [
      "Procurement invoice fraud dataset",
      "ERP payment queue",
      "supplier risk signals",
    ],
  },
  {
    mode: "insider_behavior",
    title: "Insider-Linked Payment Review",
    tag: "SOC",
    icon: "🔐",
    meaning:
      "Focuses on whether suspicious user behavior is connected to the risky payment: login time, device activity, HTTP/web activity, and insider-risk context.",
    agents: [
      "Insider Behavior Agent",
      "Correlation Agent",
      "Policy Decision Agent",
    ],
    bestFor:
      "SOC and insider-risk teams validating whether user activity influenced payment risk.",
    apiMode: "GET /agent/run-investigation?mode=insider_behavior",
    dataSources: [
      "CERT r1 insider threat dataset",
      "logon activity",
      "device and web activity",
    ],
  },
  {
    mode: "splunk_evidence",
    title: "Splunk Evidence Review",
    tag: "Splunk",
    icon: "🔍",
    meaning:
      "Focuses on what Splunk proves: generated SPL, BOTS v3 events, hosts, sourcetypes, timestamps, source fields, and live telemetry attached to the case.",
    agents: ["Splunk Evidence Agent", "Correlation Agent"],
    bestFor:
      "Splunk and SOC reviewers who need evidence behind every risk decision.",
    apiMode: "GET /agent/run-investigation?mode=splunk_evidence",
    dataSources: [
      "Splunk Enterprise",
      "BOTS v3",
      "_time · host · sourcetype · source",
    ],
  },
  {
    mode: "policy_audit",
    title: "Policy & Audit Control Review",
    tag: "Audit",
    icon: "🛡",
    meaning:
      "Focuses on named controls, policy failures, approval requirements, escalation targets, recommended action, and audit-ready report generation.",
    agents: [
      "Policy Decision Agent",
      "Audit Report Agent",
      "Human Action Agent",
    ],
    bestFor:
      "Audit and compliance teams proving why a risky payment was held or escalated.",
    apiMode: "GET /agent/run-investigation?mode=policy_audit",
    dataSources: ["control checklist", "policy violations", "audit report log"],
  },
];

function normalizeModes(payload) {
  const items = payload?.modes || payload?.data || payload;

  if (!Array.isArray(items) || items.length === 0) {
    return FALLBACK_MODES;
  }

  return items.map((item) => {
    const fallback = FALLBACK_MODES.find(
      (mode) => mode.mode === item.mode || mode.mode === item.id
    );

    return {
      ...fallback,
      ...item,
      mode: item.mode || item.id || fallback?.mode || "full",
      title: item.title || item.name || fallback?.title || "Investigation Mode",
      tag: item.tag || fallback?.tag || "Mode",
      icon: item.icon || fallback?.icon || "🔎",
      meaning: item.meaning || item.description || fallback?.meaning || "",
      agents: item.agents || item.primary_agents || fallback?.agents || [],
      bestFor: item.bestFor || item.best_for || fallback?.bestFor || "",
      apiMode:
        item.apiMode ||
        item.api_mode ||
        fallback?.apiMode ||
        `GET /agent/run-investigation?mode=${item.mode || item.id || "full"}`,
      dataSources:
        item.dataSources ||
        item.data_sources ||
        fallback?.dataSources ||
        [],
    };
  });
}

export default function InvestigationSelect() {
  const navigate = useNavigate();

  const [modes, setModes] = useState(FALLBACK_MODES);
  const [selectedMode, setSelectedMode] = useState("full");
  const [loadingModes, setLoadingModes] = useState(false);
  const [starting, setStarting] = useState(false);
  const [apiNote, setApiNote] = useState("");

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, []);

  useEffect(() => {
    async function loadModes() {
      setLoadingModes(true);

      try {
        const payload = await getInvestigationModes();
        setModes(normalizeModes(payload));
        setApiNote("");
      } catch (error) {
        console.error(error);
        setModes(FALLBACK_MODES);
        setApiNote("Backend modes API not available. Using demo-safe mode metadata.");
      } finally {
        setLoadingModes(false);
      }
    }

    loadModes();
  }, []);

  const activeMode = useMemo(() => {
    return (
      modes.find((item) => item.mode === selectedMode) ||
      modes[0] ||
      FALLBACK_MODES[0]
    );
  }, [modes, selectedMode]);

  function startInvestigation() {
    if (!activeMode || starting) return;

    setStarting(true);

    localStorage.setItem(MODE_KEY, activeMode.mode);
    localStorage.removeItem(SELECTED_CASE_ID_KEY);
    localStorage.removeItem(SELECTED_CASE_DETAIL_KEY);
    localStorage.removeItem(SELECTED_REPORT_KEY);
    localStorage.removeItem(SELECTED_ACTION_LOG_KEY);

    navigate("/demo");
  }

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>R</span>
          RavenLedger
        </div>

        <div className={styles.navPill}>
          {loadingModes ? "Loading Modes" : "Investigation Mode"}
        </div>

        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate("/")}
        >
          Back
        </button>
      </nav>

      <main className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <div className={styles.eyebrow}>Before the command center</div>

            <h1>
              Choose Investigation <span>Mode</span>
            </h1>

            <p>
              Finance teams approve payments. SOC teams see security telemetry.
              Audit teams need control evidence. Choose how RavenLedger should
              connect these views before a risky payment leaves the enterprise.
            </p>

            <div className={styles.badges}>
              <span>Finance RiskOps</span>
              <span>Splunk Evidence</span>
              <span>Human Approval</span>
              <span>Audit-Ready Case</span>
            </div>

            {apiNote && <div className={styles.apiNote}>{apiNote}</div>}
          </div>
        </section>

        <section className={styles.cardGrid}>
          {modes.map((mode) => {
            const isSelected = mode.mode === selectedMode;

            return (
              <button
                key={mode.mode}
                type="button"
                className={`${styles.modeCard} ${
                  isSelected ? styles.modeCardSelected : ""
                }`}
                onClick={() => setSelectedMode(mode.mode)}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cardIcon}>{mode.icon}</div>
                  <span>{mode.tag}</span>
                </div>

                <h3>{mode.title}</h3>
                <p>{mode.meaning}</p>

                <div className={styles.cardFooter}>
                  <span>{isSelected ? "Selected" : "Select mode"}</span>
                  <b>→</b>
                </div>
              </button>
            );
          })}
        </section>

        <section className={styles.selectedExplain}>
          <div className={styles.selectedIntro}>
            <div className={styles.eyebrow}>Selected investigation focus</div>
            <h2>{activeMode.title}</h2>
            <p>{activeMode.meaning}</p>
          </div>

          <div className={styles.explainGrid}>
            <div className={styles.explainCard}>
              <span>01</span>
              <h3>Agents Used</h3>
              <p>{activeMode.agents?.join(" · ")}</p>
            </div>

            <div className={styles.explainCard}>
              <span>02</span>
              <h3>API Mode</h3>
              <p>{activeMode.apiMode}</p>
            </div>

            <div className={styles.explainCard}>
              <span>03</span>
              <h3>Best For</h3>
              <p>{activeMode.bestFor}</p>
            </div>

            <div className={styles.explainCard}>
              <span>04</span>
              <h3>Data Sources</h3>
              <p>{activeMode.dataSources?.join(" · ")}</p>
            </div>
          </div>
        </section>

        <section className={styles.dataPanel}>
          <div>
            <div className={styles.eyebrow}>Finance + Splunk value</div>
            <h2>Why Finance Needs Splunk Evidence</h2>
            <p>
              A payment decision is not only a finance problem. RavenLedger
              connects ERP payment risk, insider behavior, and Splunk telemetry
              so Finance, SOC, and Audit can act from one case.
            </p>
          </div>

          <div className={styles.dataGrid}>
            <div className={styles.dataCard}>
              <h3>Finance Risk Signals</h3>
              <b>Used by: Business Risk Agent</b>
              <p>
                Shows invoice amount, supplier risk, blacklist status, split
                invoice patterns, late-night submissions, and why the payment
                should not be released blindly.
              </p>
            </div>

            <div className={styles.dataCard}>
              <h3>Security & Insider Context</h3>
              <b>Used by: Insider Behavior Agent</b>
              <p>
                Adds user logon, device, and HTTP activity so SOC can see
                whether suspicious behavior is connected to the payment event.
              </p>
            </div>

            <div className={styles.dataCard}>
              <h3>Splunk Evidence Trail</h3>
              <b>Used by: Splunk Evidence Agent</b>
              <p>
                Pulls BOTS v3 telemetry from Splunk Enterprise and attaches
                _time, host, sourcetype, source, and event context to the
                payment-risk case.
              </p>
            </div>
          </div>

          <div className={styles.note}>
            RavenLedger does not auto-block real payments. It recommends action,
            preserves evidence, and keeps the final decision with a human
            analyst.
          </div>
        </section>

        <section className={styles.nextFlow}>
          <span>Choose Mode</span>
          <b>→</b>
          <span>Run Supervisor Agent</span>
          <b>→</b>
          <span>Specialist Agents Execute</span>
          <b>→</b>
          <span>Unified Case Generated</span>
          <b>→</b>
          <span>Command Center Opens</span>
        </section>

        <div className={styles.startWrap}>
          <button
            type="button"
            className={styles.startBtn}
            onClick={startInvestigation}
            disabled={starting}
          >
            {starting ? "Starting Investigation…" : "Start Investigation"}
          </button>
        </div>
      </main>
    </div>
  );
}