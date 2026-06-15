import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import styles from './InvestigationJourney.module.css';
import { getCase, simulateAction } from '../api/ravenledgerApi';
import { useNavigate } from "react-router-dom";

const SELECTED_CASE_ID_KEY = 'ravenledger:selectedCaseId';
const SELECTED_CASE_DETAIL_KEY = 'ravenledger:selectedCaseDetail';
const SELECTED_ACTION_LOG_KEY = 'ravenledger:selectedActionLog';

// fraction of total path progress when each stop activates
const STOP_FRACS = [0, 0.18, 0.37, 0.56, 0.76, 1.0];

const FALLBACK_CONTROLS = [
  { id: 'CTRL-001 Supplier Compliance', status: 'FAILED', cls: 'csFail' },
  { id: 'CTRL-002 Threshold Bypass', status: 'FAILED', cls: 'csFail' },
  { id: 'CTRL-003 Submission Time', status: 'FAILED', cls: 'csFail' },
  { id: 'CTRL-004 Insider Behavior', status: 'WARNING', cls: 'csWarn' },
  { id: 'CTRL-005 Splunk Evidence', status: 'PASSED', cls: 'csPass' },
  { id: 'CTRL-006 Human Approval', status: 'REQUIRED', cls: 'csReq' },
];

function normalizeStatusClass(status = '') {
  const value = String(status).toUpperCase();

  if (value.includes('FAIL')) return 'csFail';
  if (value.includes('WARN')) return 'csWarn';
  if (value.includes('PASS')) return 'csPass';
  if (value.includes('REQUIRED') || value.includes('REQUIRE')) return 'csReq';

  return 'csReq';
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
        id: item,
        status: 'CHECKED',
        cls: 'csReq',
      };
    }

    const id =
      item.id ||
      item.control_id ||
      item.name ||
      item.control ||
      `CTRL-${String(index + 1).padStart(3, '0')}`;

    const status =
      item.status ||
      item.result ||
      item.state ||
      item.decision ||
      'CHECKED';

    return {
      id,
      status: String(status).toUpperCase(),
      cls: normalizeStatusClass(status),
    };
  });
}

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export default function InvestigationJourney({ onBack }) {
  const navigate = useNavigate();

  const pageRef = useRef(null);
  const svgRef = useRef(null);
  const pathRef = useRef(null);
  const activePathRef = useRef(null);
  const dotRef = useRef(null);

  const [caseDetail, setCaseDetail] = useState(null);
  const [apiError, setApiError] = useState('');
  const [actionLog, setActionLog] = useState(() => {
    return safeJsonParse(localStorage.getItem(SELECTED_ACTION_LOG_KEY));
  });
  const [actionLoading, setActionLoading] = useState('');

  // which stops are active: 0 origin, 1 evidence, 2 controls, 3 case, 4 human, 5 final
  const [activeStops, setActiveStops] = useState([
    false,
    false,
    false,
    false,
    false,
    false,
  ]);

  const stopRefs = useRef([]);

  const setStopRef = (index) => (el) => {
    stopRefs.current[index] = el;
  };

  const loadCaseDetail = useCallback(async () => {
    const selectedCaseId =
      localStorage.getItem(SELECTED_CASE_ID_KEY) || 'RL-CORR-0001';

    const cachedCase = localStorage.getItem(SELECTED_CASE_DETAIL_KEY);

    if (cachedCase) {
      const parsed = safeJsonParse(cachedCase);

      if (parsed) {
        setCaseDetail(parsed);
        return;
      }

      localStorage.removeItem(SELECTED_CASE_DETAIL_KEY);
    }

    try {
      const data = await getCase(selectedCaseId);
      setCaseDetail(data);
      localStorage.setItem(SELECTED_CASE_DETAIL_KEY, JSON.stringify(data));
    } catch (error) {
      console.error(error);
      setApiError('Case API failed. Showing demo fallback data.');
    }
  }, []);

  const handleJourneyScroll = useCallback(() => {
    const page = pageRef.current;
    const activePath = activePathRef.current;
    const dot = dotRef.current;

    if (!page || !activePath || !dot) return;

    const pageTop = page.offsetTop;
    const pageHeight = page.offsetHeight;
    const viewportHeight = window.innerHeight;
    const scrollY = window.scrollY;
    const totalLength = activePath.getTotalLength();

    /*
      Start earlier and finish earlier.
      This makes final card active before user reaches page bottom.
    */
    const startScroll = pageTop - viewportHeight * 0.85;
    const endScroll = pageTop + pageHeight - viewportHeight * 1.25;

    const rawProgress = (scrollY - startScroll) / (endScroll - startScroll);
    const progress = Math.min(Math.max(rawProgress, 0), 1);

    const drawn = totalLength * progress;

    activePath.style.strokeDashoffset = totalLength - drawn;

    const position = activePath.getPointAtLength(drawn);
    dot.setAttribute('cx', position.x);
    dot.setAttribute('cy', position.y);

    dot.setAttribute('opacity', progress > 0 && progress < 1 ? '1' : '0');

    /*
      Activate cards based on their own position in viewport.
      This is more reliable than progress only.
    */
    const nextActiveStops = stopRefs.current.map((stop, index) => {
      if (index === 0) return true;
      if (!stop) return false;

      const rect = stop.getBoundingClientRect();
      const cardCenter = rect.top + rect.height / 2;

      return cardCenter < viewportHeight * 0.72;
    });

    setActiveStops(nextActiveStops);
  }, []);

  const buildJourney = useCallback(() => {
    const page = pageRef.current;
    const svg = svgRef.current;

    if (!page || !svg) return;

    const totalHeight = page.offsetHeight;
    const totalWidth = page.offsetWidth;
    const pageRect = page.getBoundingClientRect();

    svg.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);
    svg.setAttribute('height', `${totalHeight}px`);

    const points = stopRefs.current.map((el) => {
      if (!el) return { x: 0, y: 0 };

      const rect = el.getBoundingClientRect();

      return {
        x: rect.left - pageRect.left + rect.width / 2,
        y: rect.top - pageRect.top + rect.height / 2,
      };
    });

    if (
      !points.length ||
      !pathRef.current ||
      !activePathRef.current ||
      !dotRef.current
    ) {
      return;
    }

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let index = 0; index < points.length - 1; index += 1) {
      const pointA = points[index];
      const pointB = points[index + 1];
      const midY = (pointA.y + pointB.y) / 2;

      path += ` C ${pointA.x} ${midY} ${pointB.x} ${midY} ${pointB.x} ${pointB.y}`;
    }

    pathRef.current.setAttribute('d', path);
    activePathRef.current.setAttribute('d', path);

    const totalLength = activePathRef.current.getTotalLength();

    activePathRef.current.style.strokeDasharray = totalLength;
    activePathRef.current.style.strokeDashoffset = totalLength;

    dotRef.current.setAttribute('opacity', '0');

    setActiveStops([true, false, false, false, false, false]);
    handleJourneyScroll();
  }, [handleJourneyScroll]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    });
  }, []);

  useEffect(() => {
    loadCaseDetail();

    const timer = setTimeout(() => {
      buildJourney();
    }, 300);

    window.addEventListener('scroll', handleJourneyScroll, { passive: true });
    window.addEventListener('resize', buildJourney);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleJourneyScroll);
      window.removeEventListener('resize', buildJourney);
    };
  }, [loadCaseDetail, buildJourney, handleJourneyScroll]);

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

  const convergenceReason =
    caseDetail?.ranking_reason ||
    caseDetail?.convergence_reason ||
    caseDetail?.summary ||
    `Blacklisted supplier, split invoice pattern, unusual insider login, failed controls, and ${splunkEvidenceCount} Splunk events converged into one critical ERP payment case.`;

  const controls = useMemo(() => normalizeControls(caseDetail), [caseDetail]);

  const actionReason =
    `Critical case with blacklisted supplier, split invoice pattern, insider-risk context, failed controls, and ${splunkEvidenceCount} Splunk telemetry events.`;

  const handleActionClick = async (action) => {
    if (actionLoading) return;

    setActionLoading(action);

    const payload = {
      case_id: caseId,
      action,
      actor: 'Demo Analyst',
      reason: actionReason,
    };

    try {
      const response = await simulateAction(payload);

      const savedLog = {
        action,
        actor: 'Demo Analyst',
        case_id: caseId,
        status: response?.status || 'Pending Human Approval',
        timestamp: response?.timestamp || new Date().toISOString(),
        reason: actionReason,
        response,
      };

      setActionLog(savedLog);
      localStorage.setItem(SELECTED_ACTION_LOG_KEY, JSON.stringify(savedLog));
    } catch (error) {
      console.error(error);

      const fallbackLog = {
        action,
        actor: 'Demo Analyst',
        case_id: caseId,
        status: 'Pending Human Approval',
        timestamp: new Date().toISOString(),
        reason: actionReason,
        response: null,
      };

      setActionLog(fallbackLog);
      localStorage.setItem(SELECTED_ACTION_LOG_KEY, JSON.stringify(fallbackLog));
      setApiError('Action API failed. Showing local action log fallback.');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div className={styles.investigationShell}>
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
          INVESTIGATION CASE
        </button>

        <span className={styles.navTag}>EVIDENCE · AUDIT · ACTION</span>

        <div className={styles.liveBadge}>
          <span className={styles.liveDot} />
          Splunk · Live
        </div>
      </nav>

      <div className={styles.pageHeader}>
        <div className={styles.phContent}>
          <div className={styles.phLeft}>
            <div className={styles.phEye}>Investigation Journey</div>
            <h1>
              Evidence, Audit
              <br />
              <span>&amp; Action Flow</span>
            </h1>
            <p>
              Splunk provides the evidence trail. RavenLedger agents convert that
              trail into controls, audit context, and a human-approved response.
            </p>
          </div>

          <div className={styles.phBadges}>
            {[
              { label: 'Case ID', value: caseId, cls: '', mono: true },
              { label: 'Invoice', value: invoiceId, cls: '', mono: true },
              { label: 'Risk Score', value: `${riskScore}/100`, cls: '', mono: false },
              { label: 'Severity', value: severity, cls: 'phBCrit', mono: false },
              { label: 'Action', value: recommendedAction, cls: 'phBAct', mono: false },
            ].map((badge) => (
              <div
                key={badge.label}
                className={`${styles.phB} ${badge.cls ? styles[badge.cls] : ''}`}
              >
                <div className={styles.bl}>{badge.label}</div>
                <div className={`${styles.bv} ${badge.mono ? styles.mono : ''}`}>
                  {badge.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.phVisual}>
          <img src="/splunk-orbit.png" alt="Splunk evidence orbit visualization" />
        </div>
      </div>

      {apiError && (
        <div className={styles.apiError}>
          <span>{apiError}</span>
          <button
            type="button"
            className={styles.clearCacheBtn}
            onClick={() => {
              localStorage.removeItem(SELECTED_CASE_DETAIL_KEY);
              setApiError('');
              setCaseDetail(null);
              loadCaseDetail();
            }}
          >
            Retry case API
          </button>
        </div>
      )}

      <div className={styles.journeyPage} ref={pageRef}>
        <svg
          className={styles.journeySvg}
          ref={svgRef}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="pathGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.2" />
            </linearGradient>
            <filter id="dotGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            ref={pathRef}
            fill="none"
            stroke="rgba(34,197,94,0.18)"
            strokeWidth="2.5"
            strokeDasharray="10 14"
            strokeLinecap="round"
          />

          <path
            ref={activePathRef}
            fill="none"
            stroke="url(#pathGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="0 10000"
            style={{ filter: 'drop-shadow(0 0 6px rgba(34,197,94,.7))' }}
          />

          <circle
            ref={dotRef}
            r="7"
            fill="#22c55e"
            opacity="0"
            style={{ filter: 'drop-shadow(0 0 10px rgba(34,197,94,1))' }}
          />
        </svg>

        <div className={styles.journeyStops}>
          <div
            ref={setStopRef(0)}
            className={`${styles.splunkOrigin} ${activeStops[0] ? styles.splunkOriginActive : ''
              }`}
          >
            <div className={styles.soHead}>
              <div className={styles.soIcon}>🔍</div>
              <div>
                <div className={styles.soTitle}>Splunk Evidence Start</div>
                <div className={styles.soSub}>
                  Source of the investigation journey
                </div>
              </div>
            </div>

            <div className={styles.splCode}>
              {generatedSpl.split('\n').map((line, index) => {
                const trimmed = line.trim();

                if (trimmed.startsWith('index=')) {
                  return (
                    <span key={index}>
                      <span className={styles.splCmd}>index</span>
                      {trimmed.replace('index', '')}
                      <br />
                    </span>
                  );
                }

                return (
                  <span key={index}>
                    <span className={styles.splPipe}>|</span>{' '}
                    {trimmed.replace(/^\|\s*/, '')}
                    <br />
                  </span>
                );
              })}
            </div>

            <div className={styles.splPills}>
              <span className={styles.splPill}>
                {splunkEvidenceCount} live events
              </span>
              <span className={styles.splPill}>REST / Python adapter</span>
              <span className={styles.splPill}>
                _time · host · sourcetype · source
              </span>
            </div>
          </div>

          <div
            ref={setStopRef(1)}
            className={`${styles.journeyStop} ${styles.posLeft} ${activeStops[1] ? styles.journeyStopActive : ''
              }`}
          >
            <span className={styles.stopNum}>STOP 01</span>
            <div className={styles.destinationCard}>
              <div className={styles.dcIcon}>📎</div>
              <div className={styles.dcLabel}>Splunk Evidence Agent</div>
              <div className={styles.dcTitle}>Telemetry Linked to Case</div>
              <div className={styles.dcBody}>
                The Splunk Evidence Agent ran the generated SPL against BOTS v3
                and attached {splunkEvidenceCount} telemetry events to the ERP
                payment case. Each event keeps _time, host, sourcetype, and
                source so the investigation has traceable proof, not only a
                risk score.
              </div>
            </div>
          </div>

          <div
            ref={setStopRef(2)}
            className={`${styles.journeyStop} ${styles.posRight} ${activeStops[2] ? styles.journeyStopActive : ''
              }`}
          >
            <span className={styles.stopNum}>STOP 02</span>
            <div className={styles.destinationCard}>
              <div className={styles.dcIcon}>🛡</div>
              <div className={styles.dcLabel}>Policy Decision Agent</div>
              <div className={styles.dcTitle}>Named Controls Checked</div>
              <div className={styles.dcBody}>
                The Policy Decision Agent validates the correlated case against
                finance, procurement, insider, Splunk evidence, and human
                approval controls.
              </div>

              <div className={styles.ctrlList}>
                {controls.map((control) => (
                  <div key={control.id} className={styles.ctrlRow}>
                    <span className={styles.cid}>{control.id}</span>
                    <span className={`${styles.cs} ${styles[control.cls]}`}>
                      {control.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            ref={setStopRef(3)}
            className={`${styles.journeyStop} ${styles.posCenter} ${activeStops[3] ? styles.journeyStopActive : ''
              }`}
          >
            <span className={styles.stopNum}>STOP 03</span>
            <div className={styles.destinationCard}>
              <div className={styles.dcIcon}>📋</div>
              <div className={styles.dcLabel}>Correlation Agent</div>
              <div className={styles.dcTitle}>Case Formed</div>
              <div className={styles.dcBody}>
                The Correlation Agent merges business risk, insider context,
                Splunk telemetry, and policy results into one unified
                investigation case: {caseId}. Risk score: {riskScore}/100.
                Severity: {severity}.
                <br />
                <br />
                {convergenceReason}
              </div>
            </div>
          </div>

          <div
            ref={setStopRef(4)}
            className={`${styles.journeyStop} ${styles.posLeft} ${activeStops[4] ? styles.journeyStopActive : ''
              }`}
          >
            <span className={styles.stopNum}>STOP 04</span>
            <div className={`${styles.destinationCard} ${styles.amberCard}`}>
              <div className={styles.dcIcon}>👤</div>
              <div className={styles.dcLabel}>Human Action Agent</div>
              <div className={styles.dcTitle}>Analyst Approval Gate</div>
              <div className={styles.dcBody}>
                RavenLedger does not automatically block or release money. For a
                Critical payment case, the Human Action Agent pauses the
                workflow and asks a demo analyst to approve the response. This
                keeps the system safe, accountable, and audit-friendly.
              </div>
            </div>
          </div>

          <div
            ref={setStopRef(5)}
            className={`${styles.journeyStop} ${styles.posRight} ${activeStops[5] ? styles.journeyStopActive : ''
              }`}
            style={{ marginBottom: 60 }}
          >
            <span className={styles.stopNum}>STOP 05 · FINAL</span>
            <div className={`${styles.destinationCard} ${styles.finalActionCard}`}>
              <div className={styles.dcIcon}>⚡</div>
              <div className={styles.dcLabel}>Final Response</div>
              <div className={styles.dcTitle}>Human-Approved Response</div>

              <div className={styles.dcBody}>
                After reviewing Splunk evidence, failed controls, and the
                AI-generated recommendation, the analyst can choose the response.
                Recommended action: {recommendedAction}.
              </div>

              <div className={styles.facActions}>
                <button
                  type="button"
                  className={`${styles.facAction} ${styles.facActionPrimary}`}
                  onClick={() => handleActionClick(recommendedAction)}
                  disabled={Boolean(actionLoading)}
                >
                  🔒 {actionLoading === recommendedAction ? 'Recording…' : recommendedAction}
                </button>

                <button
                  type="button"
                  className={`${styles.facAction} ${styles.facActionAmber}`}
                  onClick={() => handleActionClick('Escalate to SOC')}
                  disabled={Boolean(actionLoading)}
                >
                  🚨 {actionLoading === 'Escalate to SOC' ? 'Recording…' : 'Escalate to SOC'}
                </button>

                <button
                  type="button"
                  className={`${styles.facAction} ${styles.facActionFinance}`}
                  onClick={() => handleActionClick('Send to Finance Review')}
                  disabled={Boolean(actionLoading)}
                >
                  💼 {actionLoading === 'Send to Finance Review'
                    ? 'Recording…'
                    : 'Send to Finance Review'}
                </button>
              </div>

              {actionLog && (
                <div
                  style={{
                    marginTop: 16,
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: 'rgba(34,197,94,0.1)',
                    border: '1px solid rgba(34,197,94,0.22)',
                    color: '#bbf7d0',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  <strong>Action recorded:</strong> {actionLog.action}
                  <br />
                  <strong>Actor:</strong> {actionLog.actor}
                  <br />
                  <strong>Status:</strong> {actionLog.status}
                </div>
              )}

              <div className={styles.nextPageWrap}>
                <button
                  type="button"
                  className={styles.nextPageBtn}
                  onClick={() => navigate("/demo/capability")}
                >
                  View Splunk + AI Capability Proof →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}