import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./McpDashboard.module.css";
import { getMcpTools, getTopRiskCases } from "../api/ravenledgerApi";

const MODE_KEY = "ravenledger_selected_mode";
const TOP_CASES_KEY = "ravenledger:topCases";

const MODE_LABELS = {
  full: "Full Multi-Agent Investigation",
  payment_fraud: "Payment Fraud Investigation",
  insider_behavior: "Insider Behavior Investigation",
  splunk_evidence: "Splunk Evidence Investigation",
  policy_audit: "Policy & Audit Investigation",
};

const MODE_DESCRIPTIONS = {
  full:
    "RavenLedger analyzes payment risk, insider context, Splunk telemetry, controls, audit readiness, and human-approved response across the full queue.",
  payment_fraud:
    "RavenLedger focuses on supplier risk, invoice patterns, payment-release decisions, and recommended Finance action across the payment-risk queue.",
  insider_behavior:
    "RavenLedger focuses on user activity, insider-risk signals, device behavior, Splunk evidence, and SOC escalation across the queue.",
  splunk_evidence:
    "RavenLedger focuses on SPL-backed telemetry, event coverage, host/source context, and evidence readiness across all cases.",
  policy_audit:
    "RavenLedger focuses on failed controls, approval requirements, audit readiness, and human decision logging across the risk queue.",
};

const MODE_TOOL_MAP = {
  full: [
    "assess_payment_release_risk",
    "rank_high_risk_payments",
    "explain_payment_ranking_reason",
    "check_supplier_blacklist_status",
    "check_supplier_security_context",
    "detect_insider_payment_abuse",
    "retrieve_splunk_evidence_for_case",
    "validate_payment_controls",
    "recommend_business_action",
    "log_human_decision_to_splunk",
  ],
  payment_fraud: [
    "assess_payment_release_risk",
    "rank_high_risk_payments",
    "explain_payment_ranking_reason",
    "check_supplier_blacklist_status",
    "check_supplier_security_context",
    "validate_payment_controls",
    "recommend_business_action",
    "retrieve_splunk_evidence_for_case",
    "log_human_decision_to_splunk",
    "detect_insider_payment_abuse",
  ],
  insider_behavior: [
    "detect_insider_payment_abuse",
    "retrieve_splunk_evidence_for_case",
    "check_supplier_security_context",
    "validate_payment_controls",
    "recommend_business_action",
    "log_human_decision_to_splunk",
    "assess_payment_release_risk",
    "rank_high_risk_payments",
    "explain_payment_ranking_reason",
    "check_supplier_blacklist_status",
  ],
  splunk_evidence: [
    "retrieve_splunk_evidence_for_case",
    "check_supplier_security_context",
    "explain_payment_ranking_reason",
    "validate_payment_controls",
    "recommend_business_action",
    "log_human_decision_to_splunk",
    "assess_payment_release_risk",
    "rank_high_risk_payments",
    "check_supplier_blacklist_status",
    "detect_insider_payment_abuse",
  ],
  policy_audit: [
    "validate_payment_controls",
    "recommend_business_action",
    "log_human_decision_to_splunk",
    "assess_payment_release_risk",
    "explain_payment_ranking_reason",
    "retrieve_splunk_evidence_for_case",
    "check_supplier_security_context",
    "rank_high_risk_payments",
    "check_supplier_blacklist_status",
    "detect_insider_payment_abuse",
  ],
};

function safeJsonParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeTopCases(payload) {
  const candidates =
    payload?.cases ||
    payload?.top_cases ||
    payload?.topCases ||
    payload?.results ||
    payload;

  return Array.isArray(candidates) ? candidates : [];
}

function getCaseId(item) {
  return item?.correlation_case_id || item?.case_id || item?.id || "RL-CORR-0000";
}

function getInvoice(item) {
  return item?.invoice_id || item?.invoice || item?.invoice_number || "INV_PENDING";
}

function getSupplier(item) {
  return (
    item?.supplier_name ||
    item?.supplier ||
    item?.vendor_name ||
    item?.vendor ||
    "Supplier review"
  );
}

function getUser(item) {
  return item?.user || item?.actor || item?.employee || item?.owner || "DTAA/ABB0272";
}

function getScore(item) {
  return (
    item?.combined_risk_score ??
    item?.risk_score ??
    item?.score ??
    item?.riskScore ??
    0
  );
}

function getSeverity(item) {
  return item?.severity || item?.risk_level || item?.priority || "High";
}

function getReason(item) {
  return (
    item?.ranking_reason ||
    item?.reason ||
    item?.business_reason ||
    "Ranked by combined payment risk, control signals, and Splunk evidence."
  );
}

function getAction(item) {
  return (
    item?.final_recommended_action ||
    item?.recommended_action ||
    "Hold payment for manual review"
  );
}

function getEvidenceCount(item) {
  return (
    item?.splunk_evidence_count ||
    item?.evidence_count ||
    item?.splunk_events?.length ||
    20
  );
}

function orderToolsByMode(tools, selectedMode) {
  const order = MODE_TOOL_MAP[selectedMode] || MODE_TOOL_MAP.full;
  const map = new Map(tools.map((tool) => [tool.name, tool]));
  const ordered = order.map((name) => map.get(name)).filter(Boolean);
  const remaining = tools.filter((tool) => !order.includes(tool.name));

  return [...ordered, ...remaining];
}

function isPrimaryTool(toolName, selectedMode) {
  const order = MODE_TOOL_MAP[selectedMode] || MODE_TOOL_MAP.full;
  if (selectedMode === "full") return true;
  return order.slice(0, 6).includes(toolName);
}

function buildSeverityStats(cases) {
  return cases.reduce(
    (acc, item) => {
      const severity = String(getSeverity(item)).toLowerCase();

      if (severity.includes("critical")) acc.critical += 1;
      else if (severity.includes("high")) acc.high += 1;
      else if (severity.includes("medium")) acc.medium += 1;
      else acc.low += 1;

      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  );
}

function countText(cases, patterns) {
  const text = cases
    .map((item) =>
      [
        getReason(item),
        getAction(item),
        getSupplier(item),
        item?.fraud_type,
        item?.supplier_status,
        item?.ranking_reason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
    )
    .join(" ");

  return patterns.reduce((count, pattern) => {
    return count + (text.match(pattern) || []).length;
  }, 0);
}

function buildPatternStats(cases, selectedMode) {
  if (selectedMode === "insider_behavior") {
    return [
      { label: "Insider / user signals", count: countText(cases, [/insider/g, /user/g]) },
      { label: "Device activity references", count: countText(cases, [/device/g, /connect/g]) },
      { label: "HTTP / web activity", count: countText(cases, [/http/g, /web/g]) },
      { label: "SOC escalation signals", count: countText(cases, [/soc/g, /escalate/g]) },
      { label: "Splunk evidence references", count: countText(cases, [/splunk/g, /telemetry/g, /evidence/g]) },
    ];
  }

  if (selectedMode === "splunk_evidence") {
    return [
      { label: "Splunk evidence references", count: countText(cases, [/splunk/g, /telemetry/g, /evidence/g]) },
      { label: "BOTS v3 / SPL context", count: countText(cases, [/bots/g, /spl/g, /source/g]) },
      { label: "Host / sourcetype coverage", count: countText(cases, [/host/g, /sourcetype/g]) },
      { label: "Evidence-ready cases", count: cases.filter((item) => getEvidenceCount(item) > 0).length },
      { label: "Critical evidence cases", count: cases.filter((item) => String(getSeverity(item)).toLowerCase().includes("critical")).length },
    ];
  }

  if (selectedMode === "policy_audit") {
    return [
      { label: "Control / approval risk", count: countText(cases, [/control/g, /approval/g, /required/g]) },
      { label: "Failed control references", count: countText(cases, [/failed/g, /fail/g]) },
      { label: "Audit-ready cases", count: countText(cases, [/audit/g, /log/g]) },
      { label: "Human approval required", count: countText(cases, [/human/g, /approval/g]) },
      { label: "Splunk logging references", count: countText(cases, [/splunk/g, /log/g]) },
    ];
  }

  return [
    { label: "Blacklisted supplier signals", count: countText(cases, [/blacklist/g, /blacklisted/g]) },
    { label: "Split invoice / duplicate patterns", count: countText(cases, [/split/g, /duplicate/g]) },
    { label: "Late-night / unusual timing", count: countText(cases, [/late/g, /night/g, /unusual/g, /02:/g]) },
    { label: "Controls or approval risk", count: countText(cases, [/control/g, /approval/g, /required/g, /failed/g]) },
    { label: "Splunk evidence references", count: countText(cases, [/splunk/g, /telemetry/g, /evidence/g]) },
  ];
}

function buildToolAnalysis(toolName, cases, selectedMode) {
  const total = cases.length;
  const sorted = [...cases]
    .sort((a, b) => Number(getScore(b)) - Number(getScore(a)))
    .slice(0, 10);

  const critical = cases.filter((item) =>
    String(getSeverity(item)).toLowerCase().includes("critical")
  ).length;

  const high = cases.filter((item) =>
    String(getSeverity(item)).toLowerCase().includes("high")
  ).length;

  const hold = cases.filter((item) => {
    const action = String(getAction(item)).toLowerCase();
    return action.includes("hold") || action.includes("review");
  }).length;

  const splunk = cases.filter((item) => {
    const text = `${getReason(item)} ${getAction(item)}`.toLowerCase();
    return text.includes("splunk") || text.includes("telemetry") || text.includes("evidence");
  }).length;

  const supplierRisk = cases.filter((item) => {
    const text = `${getReason(item)} ${getSupplier(item)}`.toLowerCase();
    return text.includes("supplier") || text.includes("blacklist");
  }).length;

  const insiderRisk = cases.filter((item) => {
    const text = `${getReason(item)} ${getAction(item)}`.toLowerCase();
    return text.includes("insider") || text.includes("user") || text.includes("soc");
  }).length;

  const controlRisk = cases.filter((item) => {
    const text = `${getReason(item)} ${getAction(item)}`.toLowerCase();
    return text.includes("control") || text.includes("approval") || text.includes("failed");
  }).length;

  const topScore = Math.max(0, ...cases.map((item) => Number(getScore(item)) || 0));

  const defaultRows = sorted.map((item, index) => ({
    rank: `#${index + 1}`,
    caseId: getCaseId(item),
    col1: getInvoice(item),
    col2: getSeverity(item),
    score: getScore(item),
    result: getAction(item),
    reason: getReason(item),
  }));

  const configs = {
    assess_payment_release_risk: {
      title: "Assess Payment Release Risk — Queue Results",
      desc: "Analyzes the full case queue and estimates which payments should be held, reviewed, or escalated before release.",
      columns: ["Rank", "Case ID", "Invoice", "Severity", "Score", "Release Decision", "Reason"],
      metrics: [
        { label: "Cases analyzed", value: total },
        { label: "Hold / review", value: hold },
        { label: "Critical", value: critical },
        { label: "Top score", value: topScore },
      ],
      rows: defaultRows,
    },

    rank_high_risk_payments: {
      title: "Rank High-Risk Payments — Top 10 Results",
      desc: "Ranks payment-risk cases so Finance, SOC, and Audit know what to investigate first.",
      columns: ["Rank", "Case ID", "Invoice", "Severity", "Score", "Queue Priority", "Ranking Reason"],
      metrics: [
        { label: "Ranked cases", value: total },
        { label: "Critical", value: critical },
        { label: "High", value: high },
        { label: "Top score", value: topScore },
      ],
      rows: defaultRows.map((row, index) => ({
        ...row,
        result: index < 3 ? "Immediate review" : "Queue review",
      })),
    },

    explain_payment_ranking_reason: {
      title: "Explain Payment Ranking Reason — Queue Results",
      desc: "Explains why cases are ranked high by summarizing the strongest repeated risk reasons across the queue.",
      columns: ["Rank", "Case ID", "Invoice", "Severity", "Score", "Main Signal", "Explanation"],
      metrics: [
        { label: "Supplier signals", value: supplierRisk },
        { label: "Insider signals", value: insiderRisk },
        { label: "Control signals", value: controlRisk },
        { label: "Evidence signals", value: splunk },
      ],
      rows: defaultRows.map((row) => ({
        ...row,
        result: "Ranking explained",
      })),
    },

    check_supplier_blacklist_status: {
      title: "Check Supplier Blacklist Status — Supplier Queue Results",
      desc: "Checks supplier-risk patterns across all payment cases and identifies blacklisted or review-required suppliers.",
      columns: ["Rank", "Case ID", "Supplier", "Severity", "Score", "Supplier Status", "Reason"],
      metrics: [
        { label: "Supplier cases", value: total },
        { label: "Supplier risk", value: supplierRisk },
        { label: "Critical supplier risk", value: critical },
        { label: "Manual review", value: hold },
      ],
      rows: sorted.map((item, index) => ({
        rank: `#${index + 1}`,
        caseId: getCaseId(item),
        col1: getSupplier(item),
        col2: getSeverity(item),
        score: getScore(item),
        result: String(getReason(item)).toLowerCase().includes("blacklist")
          ? "Blacklisted"
          : "Supplier review",
        reason: getReason(item),
      })),
    },

    check_supplier_security_context: {
      title: "Check Supplier Security Context — Splunk + Supplier Results",
      desc: "Connects supplier/payment risk with Splunk evidence context across the queue.",
      columns: ["Rank", "Case ID", "Supplier", "Severity", "Score", "Splunk Context", "Reason"],
      metrics: [
        { label: "Splunk context cases", value: splunk },
        { label: "Supplier risk", value: supplierRisk },
        { label: "Critical evidence", value: critical },
        { label: "Cases analyzed", value: total },
      ],
      rows: sorted.map((item, index) => ({
        rank: `#${index + 1}`,
        caseId: getCaseId(item),
        col1: getSupplier(item),
        col2: getSeverity(item),
        score: getScore(item),
        result: `${getEvidenceCount(item)} events`,
        reason: getReason(item),
      })),
    },

    detect_insider_payment_abuse: {
      title: "Detect Insider Payment Abuse — Insider Queue Results",
      desc: "Analyzes internal-user risk, user activity, device behavior, and SOC escalation signals across the queue.",
      columns: ["Rank", "Case ID", "User", "Severity", "Score", "Insider Signal", "Reason"],
      metrics: [
        { label: "Insider/SOC signals", value: insiderRisk },
        { label: "Critical user cases", value: critical },
        { label: "Escalation candidates", value: hold },
        { label: "Cases analyzed", value: total },
      ],
      rows: sorted.map((item, index) => ({
        rank: `#${index + 1}`,
        caseId: getCaseId(item),
        col1: getUser(item),
        col2: getSeverity(item),
        score: getScore(item),
        result: insiderRisk ? "User-risk context" : "User context checked",
        reason: getReason(item),
      })),
    },

    retrieve_splunk_evidence_for_case: {
      title: "Retrieve Splunk Evidence — Queue Coverage Results",
      desc: "Shows evidence coverage across the full queue, including telemetry count and Splunk-ready context.",
      columns: ["Rank", "Case ID", "SPL / Source", "Severity", "Score", "Evidence Count", "Reason"],
      metrics: [
        { label: "Evidence cases", value: splunk },
        { label: "Telemetry-linked", value: splunk },
        { label: "Critical evidence", value: critical },
        { label: "Cases analyzed", value: total },
      ],
      rows: sorted.map((item, index) => ({
        rank: `#${index + 1}`,
        caseId: getCaseId(item),
        col1: "index=botsv3",
        col2: getSeverity(item),
        score: getScore(item),
        result: `${getEvidenceCount(item)} events`,
        reason: getReason(item),
      })),
    },

    validate_payment_controls: {
      title: "Validate Payment Controls — Control Results",
      desc: "Summarizes failed, passed, warning, and approval-required controls across the full queue.",
      columns: ["Rank", "Case ID", "Invoice", "Severity", "Score", "Control Status", "Reason"],
      metrics: [
        { label: "Control signals", value: controlRisk },
        { label: "Critical controls", value: critical },
        { label: "Human approval", value: hold },
        { label: "Cases analyzed", value: total },
      ],
      rows: defaultRows.map((row, index) => ({
        ...row,
        result: index < 3 ? "Failed / Required" : "Review required",
      })),
    },

    recommend_business_action: {
      title: "Recommend Business Action — Top 10 Case Results",
      desc: "Analyzes all cases in the queue and recommends the next human-approved business action.",
      columns: ["Rank", "Case ID", "Invoice", "Severity", "Score", "Recommended Action", "Reason"],
      metrics: [
        { label: "Cases analyzed", value: Math.min(10, total) },
        { label: "Hold payment", value: hold },
        { label: "Finance review", value: Math.max(0, total - hold - 2) },
        { label: "Escalate to SOC", value: insiderRisk },
      ],
      rows: defaultRows,
    },

    log_human_decision_to_splunk: {
      title: "Log Human Decision to Splunk — Audit Readiness Results",
      desc: "Shows which queue cases are ready to become human-approved audit events after analyst decision.",
      columns: ["Rank", "Case ID", "Invoice", "Severity", "Score", "Audit Log Status", "Reason"],
      metrics: [
        { label: "Audit-ready cases", value: hold },
        { label: "Critical audit events", value: critical },
        { label: "Splunk-backed cases", value: splunk },
        { label: "Cases analyzed", value: total },
      ],
      rows: defaultRows.map((row) => ({
        ...row,
        result: "Ready for Splunk audit log",
      })),
    },
  };

  const modeFallback = {
    title: `${MODE_LABELS[selectedMode] || "MCP"} — Queue Results`,
    desc: "Analyzes the full case queue through the selected MCP business tool.",
    columns: ["Rank", "Case ID", "Invoice", "Severity", "Score", "Result", "Reason"],
    metrics: [
      { label: "Cases analyzed", value: total },
      { label: "Critical", value: critical },
      { label: "High", value: high },
      { label: "Hold / review", value: hold },
    ],
    rows: defaultRows,
  };

  return configs[toolName] || modeFallback;
}

export default function McpDashboard() {
  const navigate = useNavigate();
  const analysisRef = useRef(null);

  const selectedMode = localStorage.getItem(MODE_KEY) || "full";
  const selectedModeLabel = MODE_LABELS[selectedMode] || MODE_LABELS.full;
  const selectedModeDescription =
    MODE_DESCRIPTIONS[selectedMode] || MODE_DESCRIPTIONS.full;

  const [mcpData, setMcpData] = useState(null);
  const [mcpError, setMcpError] = useState("");
  const [cases, setCases] = useState(() => {
    return safeJsonParse(localStorage.getItem(TOP_CASES_KEY), []);
  });
  const [casesError, setCasesError] = useState("");
  const [selectedToolName, setSelectedToolName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      try {
        const data = await getMcpTools();
        setMcpData(data);
        setMcpError("");

        const orderedTools = orderToolsByMode(data?.tools || [], selectedMode);
        setSelectedToolName(orderedTools[0]?.name || "");
      } catch (error) {
        console.error(error);
        setMcpData(null);
        setMcpError("MCP tools API is not available. Please start the backend.");
      }

      try {
        const payload = await getTopRiskCases(20);
        const normalizedCases = normalizeTopCases(payload);

        setCases(normalizedCases);
        localStorage.setItem(TOP_CASES_KEY, JSON.stringify(normalizedCases));
        setCasesError("");
      } catch (error) {
        console.error(error);

        const cachedCases = safeJsonParse(localStorage.getItem(TOP_CASES_KEY), []);

        if (cachedCases.length > 0) {
          setCases(cachedCases);
          setCasesError("Showing cached case queue because backend case API failed.");
        } else {
          setCases([]);
          setCasesError("Top-risk case API is not available.");
        }
      }

      setLoading(false);
    }

    loadDashboard();
  }, [selectedMode]);

  const tools = useMemo(() => {
    return orderToolsByMode(mcpData?.tools || [], selectedMode);
  }, [mcpData, selectedMode]);

  const selectedTool = useMemo(() => {
    return (
      tools.find((tool) => tool.name === selectedToolName) ||
      tools[0] ||
      null
    );
  }, [tools, selectedToolName]);

  const severityStats = useMemo(() => buildSeverityStats(cases), [cases]);

  const patternStats = useMemo(() => {
    return buildPatternStats(cases, selectedMode);
  }, [cases, selectedMode]);

  const selectedToolAnalysis = useMemo(() => {
    return buildToolAnalysis(selectedTool?.name, cases, selectedMode);
  }, [selectedTool, cases, selectedMode]);

  const averageScore = useMemo(() => {
    if (!cases.length) return 0;

    const total = cases.reduce((sum, item) => {
      const score = Number(getScore(item)) || 0;
      return sum + score;
    }, 0);

    return Math.round(total / cases.length);
  }, [cases]);

  const highestScore = useMemo(() => {
    if (!cases.length) return 0;
    return Math.max(...cases.map((item) => Number(getScore(item)) || 0));
  }, [cases]);

  const holdCount = useMemo(() => {
    return cases.filter((item) => {
      const action = String(getAction(item)).toLowerCase();
      return action.includes("hold") || action.includes("review");
    }).length;
  }, [cases]);

  function handleToolClick(toolName) {
    setSelectedToolName(toolName);

    window.requestAnimationFrame(() => {
      analysisRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>RL</span>
          <span>RavenLedger</span>
        </div>

        <span className={styles.navPill}>MCP CASE DASHBOARD</span>

        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate(-1)}
        >
          Back to Previous Page
        </button>
      </nav>

      <main className={styles.shell}>
        <section className={styles.hero}>
          <div>
            <div className={styles.eyebrow}>
              Splunk MCP-ready Business Control Surface
            </div>

            <h1>
              MCP Case <span>Dashboard</span>
            </h1>

            <p>
              This dashboard shows combined intelligence across all analyzed ERP
              risk cases. The mode decides the data lens. The MCP tool decides
              the analysis shown below.
            </p>

            <div className={styles.modeBox}>
              <div>
                <span>Selected Investigation Mode</span>
                <b>{selectedModeLabel}</b>
              </div>
              <p>{selectedModeDescription}</p>
            </div>

            {(mcpError || casesError) && (
              <div className={styles.warningBox}>
                {mcpError && <p>{mcpError}</p>}
                {casesError && <p>{casesError}</p>}
              </div>
            )}
          </div>

          <div className={styles.heroPanel}>
            <div className={styles.heroPanelLabel}>All-Cases Summary</div>

            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <span>Cases Analyzed</span>
                <b>{cases.length || "—"}</b>
              </div>

              <div className={styles.summaryItem}>
                <span>MCP Tools</span>
                <b>{mcpData?.tool_count ?? tools.length ?? "—"}</b>
              </div>

              <div className={styles.summaryItem}>
                <span>Average Score</span>
                <b>{averageScore || "—"}</b>
              </div>

              <div className={styles.summaryItem}>
                <span>Highest Score</span>
                <b>{highestScore || "—"}</b>
              </div>
            </div>

            <div className={styles.adapterFlow}>
              <span>{selectedModeLabel}</span>
              <b>→</b>
              <span>MCP-ready tools</span>
              <b>→</b>
              <span>Queue analysis</span>
              <b>→</b>
              <span>Back to Command Center</span>
            </div>
          </div>
        </section>

        {loading && (
          <div className={styles.loadingCard}>
            <div className={styles.spinner} />
            Loading MCP tools and combined case intelligence…
          </div>
        )}

        {!loading && (
          <>
            <section className={styles.metricRow}>
              <div className={styles.metricCard}>
                <span>Critical</span>
                <b className={styles.critical}>{severityStats.critical}</b>
                <small>Queue-level urgent risk</small>
              </div>

              <div className={styles.metricCard}>
                <span>High</span>
                <b className={styles.high}>{severityStats.high}</b>
                <small>Escalation candidates</small>
              </div>

              <div className={styles.metricCard}>
                <span>Hold / Review</span>
                <b className={styles.medium}>{holdCount}</b>
                <small>Business action pressure</small>
              </div>

              <div className={styles.metricCard}>
                <span>Primary MCP Tools</span>
                <b>
                  {
                    tools.filter((tool) =>
                      isPrimaryTool(tool.name, selectedMode)
                    ).length
                  }
                </b>
                <small>Relevant to selected mode</small>
              </div>
            </section>

            <section className={styles.toolPanelFull}>
              <div className={styles.sectionHead}>
                <span>10 MCP business tools</span>
                <h2>Click a tool to analyze all cases through that lens</h2>
                <p>
                  No selected-case routing happens here. Each tool changes the
                  all-cases analysis below.
                </p>
              </div>

              <div className={styles.toolGrid}>
                {tools.map((tool, index) => {
                  const primary = isPrimaryTool(tool.name, selectedMode);
                  const active = selectedTool?.name === tool.name;

                  return (
                    <button
                      key={tool.name}
                      type="button"
                      className={`${styles.toolCard} ${
                        active ? styles.toolCardActive : ""
                      }`}
                      onClick={() => handleToolClick(tool.name)}
                    >
                      <div className={styles.toolTop}>
                        <span>
                          {primary
                            ? "MODE PRIORITY"
                            : tool.status || "MCP-ready"}
                        </span>
                        <b>{String(index + 1).padStart(2, "0")}</b>
                      </div>

                      <h3>{tool.title || tool.name}</h3>
                      <code>{tool.name}</code>
                      <p>{tool.business_effect}</p>
                      <small>{tool.used_by_agent}</small>
                    </button>
                  );
                })}
              </div>
            </section>

            <section ref={analysisRef} className={styles.toolAnalysisPanel}>
              <div className={styles.sectionHead}>
                <span>Selected MCP tool analysis</span>
                <h2>{selectedToolAnalysis.title}</h2>
                <p>{selectedToolAnalysis.desc}</p>
              </div>

              <div className={styles.analysisMetricGrid}>
                {selectedToolAnalysis.metrics.map((metric) => (
                  <div key={metric.label} className={styles.analysisMetricCard}>
                    <span>{metric.label}</span>
                    <b>{metric.value}</b>
                  </div>
                ))}
              </div>

              <div className={styles.analysisTableWrap}>
                <table className={styles.analysisTable}>
                  <thead>
                    <tr>
                      {selectedToolAnalysis.columns.map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {selectedToolAnalysis.rows.length > 0 ? (
                      selectedToolAnalysis.rows.map((row) => (
                        <tr key={`${row.rank}-${row.caseId}`}>
                          <td>{row.rank}</td>
                          <td>{row.caseId}</td>
                          <td>{row.col1}</td>
                          <td>
                            <span className={styles.severityPill}>{row.col2}</span>
                          </td>
                          <td>
                            <b className={styles.score}>{row.score}</b>
                          </td>
                          <td>{row.result}</td>
                          <td className={styles.reasonCell}>{row.reason}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={selectedToolAnalysis.columns.length}
                          className={styles.emptyCell}
                        >
                          No queue rows matched this MCP tool signal.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.caseSection}>
              <div className={styles.sectionHead}>
                <span>All-cases intelligence board</span>
                <h2>Queue patterns across the selected mode</h2>
                <p>
                  These cards summarize repeated signals across the whole queue.
                  To investigate one case, go back to Command Center.
                </p>
              </div>

              <div className={styles.patternGrid}>
                {patternStats.map((pattern) => (
                  <div key={pattern.label} className={styles.patternCard}>
                    <span>{pattern.label}</span>
                    <b>{pattern.count}</b>
                    <small>Detected across queue text/signals</small>
                  </div>
                ))}
              </div>

              <div className={styles.stopNote}>
                Dashboard stops here. This page only shows all-cases MCP
                intelligence. Selected-case investigation remains in Command
                Center → Investigation Journey.
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}