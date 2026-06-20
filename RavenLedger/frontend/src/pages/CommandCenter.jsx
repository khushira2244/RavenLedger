import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CommandCenter.module.css';
import { runInvestigationApi, getTopRiskCases, getCase } from '../api/ravenledgerApi';

const MODE_KEY = 'ravenledger_selected_mode';

const RUN_COMPLETE_KEY = 'ravenledger:runComplete';
const LAST_RUN_MODE_KEY = 'ravenledger:lastRunMode';

const INVESTIGATION_CACHE_KEY = 'ravenledger:lastInvestigation';
const INVESTIGATION_CACHE_TIME_KEY = 'ravenledger:lastInvestigationTime';
const INVESTIGATION_CACHE_MODE_KEY = 'ravenledger:lastInvestigationMode';

const TOP_CASES_KEY = 'ravenledger:topCases';
const SELECTED_CASE_ID_KEY = 'ravenledger:selectedCaseId';
const SELECTED_CASE_DETAIL_KEY = 'ravenledger:selectedCaseDetail';
const SELECTED_REPORT_KEY = 'ravenledger:selectedReport';
const SELECTED_ACTION_LOG_KEY = 'ravenledger:selectedActionLog';

function safeJsonParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveCachedInvestigation(result, mode) {
  try {
    localStorage.setItem(INVESTIGATION_CACHE_KEY, JSON.stringify(result));
    localStorage.setItem(INVESTIGATION_CACHE_TIME_KEY, new Date().toISOString());
    localStorage.setItem(INVESTIGATION_CACHE_MODE_KEY, mode);
  } catch {
    // Ignore cache failure.
  }
}

function clearCachedInvestigation() {
  try {
    localStorage.removeItem(INVESTIGATION_CACHE_KEY);
    localStorage.removeItem(INVESTIGATION_CACHE_TIME_KEY);
    localStorage.removeItem(INVESTIGATION_CACHE_MODE_KEY);
    localStorage.removeItem(RUN_COMPLETE_KEY);
    localStorage.removeItem(LAST_RUN_MODE_KEY);
  } catch {
    // Ignore cache failure.
  }
}

function clearSelectedCaseContext() {
  try {
    localStorage.removeItem(SELECTED_CASE_ID_KEY);
    localStorage.removeItem(SELECTED_CASE_DETAIL_KEY);
    localStorage.removeItem(SELECTED_REPORT_KEY);
    localStorage.removeItem(SELECTED_ACTION_LOG_KEY);
  } catch {
    // Ignore storage failure.
  }
}

function clearRunContext() {
  try {
    localStorage.removeItem(TOP_CASES_KEY);
    clearSelectedCaseContext();
  } catch {
    // Ignore storage failure.
  }
}

function saveTopCases(cases) {
  try {
    localStorage.setItem(TOP_CASES_KEY, JSON.stringify(cases));
  } catch {
    // Ignore cache failure.
  }
}

function markRunComplete(mode) {
  try {
    localStorage.setItem(RUN_COMPLETE_KEY, 'true');
    localStorage.setItem(LAST_RUN_MODE_KEY, mode);
  } catch {
    // Ignore cache failure.
  }
}

function getCaseId(caseItem) {
  return (
    caseItem?.correlation_case_id ||
    caseItem?.case_id ||
    caseItem?.id ||
    ''
  );
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

const STACK_CARDS = [
  {
    id: 1,
    sc: 'sc1',
    numPillStyle: {},
    numLabel: 'Finance · ERP',
    icon: '🧾',
    title: 'Invoice Risk',
    body: "A $148,200 payment to a flagged supplier is sitting in the ERP queue. Finance sees the amount. They don't see the supplier history, the submission time, or the pattern.",
    badge: { text: 'UNREVIEWED · HIGH RISK', cls: 'sbRed' },
    evidenceLabel: 'Evidence from Finance',
    rows: [
      { k: 'Invoice ID', v: 'INV_0249564', vCls: '' },
      { k: 'Amount', v: '$148,200', vCls: 'evRed' },
      { k: 'Submitted', v: '02:47 AM', vCls: 'evAmber' },
      { k: 'ERP Status', v: 'Pending Release', vCls: 'evAmber' },
      { k: 'AP Analyst', v: 'Not Assigned', vCls: '' },
    ],
  },
  {
    id: 2,
    sc: 'sc2',
    numPillStyle: { background: 'var(--pale)', color: 'var(--pine)' },
    numLabel: 'Procurement',
    icon: '🏭',
    title: 'Supplier Risk',
    body: "The payee is on a blacklist. Procurement flagged them 6 months ago. But that flag lives in a spreadsheet that Finance never sees before releasing payment.",
    badge: { text: 'BLACKLISTED VENDOR', cls: 'sbRed' },
    evidenceLabel: 'Evidence from Procurement',
    rows: [
      { k: 'Supplier', v: 'BLACKLISTED', vCls: 'evRed' },
      { k: 'Flagged', v: '6 months ago', vCls: '' },
      { k: 'Pattern', v: 'Split Invoice', vCls: 'evRed' },
      { k: 'Prior invoices', v: '3 suspicious', vCls: 'evAmber' },
      { k: 'Procurement alert', v: 'Not escalated', vCls: '' },
    ],
  },
  {
    id: 3,
    sc: 'sc3',
    numPillStyle: { background: '#fef3c7', color: '#92400e' },
    numLabel: 'SOC · CERT',
    icon: '🔐',
    title: 'Insider Signal',
    body: "A medium-risk insider user logged in at 2:41 AM — 6 minutes before the invoice was submitted. The SOC sees the login event. They don't see the payment queue.",
    badge: { text: 'INSIDER RISK · MEDIUM', cls: 'sbAmber' },
    evidenceLabel: 'Evidence from SOC',
    rightStyle: { background: 'rgba(0,0,0,.04)', borderColor: 'rgba(113,63,18,.1)' },
    rows: [
      { k: 'User', v: 'medium-risk insider', vCls: 'evAmber' },
      { k: 'Login time', v: '02:41 AM', vCls: 'evAmber' },
      { k: 'Device', v: 'Unknown endpoint', vCls: 'evAmber' },
      { k: 'HTTP activity', v: 'ERP portal accessed', vCls: '' },
      { k: 'SOC action', v: 'None taken', vCls: '' },
    ],
  },
  {
    id: 4,
    sc: 'sc4',
    numPillStyle: { background: '#fee2e2', color: '#991b1b' },
    numLabel: 'Policy · Audit',
    icon: '❌',
    title: 'Control Failures',
    body: "Three named controls have failed for this payment. The 3-way match is broken. The procurement threshold was bypassed. Human approval is missing. Audit doesn't know Finance is about to release.",
    badge: { text: '3 CONTROLS FAILED', cls: 'sbRed' },
    evidenceLabel: 'Evidence from Audit / Policy',
    rightStyle: { background: 'rgba(0,0,0,.03)', borderColor: 'rgba(127,29,29,.1)' },
    rows: [
      { k: 'CTRL-001 Supplier', v: 'FAILED', vCls: 'evRed' },
      { k: 'CTRL-002 Threshold', v: 'FAILED', vCls: 'evRed' },
      { k: 'CTRL-003 Submit time', v: 'FAILED', vCls: 'evRed' },
      { k: 'CTRL-004 Insider', v: 'WARNING', vCls: 'evAmber' },
      { k: 'CTRL-006 Human approval', v: 'REQUIRED', vCls: 'evAmber' },
    ],
  },
  {
    id: 5,
    sc: 'sc5',
    numPillStyle: { background: '#ffedd5', color: '#9a3412' },
    numLabel: 'ERP Queue',
    icon: '💳',
    title: 'Payment Queue',
    body: 'The payment is 40 minutes from scheduled release. No analyst has been assigned. No block is in place. None of the other four signals have been connected to this payment.',
    badge: { text: 'RELEASING IN ~40 MIN', cls: 'sbAmber' },
    evidenceLabel: 'Evidence from ERP Queue',
    rightStyle: { background: 'rgba(0,0,0,.03)', borderColor: 'rgba(124,45,18,.1)' },
    rows: [
      { k: 'Release time', v: '~40 min', vCls: 'evAmber' },
      { k: 'Analyst assigned', v: 'None', vCls: 'evRed' },
      { k: 'Hold placed', v: 'No', vCls: 'evRed' },
      { k: 'Approval status', v: 'Missing', vCls: 'evRed' },
      { k: 'Risk review', v: 'Not triggered', vCls: 'evRed' },
    ],
  },
];

const AGENTS = [
  { id: 1, num: '01', icon: '🧾', name: 'Business Risk Agent', input: 'Invoice + Supplier', output: 'Risky invoice found', isHuman: false },
  { id: 2, num: '02', icon: '🔎', name: 'Insider Behavior Agent', input: 'User activity', output: 'Insider context', isHuman: false },
  { id: 3, num: '03', icon: '💻', name: 'Splunk Evidence Agent', input: 'BOTS v3 · SPL', output: '20 events attached', isHuman: false },
  { id: 4, num: '04', icon: '🧠', name: 'Correlation Agent', input: 'All streams', output: 'Unified case created', isHuman: false },
  { id: 5, num: '05', icon: '🛡', name: 'Policy Decision Agent', input: 'Controls + Risk', output: '6 controls checked', isHuman: false },
  { id: 6, num: '06', icon: '📄', name: 'Audit Report Agent', input: 'Case evidence', output: 'Report generated', isHuman: false },
  { id: 7, num: '07', icon: '✅', name: 'Human Action Agent', input: 'Recommendation', output: 'Hold Payment ready', isHuman: true },
];

const RESULT_CARDS = [
  { icon: '🧾', lbl: 'Invoice', val: 'Risky Invoice', sub: 'Selected case', isAmber: false },
  { icon: '🔎', lbl: 'Insider', val: 'Context Attached', sub: 'Behavior checked', isAmber: false },
  { icon: '💻', lbl: 'Splunk', val: 'Live Evidence', sub: 'Telemetry attached', isAmber: false },
  { icon: '🛡', lbl: 'Controls', val: 'Controls Checked', sub: 'Policy result ready', isAmber: false },
  { icon: '📄', lbl: 'Audit', val: 'Report Ready', sub: 'Evidence summary', isAmber: false },
  { icon: '✅', lbl: 'Action', val: 'Human Review', sub: 'Analyst approval', isAmber: true },
];

const AGENT_STARTS = [600, 2600, 4600, 6600, 8600, 10600, 12600];
const AGENT_ENDS = [2100, 4100, 6100, 8100, 10100, 12100, 14100];

export default function CommandCenter() {
  const navigate = useNavigate();
  const agentSectionRef = useRef(null);

  const selectedMode = localStorage.getItem(MODE_KEY) || 'full';

  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const [agentSectionVisible, setAgentSectionVisible] = useState(false);
  const [agentStates, setAgentStates] = useState(() => AGENTS.map(() => 'waiting'));
  const [resultVisible, setResultVisible] = useState(false);
  const [verdictVisible, setVerdictVisible] = useState(false);
  const [badgeComplete, setBadgeComplete] = useState(false);
  const [apiResult, setApiResult] = useState(null);
  const [apiError, setApiError] = useState('');
  const [topCases, setTopCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [queueVisible, setQueueVisible] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    const cachedRunComplete = localStorage.getItem(RUN_COMPLETE_KEY) === 'true';
    const lastRunMode = localStorage.getItem(LAST_RUN_MODE_KEY);
    const cachedCases = safeJsonParse(localStorage.getItem(TOP_CASES_KEY), []);
    const cachedSelectedCaseId = localStorage.getItem(SELECTED_CASE_ID_KEY) || '';

    const canRestore =
      cachedRunComplete &&
      lastRunMode === selectedMode &&
      Array.isArray(cachedCases) &&
      cachedCases.length > 0;

    setRunning(false);
    setAgentStates(AGENTS.map(() => 'waiting'));
    setApiError('');

    if (canRestore) {
      setComplete(true);
      setAgentSectionVisible(true);
      setResultVisible(true);
      setVerdictVisible(true);
      setBadgeComplete(true);
      setApiResult(safeJsonParse(localStorage.getItem(INVESTIGATION_CACHE_KEY), null));
      setTopCases(cachedCases);
      setQueueVisible(true);
      setSelectedCaseId(cachedSelectedCaseId || getCaseId(cachedCases[0]) || '');
    } else {
      setComplete(false);
      setAgentSectionVisible(false);
      setResultVisible(false);
      setVerdictVisible(false);
      setBadgeComplete(false);
      setApiResult(null);
      setTopCases([]);
      setSelectedCaseId('');
      setQueueVisible(false);
    }
  }, [selectedMode]);

  const setAgentState = useCallback((idx, state) => {
    setAgentStates((prev) => {
      const next = [...prev];
      next[idx] = state;
      return next;
    });
  }, []);

  const selectCase = useCallback(async (caseId) => {
    if (!caseId) return;

    setSelectedCaseId(caseId);
    localStorage.setItem(SELECTED_CASE_ID_KEY, caseId);
    localStorage.removeItem(SELECTED_REPORT_KEY);
    localStorage.removeItem(SELECTED_ACTION_LOG_KEY);

    try {
      const caseDetail = await getCase(caseId);
      localStorage.setItem(SELECTED_CASE_DETAIL_KEY, JSON.stringify(caseDetail));
    } catch (error) {
      console.error(error);
      localStorage.removeItem(SELECTED_CASE_DETAIL_KEY);
    }
  }, []);

  const openCase = useCallback(async (caseId) => {
    if (!caseId) return;
    await selectCase(caseId);
    navigate('/demo/case');
  }, [navigate, selectCase]);

  const runInvestigation = useCallback(async () => {
    if (running) return;

    setRunning(true);
    setComplete(false);
    setApiError('');
    setApiResult(null);
    setTopCases([]);
    setSelectedCaseId('');
    setQueueVisible(false);
    setResultVisible(false);
    setVerdictVisible(false);
    setBadgeComplete(false);
    setAgentStates(AGENTS.map(() => 'waiting'));

    clearCachedInvestigation();
    clearRunContext();

    setAgentSectionVisible(true);

    setTimeout(() => {
      agentSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 150);

    try {
      const result = await runInvestigationApi(selectedMode);
      setApiResult(result);
      saveCachedInvestigation(result, selectedMode);

      const topRiskPayload = await getTopRiskCases(20);
      const cases = normalizeTopCases(topRiskPayload);

      setTopCases(cases);
      saveTopCases(cases);
      setQueueVisible(cases.length > 0);

      const firstCaseId = getCaseId(cases[0]);
      if (firstCaseId) {
        await selectCase(firstCaseId);
      }

      markRunComplete(selectedMode);
    } catch (error) {
      console.error(error);
      setApiError('Backend API failed. No previous queue is shown. Please rerun after backend is ready.');
      setTopCases([]);
      setSelectedCaseId('');
      setQueueVisible(false);
      clearCachedInvestigation();
      clearRunContext();
    }

    AGENTS.forEach((_, i) => {
      setTimeout(() => setAgentState(i, 'running'), AGENT_STARTS[i]);
      setTimeout(() => setAgentState(i, 'done'), AGENT_ENDS[i]);
    });

    setTimeout(() => setResultVisible(true), 6600);
    setTimeout(() => {
      setVerdictVisible(true);
      setBadgeComplete(true);
      setComplete(true);
      setRunning(false);
    }, 7300);
  }, [running, selectedMode, selectCase, setAgentState]);

  const agentStatusText = (state, isHuman) => {
    if (state === 'running') return 'RUNNING';
    if (state === 'done') return isHuman ? 'READY' : 'DONE';
    return 'WAITING';
  };

  const agentStatusCls = (state, isHuman) => {
    if (state === 'running') return styles.stR;
    if (state === 'done') return isHuman ? styles.stH : styles.stD;
    return styles.stW;
  };

  void apiResult;

  const visibleTopCases = queueVisible ? topCases : [];

  const selectedCase = useMemo(() => {
    return (
      visibleTopCases.find((item) => getCaseId(item) === selectedCaseId) ||
      visibleTopCases[0] ||
      null
    );
  }, [visibleTopCases, selectedCaseId]);

  const selectedInvoice =
    selectedCase?.invoice_id ||
    selectedCase?.invoice ||
    selectedCase?.invoice_number ||
    'Generated after run';

  const selectedScore =
    selectedCase?.combined_risk_score ??
    selectedCase?.risk_score ??
    selectedCase?.score ??
    '—';

  const selectedSeverity =
    selectedCase?.severity ||
    selectedCase?.risk_level ||
    selectedCase?.priority ||
    'Pending';

  const selectedReason =
    selectedCase?.ranking_reason ||
    selectedCase?.reason ||
    'Run the selected investigation mode to generate a fresh top-risk queue.';

  const selectedAction =
    selectedCase?.final_recommended_action ||
    selectedCase?.recommended_action ||
    'Pending investigation';

  return (
    <div>
      {running && !complete && (
      <div className={styles.fullPageLoader}>
        <div className={styles.loaderCard}>
          <div className={styles.loaderSpinner} />
          <div className={styles.loaderTitle}>Splunking...</div>
          <div className={styles.loaderSub}>Running 7-agent investigation</div>
        </div>
      </div>
    )}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <svg viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#064e3b" />
            <path d="M8 23L16 7l3.5 7L26 23M12 17h10" stroke="#22c55e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          RavenLedger
        </div>
        <span className={styles.navTag}>COMMAND CENTER</span>
        <div className={styles.liveBadge}>
          <span className={styles.liveDot} />
          Splunk Enterprise · Connected · Live
        </div>
      </nav>

      <div className={styles.heroHeader}>
        <div className={styles.hhInner}>
          <div className={styles.hhEye}>Multi-Agent ERP Payment Risk Investigator</div>
          <h1 className={styles.hhTitle}>
            RavenLedger<br /><span>Command Center</span>
          </h1>
          <p className={styles.hhSub}>
            A supplier payment is queued for release. Evidence is scattered across Finance, SOC, Audit, ERP, and Splunk. Nobody sees the full picture before money leaves the enterprise.
          </p>
          <div className={styles.hhMeta}>
            <div className={styles.hhM}><b>Mode</b> · {selectedMode}</div>
            <div className={styles.hhM}><b>Finance</b> · Payment Risk</div>
            <div className={styles.hhM}><b>SOC</b> · Splunk Evidence</div>
            <div className={styles.hhM}><b>Audit</b> · Controls</div>
          </div>
        </div>
      </div>

      {apiError && (
        <div className={styles.apiError}>
          <span>{apiError}</span>
          <button
            type="button"
            className={styles.clearCacheBtn}
            onClick={() => {
              clearCachedInvestigation();
              clearRunContext();
              setApiError('');
              setApiResult(null);
              setTopCases([]);
              setSelectedCaseId('');
              setQueueVisible(false);
              setComplete(false);
              setAgentSectionVisible(false);
              setResultVisible(false);
              setVerdictVisible(false);
              setBadgeComplete(false);
            }}
          >
            Clear cache/context
          </button>
        </div>
      )}

      <div className={styles.problemIntro}>
        <div className={styles.piLabel}>The Problem</div>
        <h2 className={styles.piTitle}>Risk signals are scattered. No team sees the full story.</h2>
        <p className={styles.piSub}>
          Finance sees invoice risk. SOC sees unusual login. Audit sees control gaps. Splunk has telemetry.
          Scroll through the evidence pile — then let RavenLedger solve it.
        </p>
      </div>

      <div className={styles.stackContainer}>
        {STACK_CARDS.map((card) => {
          const scIdx = card.id;
          const titleCls = styles[`sc${scIdx}Title`] || '';
          const numCls = styles[`sc${scIdx}Num`] || '';
          const bodyCls = styles[`sc${scIdx}Body`] || '';
          const rightCls = styles[`sc${scIdx}Right`] || '';

          return (
            <div key={card.id} className={`${styles.stackCard} ${styles[card.sc]}`}>
              <div className={styles.scLeft}>
                <div className={`${styles.scNum} ${numCls}`}>
                  <span className={styles.numPill} style={card.numPillStyle}>
                    {String(card.id).padStart(2, '0')}
                  </span>
                  {card.numLabel}
                </div>
                <span className={styles.scIconBig}>{card.icon}</span>
                <h3 className={`${styles.scTitle} ${titleCls}`}>{card.title}</h3>
                <p className={`${styles.scBody} ${bodyCls}`}>{card.body}</p>
                <span className={`${styles.statusBadge} ${styles[card.badge.cls]}`}>
                  {card.badge.text}
                </span>
              </div>

              <div className={`${styles.scRight} ${rightCls}`} style={card.rightStyle}>
                <div className={styles.evLabel}>{card.evidenceLabel}</div>
                <div className={styles.evRows}>
                  {card.rows.map((row, ri) => (
                    <div key={ri} className={styles.evRow}>
                      <span className={styles.ek}>{row.k}</span>
                      <span className={`${styles.ev} ${row.vCls ? styles[row.vCls] : ''}`}>
                        {row.v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.solveSection}>
        <div className={styles.ssLeft}>
          <h2>
            {complete
              ? 'Investigation result restored for this mode.'
              : '5 scattered signals. 0 connections. Payment releasing in 40 minutes.'}
          </h2>
          <p>
            {complete
              ? 'The completed queue is still available because you returned from the MCP Dashboard or case view. Start from Select Mode if you want a fresh investigation.'
              : 'RavenLedger sends a supervisor agent to coordinate 7 specialists — fusing every signal into one audit-ready case before money leaves the enterprise.'}
          </p>
        </div>
        <button
          className={styles.solveBtn}
          onClick={runInvestigation}
          disabled={running}
          style={{
            opacity: running && !complete ? 0.6 : 1,
            background: complete ? 'var(--emerald)' : 'var(--signal)',
          }}
        >
          <span className={styles.btnPulse} />
          {complete ? '✓ Investigation Complete' : running ? 'Running 7 Agents…' : 'Solve with 7 Agents'}
          {!running && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      <div
        ref={agentSectionRef}
        className={`${styles.agentSection} ${agentSectionVisible ? styles.agentSectionVisible : ''}`}
      >
        <div className={styles.asTop}>
          <h2>7-Agent Investigation Pipeline</h2>
          <span className={`${styles.asBadge} ${badgeComplete ? styles.asBadgeComplete : ''}`}>
            {badgeComplete ? 'COMPLETE' : 'SUPERVISOR RUNNING'}
          </span>
        </div>

        <div className={styles.splunkCore}>
          <span className={styles.skIcon}>🔍</span>
          <div className={styles.skText}>
            <div className={styles.skName}>Splunk Evidence Core</div>
            <div className={styles.skSub}>Events · Logs · Metrics · Traces · BOTS v3</div>
          </div>
          <div className={styles.skLive}>
            <span className={styles.liveDot} />
            Live · indexed evidence layer
          </div>
        </div>

        <div className={styles.agentsRow}>
          {AGENTS.map((ag, i) => {
            const state = agentStates[i];

            return (
              <div
                key={ag.id}
                className={[
                  styles.agCard,
                  ag.isHuman ? styles.agCardHuman : '',
                  state === 'running' ? styles.running : '',
                  state === 'done' ? styles.done : '',
                ].join(' ')}
              >
                <div className={styles.agN}>{ag.num}</div>
                <div className={styles.agIco}>{ag.icon}</div>
                <div className={styles.agName}>{ag.name}</div>
                <div className={styles.agIn}><span className={styles.ioL}>IN</span> {ag.input}</div>
                <div className={`${styles.agOut} ${ag.isHuman ? styles.agOutAmber : ''}`}>
                  <span className={styles.ioL}>OUT</span> {ag.output}
                </div>
                <div className={`${styles.agSt} ${agentStatusCls(state, ag.isHuman)}`}>
                  {agentStatusText(state, ag.isHuman)}
                </div>
              </div>
            );
          })}
        </div>

        <div className={`${styles.resultRow} ${resultVisible ? styles.resultRowShow : ''}`}>
          {RESULT_CARDS.map((rc, i) => (
            <div key={i} className={`${styles.rrCard} ${rc.isAmber ? styles.rrCardAmber : ''}`}>
              <div className={styles.rrIco}>{rc.icon}</div>
              <div className={styles.rrLbl}>{rc.lbl}</div>
              <div className={styles.rrVal}>{rc.val}</div>
              <div className={`${styles.rrSub} ${rc.isAmber ? styles.rrSubAmber : ''}`}>{rc.sub}</div>
            </div>
          ))}
        </div>

        {complete && visibleTopCases.length > 0 && (
          <div className={styles.mcpDashboardCta}>
            <div>
              <span className={styles.mcpDashboardEyebrow}>
                MCP Case Analysis Ready
              </span>
              <h3>{visibleTopCases.length} cases analyzed by Splunk MCP-ready business tools</h3>
              <p>
                Open the MCP dashboard to see the 10 business tools, combined risk
                analysis, and queue-level intelligence for this investigation mode.
              </p>
            </div>

            <button
              type="button"
              className={styles.mcpDashboardBtn}
              onClick={() => navigate('/demo/mcp-dashboard')}
            >
              Open MCP Dashboard
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        )}

        {queueVisible && visibleTopCases.length > 0 && (
          <div
            style={{
              marginTop: 24,
              padding: 18,
              borderRadius: 24,
              background: 'rgba(255,255,255,.78)',
              border: '1px solid rgba(15,23,42,.10)',
              boxShadow: '0 18px 50px rgba(15,23,42,.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--pine)' }}>
                  Top Risk Queue
                </div>
                <h3 style={{ margin: '4px 0 0', fontSize: 22 }}>Select a case to investigate</h3>
              </div>
              <span className={`${styles.asBadge} ${styles.asBadgeComplete}`}>
                {visibleTopCases.length} cases
              </span>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {visibleTopCases.map((caseItem, index) => {
                const caseId = getCaseId(caseItem);
                const isSelected = caseId === selectedCaseId;
                const score =
                  caseItem?.combined_risk_score ??
                  caseItem?.risk_score ??
                  caseItem?.score ??
                  caseItem?.riskScore ??
                  '—';
                const invoice =
                  caseItem?.invoice_id ||
                  caseItem?.invoice ||
                  caseItem?.invoice_number ||
                  'Invoice pending';
                const supplier =
                  caseItem?.supplier_name ||
                  caseItem?.supplier ||
                  caseItem?.vendor_name ||
                  caseItem?.vendor ||
                  'Supplier review';
                const severity =
                  caseItem?.severity ||
                  caseItem?.risk_level ||
                  caseItem?.priority ||
                  'HIGH';

                return (
                  <button
                    key={caseId || index}
                    type="button"
                    onClick={() => selectCase(caseId)}
                    style={{
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: '48px 1.2fr .8fr 96px',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      borderRadius: 18,
                      border: isSelected ? '2px solid var(--emerald)' : '1px solid rgba(15,23,42,.10)',
                      background: isSelected ? 'rgba(34,197,94,.10)' : 'rgba(255,255,255,.86)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <b style={{ color: 'var(--pine)' }}>#{index + 1}</b>
                    <span>
                      <b>{caseId || 'Unknown case'}</b>
                      <span style={{ display: 'block', marginTop: 3, opacity: 0.68 }}>
                        {invoice}
                      </span>
                    </span>
                    <span>
                      <b>{supplier}</b>
                      <span style={{ display: 'block', marginTop: 3, opacity: 0.68 }}>
                        {severity}
                      </span>
                    </span>
                    <span style={{ fontWeight: 900, color: 'var(--danger)' }}>
                      {score}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

       

        {complete && selectedCaseId && (
          <div className={styles.nextRouteWrap}>
            <button
              type="button"
              className={styles.nextRouteBtn}
              onClick={() => openCase(selectedCaseId)}
            >
              View Investigation Case
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}