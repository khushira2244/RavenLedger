import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import styles from './CapabilityCenter.module.css';
import {
  getCase,
  getReport,
  simulateAction,
  getMcpTools,
  simulateMcpTool,
} from '../api/ravenledgerApi';

const MODE_KEY = 'ravenledger_selected_mode';
const SELECTED_CASE_ID_KEY = 'ravenledger:selectedCaseId';
const SELECTED_CASE_DETAIL_KEY = 'ravenledger:selectedCaseDetail';
const SELECTED_ACTION_LOG_KEY = 'ravenledger:selectedActionLog';
const SELECTED_REPORT_KEY = 'ravenledger:selectedReport';

const MODE_LABELS = {
  full: 'Full Multi-Agent Investigation',
  payment_fraud: 'Payment Fraud Investigation',
  insider_behavior: 'Insider Behavior Investigation',
  splunk_evidence: 'Splunk Evidence Investigation',
  policy_audit: 'Policy & Audit Investigation',
};

const MODE_TOOL_MAP = {
  full: [
    'assess_payment_release_risk',
    'rank_high_risk_payments',
    'explain_payment_ranking_reason',
    'check_supplier_blacklist_status',
    'check_supplier_security_context',
    'detect_insider_payment_abuse',
    'retrieve_splunk_evidence_for_case',
    'validate_payment_controls',
    'recommend_business_action',
    'log_human_decision_to_splunk',
  ],
  payment_fraud: [
    'assess_payment_release_risk',
    'rank_high_risk_payments',
    'explain_payment_ranking_reason',
    'check_supplier_blacklist_status',
    'check_supplier_security_context',
    'validate_payment_controls',
    'recommend_business_action',
    'retrieve_splunk_evidence_for_case',
    'log_human_decision_to_splunk',
    'detect_insider_payment_abuse',
  ],
  insider_behavior: [
    'detect_insider_payment_abuse',
    'retrieve_splunk_evidence_for_case',
    'check_supplier_security_context',
    'validate_payment_controls',
    'recommend_business_action',
    'log_human_decision_to_splunk',
    'assess_payment_release_risk',
    'rank_high_risk_payments',
    'explain_payment_ranking_reason',
    'check_supplier_blacklist_status',
  ],
  splunk_evidence: [
    'retrieve_splunk_evidence_for_case',
    'check_supplier_security_context',
    'explain_payment_ranking_reason',
    'validate_payment_controls',
    'recommend_business_action',
    'log_human_decision_to_splunk',
    'assess_payment_release_risk',
    'rank_high_risk_payments',
    'check_supplier_blacklist_status',
    'detect_insider_payment_abuse',
  ],
  policy_audit: [
    'validate_payment_controls',
    'recommend_business_action',
    'log_human_decision_to_splunk',
    'assess_payment_release_risk',
    'explain_payment_ranking_reason',
    'retrieve_splunk_evidence_for_case',
    'check_supplier_security_context',
    'rank_high_risk_payments',
    'check_supplier_blacklist_status',
    'detect_insider_payment_abuse',
  ],
};

const MENU_ITEMS = [
  { id: 7, icon: '🧩', title: 'Splunk MCP Extension', sub: '10 business tools' },
  { id: 1, icon: '🔍', title: 'Splunk Evidence Search', sub: 'BOTS v3 · SPL · REST' },
  { id: 2, icon: '🤖', title: 'AI Agent Workflow', sub: '7 specialists · supervisor' },
  { id: 3, icon: '🛡', title: 'Controls & Guardrails', sub: '6 named controls' },
  { id: 4, icon: '📋', title: 'Audit Report', sub: 'Evidence-backed summary' },
  { id: 5, icon: '✅', title: 'Human Action', sub: 'Analyst approval loop' },
  { id: 6, icon: '🏗', title: 'Architecture Flow', sub: 'System design' },
];

const FALLBACK_AGENTS = [
  { num: '01', icon: '🧾', name: 'Business Risk Agent', desc: 'Finds risky invoice and supplier signals', status: 'DONE', ready: false },
  { num: '02', icon: '🔎', name: 'Insider Behavior Agent', desc: 'Adds CERT user behavior context', status: 'DONE', ready: false },
  { num: '03', icon: '💻', name: 'Splunk Evidence Agent', desc: 'Searches BOTS v3 and attaches telemetry events', status: 'DONE', ready: false },
  { num: '04', icon: '🧠', name: 'Correlation Agent', desc: 'Creates one unified correlation case', status: 'DONE', ready: false },
  { num: '05', icon: '🛡', name: 'Policy Decision Agent', desc: 'Checks named controls and violations', status: 'DONE', ready: false },
  { num: '06', icon: '📄', name: 'Audit Report Agent', desc: 'Generates audit-ready evidence summary', status: 'DONE', ready: false },
  { num: '07', icon: '✅', name: 'Human Action Agent', desc: 'Records analyst decision — awaiting approval', status: 'READY', ready: true },
];

const FALLBACK_CONTROLS = [
  { id: 'CTRL-001', name: 'Supplier Compliance Check', status: 'FAILED', cls: 'sFail' },
  { id: 'CTRL-002', name: 'Procurement Threshold Bypass Check', status: 'FAILED', cls: 'sFail' },
  { id: 'CTRL-003', name: 'Unusual Submission Time Check', status: 'FAILED', cls: 'sFail' },
  { id: 'CTRL-004', name: 'Insider Behavior Context Check', status: 'WARNING', cls: 'sWarn' },
  { id: 'CTRL-005', name: 'Splunk Evidence Attachment', status: 'PASSED', cls: 'sPass' },
  { id: 'CTRL-006', name: 'Human Approval Requirement', status: 'REQUIRED', cls: 'sReq' },
];

const FALLBACK_EVIDENCE_TABLE = [
  { time: '02:41 AM', timeCls: 'tdGreen', host: 'auth-02', sourcetype: 'linux_secure', source: 'botsv3' },
  { time: '02:47 AM', timeCls: 'tdGreen', host: 'erp-gateway', sourcetype: 'app:erp', source: 'botsv3' },
  { time: '02:52 AM', timeCls: 'tdAmber', host: 'finance-api', sourcetype: 'stream:ip', source: 'botsv3' },
  { time: '02:55 AM', timeCls: 'tdAmber', host: 'audit-node', sourcetype: 'wineventlog', source: 'botsv3' },
];

const ARCH_TECH_PILLS = [
  'Splunk Enterprise · BOTS v3',
  'Generated SPL',
  'FastAPI backend',
  'React frontend',
  'Agent wrappers',
  'Audit / action log',
  'MCP-ready business tools',
  'REST / Python live',
];

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function getStatusClass(status = '') {
  const value = String(status).toUpperCase();

  if (value.includes('FAIL')) return 'sFail';
  if (value.includes('WARN')) return 'sWarn';
  if (value.includes('PASS')) return 'sPass';
  if (value.includes('REQUIRED') || value.includes('REQUIRE')) return 'sReq';

  return 'sReq';
}

function normalizeControls(caseDetail) {
  const checklist =
    caseDetail?.control_checklist ||
    caseDetail?.controls ||
    caseDetail?.policy?.control_checklist;

  if (!Array.isArray(checklist) || checklist.length === 0) {
    return FALLBACK_CONTROLS;
  }

  return checklist.map((item, index) => {
    if (typeof item === 'string') {
      return {
        id: `CTRL-${String(index + 1).padStart(3, '0')}`,
        name: item,
        status: 'CHECKED',
        cls: 'sReq',
      };
    }

    const id =
      item.id ||
      item.control_id ||
      `CTRL-${String(index + 1).padStart(3, '0')}`;

    const name =
      item.name ||
      item.control ||
      item.title ||
      item.description ||
      id;

    const status =
      item.status ||
      item.result ||
      item.state ||
      item.decision ||
      'CHECKED';

    return {
      id,
      name,
      status: String(status).toUpperCase(),
      cls: getStatusClass(status),
    };
  });
}

function normalizeEvidenceTable(caseDetail) {
  const rows =
    caseDetail?.splunk_events ||
    caseDetail?.splunk?.events ||
    caseDetail?.evidence_events;

  if (!Array.isArray(rows) || rows.length === 0) {
    return FALLBACK_EVIDENCE_TABLE;
  }

  return rows.slice(0, 6).map((row, index) => ({
    time: row._time || row.time || `event ${index + 1}`,
    timeCls: index < 2 ? 'tdGreen' : 'tdAmber',
    host: row.host || 'unknown-host',
    sourcetype: row.sourcetype || row.source_type || 'unknown',
    source: row.source || 'botsv3',
  }));
}

function getOrderedMcpTools(tools, selectedMode) {
  const order = MODE_TOOL_MAP[selectedMode] || MODE_TOOL_MAP.full;
  const map = new Map(tools.map((tool) => [tool.name, tool]));

  const ordered = order
    .map((toolName) => map.get(toolName))
    .filter(Boolean);

  const remaining = tools.filter((tool) => !order.includes(tool.name));

  return [...ordered, ...remaining];
}

function isModePrimaryTool(toolName, selectedMode) {
  const order = MODE_TOOL_MAP[selectedMode] || MODE_TOOL_MAP.full;

  if (selectedMode === 'full') return true;

  return order.slice(0, 6).includes(toolName);
}

function PanelHead({ eye, title, desc }) {
  return (
    <div className={styles.panelHead}>
      <div className={styles.panelEye}>{eye}</div>
      <h2>{title}</h2>
      <p>{desc}</p>
    </div>
  );
}

function Tab1({ generatedSpl, splunkEvidenceCount, evidenceTable }) {
  const metrics = [
    {
      label: 'Events Attached',
      val: String(splunkEvidenceCount),
      valCls: 'pmValGreen',
      sub: 'BOTS v3 telemetry',
      valStyle: {},
    },
    {
      label: 'Access Mode',
      val: 'REST / Python',
      valCls: '',
      sub: 'Live adapter',
      valStyle: { fontSize: 15 },
    },
    {
      label: 'Fields Available',
      val: '_time · host',
      valCls: '',
      sub: 'sourcetype · source',
      valStyle: { fontSize: 14 },
    },
    {
      label: 'Evidence Role',
      val: 'Telemetry → Case',
      valCls: '',
      sub: 'Connects telemetry to ERP risk',
      valStyle: { fontSize: 13, lineHeight: 1.3 },
    },
  ];

  return (
    <div>
      <PanelHead
        eye="Capability 02"
        title="Splunk Evidence Search"
        desc="RavenLedger uses Splunk telemetry as the evidence layer for ERP payment risk investigation — pulling events from BOTS v3 and attaching them to each case."
      />

      <div className={styles.codeBlock}>
        <div className={styles.codeBar}>
          <span className={`${styles.codeBarDot} ${styles.codeBarDotAmber}`} />
          <span className={styles.codeBarDot} />
          <span className={styles.codeBarDot} />
          <span>spl — botsv3 evidence pull</span>
        </div>

        <pre>
          {generatedSpl.split('\n').map((line, index) => {
            const trimmed = line.trim();

            if (trimmed.startsWith('index=')) {
              return (
                <Fragment key={index}>
                  <span className={styles.splCmd}>index</span>
                  {trimmed.replace('index', '')}
                  {'\n'}
                </Fragment>
              );
            }

            return (
              <Fragment key={index}>
                <span className={styles.splPipe}>|</span>{' '}
                <span className={styles.splField}>
                  {trimmed.replace(/^\|\s*/, '')}
                </span>
                {'\n'}
              </Fragment>
            );
          })}
        </pre>
      </div>

      <div className={styles.proofMetrics}>
        {metrics.map((metric) => (
          <div key={metric.label} className={styles.proofMetric}>
            <div className={styles.pmLabel}>{metric.label}</div>
            <div
              className={`${styles.pmVal} ${metric.valCls ? styles[metric.valCls] : ''
                }`}
              style={metric.valStyle}
            >
              {metric.val}
            </div>
            <div className={styles.pmSub}>{metric.sub}</div>
          </div>
        ))}
      </div>

      <table className={styles.proofTable}>
        <thead>
          <tr>
            <th>_time</th>
            <th>host</th>
            <th>sourcetype</th>
            <th>source</th>
          </tr>
        </thead>
        <tbody>
          {evidenceTable.map((row, index) => (
            <tr key={`${row.time}-${row.host}-${index}`}>
              <td className={styles[row.timeCls]}>{row.time}</td>
              <td>{row.host}</td>
              <td>{row.sourcetype}</td>
              <td>{row.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Tab2({ caseId, riskScore, severity, recommendedAction, splunkEvidenceCount }) {
  const agentMetrics = [
    { label: 'Case Formed', val: caseId, valCls: 'pmValGreen', valStyle: {} },
    { label: 'Risk Score', val: `${riskScore}/100`, valCls: 'pmValAmber', valStyle: {} },
    { label: 'Severity', val: severity, valCls: 'pmValRed', valStyle: {} },
    { label: 'Action', val: recommendedAction, valCls: '', valStyle: { fontSize: 12, lineHeight: 1.3 } },
  ];

  const agents = FALLBACK_AGENTS.map((agent) => {
    if (agent.name === 'Splunk Evidence Agent') {
      return {
        ...agent,
        desc: `Searches BOTS v3 and attaches ${splunkEvidenceCount} telemetry events`,
      };
    }

    if (agent.name === 'Correlation Agent') {
      return {
        ...agent,
        desc: `Creates ${caseId} from all streams`,
      };
    }

    return agent;
  });

  return (
    <div>
      <PanelHead
        eye="Capability 03"
        title="AI Agent Workflow"
        desc="Seven specialist agents — coordinated by a supervisor — convert scattered evidence into one structured investigation case."
      />

      <div className={styles.proofMetrics}>
        {agentMetrics.map((metric) => (
          <div key={metric.label} className={styles.proofMetric}>
            <div className={styles.pmLabel}>{metric.label}</div>
            <div
              className={`${styles.pmVal} ${metric.valCls ? styles[metric.valCls] : ''
                }`}
              style={metric.valStyle}
            >
              {metric.val}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.agentList}>
        {agents.map((agent) => (
          <div key={agent.num} className={styles.agentRow}>
            <span className={styles.arNum}>{agent.num}</span>
            <span className={styles.arIcon}>{agent.icon}</span>
            <div>
              <div className={styles.arName}>{agent.name}</div>
              <div className={styles.arDesc}>{agent.desc}</div>
            </div>
            <span
              className={`${styles.arDone} ${agent.ready ? styles.arDoneReady : ''
                }`}
            >
              {agent.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tab3({ controls, riskScore }) {
  return (
    <div>
      <PanelHead
        eye="Capability 04"
        title="Controls & Guardrails"
        desc="RavenLedger validates every case against named finance, procurement, insider, Splunk evidence, and approval controls — no auto-execution on critical cases."
      />

      <div className={styles.controlChecklist}>
        {controls.map((control) => (
          <div key={`${control.id}-${control.name}`} className={styles.ctrlItem}>
            <div className={styles.ciLeft}>
              <span className={styles.ciId}>{control.id}</span>
              <span className={styles.ciName}>{control.name}</span>
            </div>
            <span className={`${styles.ciStatus} ${styles[control.cls]}`}>
              {control.status}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.proofStatement}>
        The system does not auto-execute risky actions. Critical cases
        {riskScore >= 80 ? ` like this score ${riskScore}/100 case` : ''} are
        routed to human approval before any payment action is taken.
      </div>
    </div>
  );
}

function Tab4({
  caseId,
  invoiceId,
  reportText,
  splunkEvidenceCount,
  recommendedAction,
}) {
  const evidence = [
    'Supplier is blacklisted',
    'Split invoice pattern detected',
    'Unusual insider login context attached',
    `${splunkEvidenceCount} Splunk telemetry events attached`,
    '3 controls failed · 1 warning',
  ];

  return (
    <div>
      <PanelHead
        eye="Capability 05"
        title="Audit Report"
        desc="RavenLedger converts investigation evidence into an audit-ready explanation — readable by Finance, SOC, and Audit teams."
      />

      <div className={styles.auditPreview}>
        <div className={styles.apBar}>
          <span>{caseId}.md</span>
          <span className={styles.apId}>AUDIT REPORT · GENERATED</span>
        </div>

        <div className={styles.apBody}>
          <div className={styles.apSection}>
            <div className={styles.asHead}>Incident</div>
            <p>
              High-risk ERP payment investigation
              <br />
              Case: {caseId} · Invoice: {invoiceId}
            </p>
          </div>

          <div className={styles.apSection}>
            <div className={styles.asHead}>Summary</div>
            <p>
              {reportText ||
                'Business fraud signals, insider-risk context, live Splunk telemetry, and policy controls converged into one high-risk ERP payment case.'}
            </p>
          </div>

          <div className={styles.apSection}>
            <div className={styles.asHead}>Evidence</div>
            <ul>
              {evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className={styles.apReco}>
            ▶ Recommendation: {recommendedAction} and escalate to Finance / SOC
            for manual review.
          </div>
        </div>
      </div>
    </div>
  );
}

function Tab5({ caseId, recommendedAction, actionReason, savedActionLog, onRecordAction }) {
  const actionButtons = [
    { label: recommendedAction, display: `🔒 ${recommendedAction}`, cls: 'actionBtnPrimary' },
    { label: 'Escalate to SOC', display: '🚨 Escalate to SOC', cls: 'actionBtnAmber' },
    { label: 'Send to Finance Review', display: '💼 Send to Finance Review', cls: '' },
    { label: 'Generate Audit Report', display: '📄 Generate Audit Report', cls: '' },
    { label: 'Mark False Positive', display: '✓ Mark False Positive', cls: '' },
  ];

  return (
    <div>
      <PanelHead
        eye="Capability 06"
        title="Human Action"
        desc="RavenLedger keeps the analyst in the loop for all high-risk financial decisions. The Human Action Agent prepares the response — the analyst approves it."
      />

      <div className={styles.actionButtons}>
        {actionButtons.map((button) => (
          <button
            key={button.label}
            className={`${styles.actionBtn} ${button.cls ? styles[button.cls] : ''
              }`}
            onClick={() => onRecordAction(button.label)}
            type="button"
          >
            {button.display}
          </button>
        ))}
      </div>

      {savedActionLog && (
        <div className={styles.actionLog}>
          <div className={styles.alRow}>
            <span className={styles.alK}>Action</span>
            <span className={`${styles.alV} ${styles.alVGreen}`}>
              {savedActionLog.action}
            </span>
          </div>
          <div className={styles.alRow}>
            <span className={styles.alK}>Recorded by</span>
            <span className={styles.alV}>
              {savedActionLog.actor || 'Demo Analyst'}
            </span>
          </div>
          <div className={styles.alRow}>
            <span className={styles.alK}>Case</span>
            <span className={styles.alV}>{savedActionLog.case_id || caseId}</span>
          </div>
          <div className={styles.alRow}>
            <span className={styles.alK}>Status</span>
            <span className={`${styles.alV} ${styles.alVAmber}`}>
              {savedActionLog.status || 'Pending human approval'}
            </span>
          </div>
          <div className={styles.alRow}>
            <span className={styles.alK}>Reason</span>
            <span className={styles.alV}>{savedActionLog.reason || actionReason}</span>
          </div>
        </div>
      )}

      <div className={styles.proofStatement} style={{ marginTop: 16 }}>
        RavenLedger recommends action, but the human analyst approves the
        response. No payment is blocked or released automatically.
      </div>
    </div>
  );
}

function Tab6() {
  return (
    <div>
      <PanelHead
        eye="Capability 07"
        title="Architecture Flow"
        desc="How RavenLedger connects Splunk telemetry, AI agents, policy controls, and human approval into one investigation workflow."
      />

      <div className={styles.architectureFlow}>
        <div className={styles.archCol}>
          <div className={styles.archRow}>
            {['🧾 ERP Invoice Risk', '🔐 CERT Insider Context', '🔍 Splunk BOTS v3', '📜 Policy Rules'].map((name, index) => (
              <Fragment key={name}>
                <div
                  className={`${styles.archNode} ${name.includes('Splunk') ? styles.archNodePine : ''
                    }`}
                >
                  {name}
                </div>
                {index < 3 && <div className={styles.archPlus}></div>}
              </Fragment>
            ))}
          </div>

          <div className={styles.archArrow} />

          <div className={styles.archRow} style={{ marginTop: 24 }}>
            <div
              className={`${styles.archNode} ${styles.archNodePine}`}
              style={{ fontSize: 15, padding: '16px 24px' }}
            >
              🤖 RavenLedger Supervisor Agent
              <br />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 400,
                  opacity: 0.7,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                7 specialist agents coordinated
              </span>
            </div>
          </div>

          <div className={styles.archArrow} />

          <div className={styles.archRow} style={{ marginTop: 24 }}>
            <div className={styles.archNode}>🧠 Correlation Agent</div>
            <div className={styles.archPlus}></div>
            <div className={styles.archNode}>🛡 Policy Decision Agent</div>
          </div>

          <div className={styles.archArrow} />

          <div className={styles.archRow} style={{ marginTop: 24 }}>
            <div className={styles.archNode}>📄 Audit Report</div>
            <div className={styles.archPlus}></div>
            <div className={`${styles.archNode} ${styles.archNodeAmber}`}>
              ✅ Human Action Gate
            </div>
          </div>
        </div>

        <div className={styles.archTech}>
          {ARCH_TECH_PILLS.map((pill) => (
            <span key={pill} className={styles.archPill}>
              {pill}
            </span>
          ))}
        </div>

        <div className={styles.archFinal}>
          <b>RavenLedger</b> is a Security Track solution that uses{' '}
          <b>Splunk telemetry</b> and <b>AI agents</b> to investigate high-risk
          ERP payments — connecting Finance, SOC, Audit, and Splunk into one
          evidence-backed, human-approved workflow before money leaves the
          enterprise.
        </div>
      </div>
    </div>
  );
}

function Tab7({
  mcpData,
  selectedMcpTool,
  onSelectMcpTool,
  simulatedMcpResult,
  onSimulateMcpTool,
  mcpError,
  selectedMode,
}) {
  const mcpDetailRef = useRef(null);
  const hasMountedRef = useRef(false);

  const tools = useMemo(() => {
    return getOrderedMcpTools(mcpData?.tools || [], selectedMode);
  }, [mcpData, selectedMode]);

  const activeTool =
    selectedMcpTool && tools.some((tool) => tool.name === selectedMcpTool.name)
      ? selectedMcpTool
      : tools[0] || null;

  const selectedModeLabel = MODE_LABELS[selectedMode] || MODE_LABELS.full;

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (!selectedMcpTool || !mcpDetailRef.current) return;

    mcpDetailRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [selectedMcpTool]);

  return (
    <div>
      <PanelHead
        eye="Capability 01"
        title="Splunk MCP-ready Business Control Surface"
        desc="Agent-callable business tools that convert Splunk telemetry into payment release decisions, supplier checks, insider-risk correlation, control validation, action recommendation, and human-approved audit logging."
      />

      <div className={styles.proofStatement}>
        Showing MCP tools for selected mode: <b>{selectedModeLabel}</b>. Tool
        definitions are loaded from the backend API, not hardcoded in the frontend.
      </div>

      {mcpError && (
        <div className={styles.proofStatement} style={{ marginTop: 16 }}>
          {mcpError}
        </div>
      )}

      {!mcpError && tools.length === 0 && (
        <div className={styles.proofStatement} style={{ marginTop: 16 }}>
          No MCP tools returned from backend.
        </div>
      )}

      <div className={styles.proofMetrics}>
        <div className={styles.proofMetric}>
          <div className={styles.pmLabel}>Selected Mode</div>
          <div className={styles.pmVal} style={{ fontSize: 14 }}>
            {selectedModeLabel}
          </div>
          <div className={styles.pmSub}>Context-aware tool order</div>
        </div>

        <div className={styles.proofMetric}>
          <div className={styles.pmLabel}>Current Adapter</div>
          <div className={styles.pmVal} style={{ fontSize: 14 }}>
            {mcpData?.current_adapter || 'Not reported by API'}
          </div>
          <div className={styles.pmSub}>Working evidence mode</div>
        </div>

        <div className={styles.proofMetric}>
          <div className={styles.pmLabel}>Target Adapter</div>
          <div className={styles.pmVal} style={{ fontSize: 14 }}>
            {mcpData?.target_adapter || 'Not reported by API'}
          </div>
          <div className={styles.pmSub}>Official mapping direction</div>
        </div>

        <div className={styles.proofMetric}>
          <div className={styles.pmLabel}>Tool Count</div>
          <div className={`${styles.pmVal} ${styles.pmValGreen}`}>
            {mcpData?.tool_count ?? tools.length}
          </div>
          <div className={styles.pmSub}>Backend MCP tools</div>
        </div>
      </div>

      {tools.length > 0 && (
        <div className={styles.mcpGrid}>
          {tools.map((tool) => {
            const modePrimary = isModePrimaryTool(tool.name, selectedMode);

            return (
              <button
                key={tool.name}
                type="button"
                className={`${styles.mcpCard} ${activeTool?.name === tool.name ? styles.mcpCardActive : ''
                  }`}
                onClick={() => onSelectMcpTool(tool)}
              >
                <div className={styles.mcpStatus}>
                  {modePrimary ? 'MODE PRIORITY' : tool.status || 'API Tool'}
                </div>
                <h3>{tool.title || tool.name}</h3>
                <p>{tool.business_effect}</p>
                <span>{tool.used_by_agent}</span>
              </button>
            );
          })}
        </div>
      )}

      {activeTool && (
        <div ref={mcpDetailRef} className={styles.mcpDetail}>
          <div>
            <div className={styles.panelEye}>Selected MCP business tool</div>
            <h3>{activeTool.title || activeTool.name}</h3>
            <p>{activeTool.business_effect}</p>

            <div className={styles.mcpMetaRow}>
              <span>Used by: {activeTool.used_by_agent || 'Not reported by API'}</span>
              <span>{activeTool.status || 'API Tool'}</span>
            </div>

            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => onSimulateMcpTool(activeTool)}
            >
              Simulate Tool Output
            </button>
          </div>

          <div className={styles.mcpJsonGrid}>
            <div className={styles.mcpJsonBox}>
              <b>Input JSON</b>
              <pre>{JSON.stringify(activeTool.input || {}, null, 2)}</pre>
            </div>

            <div className={styles.mcpJsonBox}>
              <b>Output JSON</b>
              <pre>
                {JSON.stringify(
                  simulatedMcpResult?.tool === activeTool.name
                    ? simulatedMcpResult.result
                    : activeTool.output || {},
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </div>
      )}

      {tools.length > 0 && (
        <>
          <div className={styles.nextFlow}>
            <span>Splunk telemetry</span>
            <b>→</b>
            <span>MCP-ready tool</span>
            <b>→</b>
            <span>RavenLedger agent</span>
            <b>→</b>
            <span>Payment/security decision</span>
            <b>→</b>
            <span>Human-approved audit log</span>
          </div>

          <div className={styles.proofStatement} style={{ marginTop: 18 }}>
            RavenLedger does not add MCP for tool count. It defines Splunk
            MCP-ready business tools that help agents decide whether to hold,
            escalate, review, release, or audit a risky ERP payment before money
            leaves.
          </div>
        </>
      )}
    </div>
  );
}

export default function CapabilityCenter({ onBack }) {
  const [activeTab, setActiveTab] = useState(7);
  const panelTopRef = useRef(null);

  const [selectedMode] = useState(() => {
    return localStorage.getItem(MODE_KEY) || 'full';
  });

  const [caseDetail, setCaseDetail] = useState(() => {
    return safeJsonParse(localStorage.getItem(SELECTED_CASE_DETAIL_KEY));
  });

  const [reportText, setReportText] = useState(() => {
    const cachedReport = safeJsonParse(localStorage.getItem(SELECTED_REPORT_KEY));
    return cachedReport?.report || cachedReport?.content || cachedReport?.summary || '';
  });

  const [savedActionLog, setSavedActionLog] = useState(() => {
    return safeJsonParse(localStorage.getItem(SELECTED_ACTION_LOG_KEY));
  });

  const [mcpData, setMcpData] = useState(null);
  const [selectedMcpTool, setSelectedMcpTool] = useState(null);
  const [simulatedMcpResult, setSimulatedMcpResult] = useState(null);
  const [mcpError, setMcpError] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    if (!panelTopRef.current) return;

    panelTopRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [activeTab]);

  useEffect(() => {
    const selectedCaseId =
      localStorage.getItem(SELECTED_CASE_ID_KEY) || 'RL-CORR-0001';

    async function loadCapabilityData() {
      if (!caseDetail) {
        try {
          const data = await getCase(selectedCaseId);
          setCaseDetail(data);
          localStorage.setItem(SELECTED_CASE_DETAIL_KEY, JSON.stringify(data));
        } catch (error) {
          console.error(error);
        }
      }

      if (!reportText) {
        try {
          const report = await getReport(selectedCaseId);
          localStorage.setItem(SELECTED_REPORT_KEY, JSON.stringify(report));
          setReportText(
            report?.report || report?.content || report?.summary || ''
          );
        } catch (error) {
          console.error(error);
        }
      }
    }

    loadCapabilityData();
  }, [caseDetail, reportText]);

  useEffect(() => {
    async function loadMcpTools() {
      try {
        const data = await getMcpTools();
        const tools = getOrderedMcpTools(data?.tools || [], selectedMode);

        setMcpData(data);
        setSelectedMcpTool(tools[0] || null);
        setMcpError('');
      } catch (error) {
        console.error(error);
        setMcpError(
          'MCP tools API is not available. Please start the backend and try again.'
        );
        setMcpData(null);
        setSelectedMcpTool(null);
      }
    }

    loadMcpTools();
  }, [selectedMode]);

  const caseId =
    caseDetail?.correlation_case_id ||
    caseDetail?.case_id ||
    'RL-CORR-0001';

  const invoiceId =
    caseDetail?.invoice_id ||
    caseDetail?.invoice?.invoice_id ||
    'INV_0249564';

  const riskScore =
    caseDetail?.combined_risk_score ||
    caseDetail?.risk_score ||
    89;

  const severity = caseDetail?.severity || 'Critical';

  const recommendedAction =
    caseDetail?.final_recommended_action ||
    caseDetail?.recommended_action ||
    'Hold Payment';

  const splunkEvidenceCount =
    caseDetail?.splunk_evidence_count ||
    caseDetail?.splunk?.evidence_count ||
    caseDetail?.splunk_events?.length ||
    20;

  const generatedSpl =
    caseDetail?.generated_spl ||
    caseDetail?.splunk?.generated_spl ||
    `index=botsv3 earliest=0
| table _time host sourcetype source
| head 20`;

  const controls = useMemo(() => normalizeControls(caseDetail), [caseDetail]);
  const evidenceTable = useMemo(() => normalizeEvidenceTable(caseDetail), [caseDetail]);

  const actionReason =
    `Critical case with blacklisted supplier, split invoice pattern, insider-risk context, failed controls, and ${splunkEvidenceCount} Splunk telemetry events.`;

  async function handleRecordAction(action) {
    const payload = {
      case_id: caseId,
      action,
      actor: 'Demo Analyst',
      reason: actionReason,
    };

    try {
      const response = await simulateAction(payload);

      const log = {
        action,
        actor: 'Demo Analyst',
        case_id: caseId,
        status: response?.status || 'Pending human approval',
        timestamp: response?.timestamp || new Date().toISOString(),
        reason: actionReason,
        response,
      };

      setSavedActionLog(log);
      localStorage.setItem(SELECTED_ACTION_LOG_KEY, JSON.stringify(log));
    } catch (error) {
      console.error(error);

      const fallbackLog = {
        action,
        actor: 'Demo Analyst',
        case_id: caseId,
        status: 'Pending human approval',
        timestamp: new Date().toISOString(),
        reason: actionReason,
      };

      setSavedActionLog(fallbackLog);
      localStorage.setItem(SELECTED_ACTION_LOG_KEY, JSON.stringify(fallbackLog));
    }
  }

  async function handleSimulateMcpTool(tool) {
    if (!tool?.name) return;

    try {
      const response = await simulateMcpTool(tool.name, tool.input || {});
      setSimulatedMcpResult({
        tool: tool.name,
        result: response,
      });
    } catch (error) {
      console.error(error);
      setSimulatedMcpResult({
        tool: tool.name,
        result: {
          error: 'Simulation failed. Check backend endpoint.',
        },
      });
    }
  }

  function handleSelectMcpTool(tool) {
    setSelectedMcpTool(tool);
    setSimulatedMcpResult(null);
  }

  function handleTabChange(tabId) {
    setActiveTab(tabId);
    setSimulatedMcpResult(null);
  }

  const stripItems = [
    { k: 'Track', v: 'Security', vCls: 'tvGreen' },
    { k: 'Mode', v: MODE_LABELS[selectedMode] || MODE_LABELS.full, vCls: 'tvGreen' },
    { k: 'Case', v: caseId, vCls: '' },
    { k: 'Splunk Data', v: 'BOTS v3 telemetry', vCls: '' },
    { k: 'MCP Surface', v: '10 business tools', vCls: 'tvAmber' },
  ];

  const tabProps = {
    1: {
      generatedSpl,
      splunkEvidenceCount,
      evidenceTable,
    },
    2: {
      caseId,
      riskScore,
      severity,
      recommendedAction,
      splunkEvidenceCount,
    },
    3: {
      controls,
      riskScore,
    },
    4: {
      caseId,
      invoiceId,
      reportText,
      splunkEvidenceCount,
      recommendedAction,
    },
    5: {
      caseId,
      recommendedAction,
      actionReason,
      savedActionLog,
      onRecordAction: handleRecordAction,
    },
    6: {},
    7: {
      mcpData,
      selectedMcpTool,
      onSelectMcpTool: handleSelectMcpTool,
      simulatedMcpResult,
      onSimulateMcpTool: handleSimulateMcpTool,
      mcpError,
      selectedMode,
    },
  };

  const ActiveTab =
    {
      1: Tab1,
      2: Tab2,
      3: Tab3,
      4: Tab4,
      5: Tab5,
      6: Tab6,
      7: Tab7,
    }[activeTab] || Tab7;

  return (
    <div>
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <svg viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#064e3b" />
            <path
              d="M8 23L16 7l3.5 7L26 23M12 17h10"
              stroke="#22c55e"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          RavenLedger
        </div>

        <button
          className={styles.navBack}
          onClick={onBack ?? (() => window.history.back())}
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M11 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          BACK
        </button>

        <span className={styles.navTag}>MCP BUSINESS CONTROL SURFACE</span>

        <div className={styles.liveB}>
          <span className={styles.liveDot} />
          Splunk · Live
        </div>
      </nav>

      <div className={styles.topStrip}>
        {stripItems.map((item, index) => (
          <Fragment key={item.k}>
            <div className={styles.tsItem}>
              <span className={styles.tk}>{item.k}</span>
              <span className={`${styles.tv} ${item.vCls ? styles[item.vCls] : ''}`}>
                {item.v}
              </span>
            </div>
            {index < stripItems.length - 1 && (
              <div className={styles.tsSep} />
            )}
          </Fragment>
        ))}
      </div>

      <div className={styles.pageHeading}>
        <div className={styles.phEye}>
          Splunk Agentic Ops Hackathon — Security Track
        </div>
        <h1>
          Splunk MCP-ready <span>Business Control Surface</span>
        </h1>
        <p>
          RavenLedger exposes business-specific MCP-ready tools that turn Splunk
          telemetry into payment-release decisions, supplier checks, insider-risk
          correlation, control validation, action recommendation, and
          human-approved audit logging.
        </p>
      </div>

      <div ref={panelTopRef} className={styles.capabilityPage}>
        <aside className={styles.capabilityMenu}>
          <div className={styles.cmLabel}>MCP + Capabilities</div>

          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`${styles.capabilityMenuItem} ${activeTab === item.id ? styles.capabilityMenuItemActive : ''
                }`}
              onClick={() => handleTabChange(item.id)}
              type="button"
            >
              <div className={styles.cmiIcon}>{item.icon}</div>
              <div className={styles.cmiText}>
                <div className={styles.cmiTitle}>{item.title}</div>
                <div className={styles.cmiSub}>{item.sub}</div>
              </div>
            </button>
          ))}
        </aside>

        <main className={styles.capabilityPanel}>
          <ActiveTab {...tabProps[activeTab]} />
        </main>
      </div>
    </div>
  );
}