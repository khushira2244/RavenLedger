import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import styles from './LandingPage.module.css';

const DEMO_VIDEO_URL = "https://vimeo.com/1201457500";

// ─── DATA ──────────────────────────────────────────────────────────────────────

const ACC_ITEMS = [
  { title: 'Investigate High-Risk Payments', body: 'Find risky invoices, blacklisted suppliers, split invoice patterns, and late-night submissions — ranked in a Top Risk Queue where every case carries a plain-language ranking reason.' },
  { title: 'Correlate Insider Behavior', body: 'Attach user logon, device, and web activity from insider-risk datasets.' },
  { title: 'Query Splunk Live', body: 'Generate SPL and retrieve live BOTS v3 evidence from Splunk Enterprise.' },
  { title: 'Trigger Human-in-Loop Actions', body: 'Hold payment, escalate to SOC, send to Finance Review, or mark false positive.' },
  { title: 'Generate Audit Reports', body: 'Create audit-ready markdown reports with evidence, policy violations, and final recommendation.' },
];

const FLOW_STEPS = [
  { num: '01', name: 'Business Risk Agent', hint: 'Risky invoices, supplier and fraud signals', human: false },
  { num: '02', name: 'Insider Behavior Agent', hint: 'CERT logon, device, and http context', human: false },
  { num: '03', name: 'Splunk Evidence Agent', hint: 'Generates SPL, pulls live BOTS v3 events', human: false },
  { num: '04', name: 'Correlation Agent', hint: 'Fuses all streams into one case', human: false },
  { num: '05', name: 'Policy Decision Agent', hint: 'Named controls and escalation targets', human: false },
  { num: '06', name: 'Audit Report Agent', hint: 'Audit-ready markdown report', human: false },
  { num: '07', name: 'Human Action Agent', hint: 'Records only what the analyst approves', human: true },
];

const METRICS = [
  { num: '7', head: 'Specialist Agents', body: 'Coordinated by one supervisor — business risk, insider, Splunk, correlation, policy, audit, response.' },
  { num: '6', head: 'Named Controls', body: 'Every case checked against CTRL-mapped policy controls — passed, failed, warning, or required.' },
  { num: '20', head: 'Live Splunk Events', body: 'Attached to every investigation package, with host, sourcetype, and timestamp.' },
  { num: '1', head: 'Unified Case', body: 'Finance, SOC, and Audit context in a single evidence-backed view.' },
];

const STREAMS = [
  { dotColor: 'var(--signal-dim)', title: 'Business Risk Stream', items: ['Fraud label present', 'Supplier is blacklisted', 'Split invoice pattern detected', 'Late-night submission detected'] },
  { dotColor: 'var(--risk)', title: 'Insider Behavior Stream', items: ['Medium-risk insider user', 'High activity pattern', 'Logon, device, and http context'] },
  { dotColor: 'var(--pine)', title: 'Splunk Evidence Stream', items: ['20 live BOTS v3 events', 'host · sourcetype · source', 'Timestamped telemetry'] },
];

const CONTROLS = [
  { id: 'CTRL-001', name: 'Supplier Compliance Check', status: 'FAILED', cls: 'statusFailed' },
  { id: 'CTRL-002', name: 'Procurement Threshold Bypass', status: 'FAILED', cls: 'statusFailed' },
  { id: 'CTRL-003', name: 'Unusual Submission Time', status: 'FAILED', cls: 'statusFailed' },
  { id: 'CTRL-004', name: 'Insider Behavior Context', status: 'WARNING', cls: 'statusWarning' },
  { id: 'CTRL-005', name: 'Splunk Evidence Attachment', status: 'PASSED', cls: 'statusPassed' },
  { id: 'CTRL-006', name: 'Human Approval Requirement', status: 'REQUIRED', cls: 'statusRequired' },
];

const CHECK_ITEMS = [
  'Hold payment for manual review',
  'Escalate to SOC analyst',
  'Send to Finance Review',
  'Generate audit report',
  'Mark as false positive',
];

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="rgba(25,224,124,.12)" />
    <path d="M8 12.5l2.6 2.6L16.5 9" stroke="#19E07C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── ACCORDION ────────────────────────────────────────────────────────────────

function Accordion() {
  const [openIdx, setOpenIdx] = useState(0);
  const bodyRefs = useRef([]);

  const toggle = useCallback((idx) => {
    setOpenIdx(prev => prev === idx ? -1 : idx);
  }, []);

  return (
    <div>
      {ACC_ITEMS.map((item, i) => {
        const isOpen = openIdx === i;
        return (
          <div
            key={item.title}
            className={`${styles.accItem} ${isOpen ? styles.accItemOpen : ''}`}
          >
            <button
              className={`${styles.accBtn} ${isOpen ? styles.accBtnOpen : ''}`}
              aria-expanded={isOpen}
              onClick={() => toggle(i)}
            >
              {item.title}
              <span className={`${styles.chev} ${isOpen ? styles.chevOpen : ''}`}>
                <ChevIcon />
              </span>
            </button>
            <div
              className={styles.accBody}
              ref={el => bodyRefs.current[i] = el}
              style={{ maxHeight: isOpen ? (bodyRefs.current[i]?.scrollHeight + 'px') : '0px' }}
            >
              <p>{item.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── SCROLL REVEAL HOOK ───────────────────────────────────────────────────────

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add(styles.revealIn);
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));

    // reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('animateMotion').forEach(a => a.remove());
    }

    return () => observer.disconnect();
  }, []);
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function LandingPage() {
  useScrollReveal();

  return (
    <div>
      {/* ── NAV ── */}
      <nav className={styles.nav}>
        <div className={`${styles.wrap} ${styles.navInner}`}>
          <a href="#" className={styles.logo}>
            <svg className={styles.logoMark} viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <rect width="40" height="40" rx="10" fill="#19E07C" />
              <path d="M11 28 L20 9 L24 17 L29 28 M16.5 21 H26" stroke="#0A1A11" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            RavenLedger
          </a>
          <div className={styles.navLinks}>
            <a href="#platform">Platform</a>
            <a href="#workflow">Agents</a>
            <a href="#capability">Capability</a>
            <a href="#queue">Queue</a>
            <a href="#evidence">Splunk Evidence</a>
          </div>
          <Link to="/demo/select" className={`${styles.btn} ${styles.btnSolid} ${styles.navCta}`}>Run Investigation</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <header className={styles.hero}>
        <div className={`${styles.wrap} ${styles.heroGrid}`}>
          <div>
            <h1 className={styles.heroH1}>RavenLedger</h1>
            <div className={styles.tagline}>Multi-Agent ERP Payment Risk Investigator on Splunk</div>
            <p className={styles.heroSub}>Before money leaves the enterprise, a supervisor agent coordinates seven specialists to fuse ERP fraud signals, insider behavior, and live Splunk evidence into one human-approved, audit-ready case.</p>
            <div className={styles.heroCtas}>
              <Link to="/demo/select" className={`${styles.btn} ${styles.btnSolid}`}>
                Run RavenLedger Investigation <ArrowIcon />
              </Link>
              <a href="#architecture" className={`${styles.btn} ${styles.btnGhost}`}>
                See Architecture
              </a>
            </div>
          </div>

          {/* case card + satellites */}
          <div className={styles.caseWrap}>
            <div className={`${styles.floatCard} ${styles.floatSplunk}`} aria-label="Splunk connection status">
              <div className={styles.fLabel}>Splunk Enterprise</div>
              <div className={styles.fValue}><span className={styles.pulse} aria-hidden="true" />&nbsp;Connected · Live</div>
            </div>

            <aside className={styles.caseCard} aria-label="Sample high-risk payment case">
              <div className={styles.caseHead}>
                <span className={styles.caseTitle}>
                  <span className={styles.rankTag}>#1 IN QUEUE</span>High-Risk Payment Case
                </span>
                <span className={styles.badgeHigh}>CRITICAL</span>
              </div>
              <div className={styles.riskMeter}>
                <div className={styles.riskBar}><div className={styles.riskFill} /></div>
                <div className={styles.riskNums}>
                  <span>4 risk signals detected</span>
                  <span className={styles.scoreSmall}>score 89/100</span>
                </div>
              </div>
              <div className={styles.chips} aria-label="Contributing risk factors">
                <span className={styles.chip}><span className={`${styles.cdot} ${styles.cdotHi}`} />Blacklisted supplier</span>
                <span className={styles.chip}><span className={`${styles.cdot} ${styles.cdotHi}`} />Split invoice pattern</span>
                <span className={styles.chip}><span className={`${styles.cdot} ${styles.cdotMed}`} />2:47 AM submission</span>
                <span className={styles.chip}><span className={`${styles.cdot} ${styles.cdotMed}`} />Insider signal match</span>
              </div>
              <div className={styles.whyFirst}>
                <b>Why this case first?</b>
                Only case combining blacklisted supplier, split-invoice pattern, insider-risk context, and 20 live Splunk events.
              </div>
              <div className={styles.caseRows}>
                <div className={styles.caseRow}><span className={styles.caseRowK}>Case</span><span className={styles.caseRowV}>RL-CORR-0001 · INV_0249564</span></div>
                <div className={styles.caseRow}><span className={styles.caseRowK}>Splunk Evidence</span><span className={`${styles.caseRowV} ${styles.caseRowVGreen}`}>20 live events</span></div>
                <div className={styles.caseRow}><span className={styles.caseRowK}>Controls</span><span className={styles.caseRowV}>3 failed · 1 warn · 1 pass · 1 req</span></div>
              </div>
              <div className={styles.caseAction}>
                <span className={styles.pulse} aria-hidden="true" /> Action: Hold for human review
              </div>
            </aside>

            <div className={`${styles.floatCard} ${styles.floatTime}`} aria-label="Investigation workflow improvement">
              <div className={styles.fLabel}>Investigation Workflow</div>
              <div className={styles.fValue}>
                <span className={styles.ftOld}>Hours</span>
                <span className={styles.ftArrow}>→</span>
                <span className={styles.ftNew}>Minutes</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── VALUE ── */}
      <section className={styles.section} id="platform">
        <div className={styles.wrap}>
          <span className={styles.eyebrow} data-reveal="">Why RavenLedger</span>
          <h2 className={`${styles.valueH2} ${styles.reveal}`} data-reveal="">Supercharge ERP risk investigations across Finance, SOC, and Audit.</h2>
          <p className={`${styles.valueSmall} ${styles.reveal}`} data-reveal="">RavenLedger reduces fragmented investigation work by letting a supervisor agent coordinate specialist agents across invoice fraud, supplier risk, insider activity, and live Splunk telemetry — one evidence-backed workflow.</p>
          <div className={styles.twoCards}>
            <div className={`${styles.vcard} ${styles.reveal}`} data-reveal="">
              <div className={styles.vcardIcon} aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 7h6M4 12h10M4 17h6" stroke="#19E07C" strokeWidth="2" strokeLinecap="round" /><circle cx="17" cy="7" r="3" stroke="#19E07C" strokeWidth="2" /><path d="M19.5 9.5 22 12" stroke="#19E07C" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
              <h3 className={styles.vcardH3}>Eliminate Investigation Gaps</h3>
              <p className={styles.vcardP}>Finance sees risky payments. SOC sees security events. Audit sees policy violations. RavenLedger connects these signals into one investigation case.</p>
            </div>
            <div className={`${styles.vcard} ${styles.reveal}`} data-reveal="">
              <div className={styles.vcardIcon} aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" stroke="#19E07C" strokeWidth="2" strokeLinejoin="round" /></svg>
              </div>
              <h3 className={styles.vcardH3}>Speed Risk Decisions</h3>
              <p className={styles.vcardP}>The supervisor agent surfaces the highest-risk invoices, delegates to specialist agents, attaches live Splunk evidence, applies named controls, and generates a human-reviewable action plan.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TEAMS / ACCORDION ── */}
      <section className={`${styles.teams} ${styles.section}`} id="workflow">
        <div className={styles.wrap}>
          <span className={`${styles.eyebrow} ${styles.reveal}`} data-reveal="">Multi-agent architecture</span>
          <h2 className={`${styles.teamsH2} ${styles.reveal}`} data-reveal="">One supervisor. Seven specialist agents.</h2>
          <div className={styles.teamsGrid}>
            <div className={styles.reveal} data-reveal=""><Accordion /></div>
            <div className={`${styles.flowPanel} ${styles.reveal}`} data-reveal="" aria-label="Multi-agent architecture">
              <div className={styles.flowLabel}>// Agent architecture</div>
              <div className={styles.supervisorBlock}>
                <div className={styles.sIcon} aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="6" r="3" stroke="#0A1A11" strokeWidth="2" /><path d="M12 9v4M12 13L5 18M12 13l7 5M12 13v6" stroke="#0A1A11" strokeWidth="2" strokeLinecap="round" /></svg>
                </div>
                <div>
                  <div className={styles.sName}>RavenLedger Supervisor</div>
                  <div className={styles.sHint}>Delegates conditionally by risk severity</div>
                </div>
              </div>
              <div className={styles.flow}>
                {FLOW_STEPS.map((step) => (
                  <div key={step.num} className={styles.flowStep}>
                    <span className={`${styles.flowDot} ${step.human ? styles.flowDotHuman : ''}`}>{step.num}</span>
                    <div>
                      <div className={styles.flowName}>{step.name}</div>
                      <div className={styles.flowHint}>{step.hint}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ARCHITECTURE (animated SVG) ── */}
      <section className={`${styles.arch} ${styles.section}`} id="architecture">
        <div className={styles.wrap}>
          <span className={`${styles.eyebrow} ${styles.reveal}`} data-reveal="">System architecture</span>
          <h2 className={`${styles.archH2} ${styles.reveal}`} data-reveal="">From detection to human-approved response.</h2>
          <div className={`${styles.archScroll} ${styles.reveal}`} data-reveal="">
            <svg viewBox="0 0 1160 580" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="RavenLedger architecture">
              <defs>
                <marker id="arrG" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#0FA85B" /></marker>
                <marker id="arrA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#C98A14" /></marker>
              </defs>
              <text x="80" y="44" fontFamily="IBM Plex Mono,monospace" fontSize="13" fontWeight="600" letterSpacing="3" fill="#0FA85B">RAVENLEDGER AGENTS — INVESTIGATION CHAIN</text>
              <rect x="50" y="62" width="1060" height="160" rx="16" fill="#F4F8F5" stroke="rgba(15,168,91,.25)" strokeWidth="1" />
              <path id="arcTop" d="M 155 102 Q 580 14 935 102" fill="none" stroke="#19E07C" strokeWidth="1.4" strokeDasharray="2 7" opacity=".55" />
              <circle r="4.5" fill="#19E07C"><animateMotion dur="4.5s" repeatCount="indefinite"><mpath href="#arcTop" /></animateMotion></circle>
              <circle r="4.5" fill="#19E07C" opacity=".5"><animateMotion dur="4.5s" begin="1.4s" repeatCount="indefinite"><mpath href="#arcTop" /></animateMotion></circle>
              <path id="arcBot" d="M 240 212 Q 580 276 920 212" fill="none" stroke="#FFB020" strokeWidth="1.4" strokeDasharray="2 7" opacity=".55" />
              <circle r="4.5" fill="#FFB020"><animateMotion dur="5.2s" repeatCount="indefinite"><mpath href="#arcBot" /></animateMotion></circle>
              <g fontFamily="Space Grotesk,sans-serif" textAnchor="middle">
                <g><rect x="80" y="110" width="150" height="64" rx="10" fill="#fff" stroke="#0B3D2E" strokeWidth="1.5" /><text x="155" y="138" fontSize="13.5" fontWeight="600" fill="#0A1A11">BUSINESS RISK</text><text x="155" y="158" fontSize="11.5" fill="#5F6E65" fontFamily="Inter,sans-serif">Fraud signals</text></g>
                <g><rect x="250" y="110" width="150" height="64" rx="10" fill="#fff" stroke="#0B3D2E" strokeWidth="1.5" /><text x="325" y="138" fontSize="13.5" fontWeight="600" fill="#0A1A11">INSIDER</text><text x="325" y="158" fontSize="11.5" fill="#5F6E65" fontFamily="Inter,sans-serif">CERT behavior</text></g>
                <g><rect x="420" y="110" width="150" height="64" rx="10" fill="#0B3D2E" stroke="#19E07C" strokeWidth="1.5" /><text x="495" y="138" fontSize="13.5" fontWeight="600" fill="#19E07C">SPLUNK EVIDENCE</text><text x="495" y="158" fontSize="11.5" fill="#9FD8BC" fontFamily="Inter,sans-serif">Live SPL · BOTS v3</text></g>
                <g><rect x="590" y="110" width="150" height="64" rx="10" fill="#fff" stroke="#0B3D2E" strokeWidth="1.5" /><text x="665" y="138" fontSize="13.5" fontWeight="600" fill="#0A1A11">CORRELATION</text><text x="665" y="158" fontSize="11.5" fill="#5F6E65" fontFamily="Inter,sans-serif">Case fusion</text></g>
                <g><rect x="760" y="110" width="150" height="64" rx="10" fill="#fff" stroke="#0B3D2E" strokeWidth="1.5" /><text x="835" y="138" fontSize="13.5" fontWeight="600" fill="#0A1A11">POLICY</text><text x="835" y="158" fontSize="11.5" fill="#5F6E65" fontFamily="Inter,sans-serif">Named controls</text></g>
                <g><rect x="930" y="110" width="150" height="64" rx="10" fill="#fff" stroke="#0B3D2E" strokeWidth="1.5" /><text x="1005" y="138" fontSize="13.5" fontWeight="600" fill="#0A1A11">AUDIT REPORT</text><text x="1005" y="158" fontSize="11.5" fill="#5F6E65" fontFamily="Inter,sans-serif">RL-CORR-0001</text></g>
              </g>
              <g stroke="#0FA85B" strokeWidth="1.4" strokeDasharray="4 5" fill="none">
                <path d="M 232 142 L 247 142" markerEnd="url(#arrG)" />
                <path d="M 402 142 L 417 142" markerEnd="url(#arrG)" />
                <path d="M 572 142 L 587 142" markerEnd="url(#arrG)" />
                <path d="M 742 142 L 757 142" markerEnd="url(#arrG)" />
                <path d="M 912 142 L 927 142" markerEnd="url(#arrG)" />
              </g>
              <path id="drop" d="M 1005 176 C 1005 270 1000 300 1000 386" fill="none" stroke="#0FA85B" strokeWidth="1.5" strokeDasharray="4 5" />
              <circle r="4.5" fill="#19E07C"><animateMotion dur="2.6s" repeatCount="indefinite"><mpath href="#drop" /></animateMotion></circle>
              <circle r="4.5" fill="#19E07C" opacity=".5"><animateMotion dur="2.6s" begin="1.3s" repeatCount="indefinite"><mpath href="#drop" /></animateMotion></circle>
              <text x="1025" y="268" fontFamily="IBM Plex Mono,monospace" fontSize="11.5" fontWeight="600" letterSpacing="1.5" fill="#0FA85B">CASE HANDOFF</text>
              <text x="1025" y="312" fontFamily="IBM Plex Mono,monospace" fontSize="11.5" fontWeight="600" letterSpacing="1.5" fill="#C98A14">HUMAN APPROVAL</text>
              <text x="80" y="352" fontFamily="IBM Plex Mono,monospace" fontSize="13" fontWeight="600" letterSpacing="3" fill="#C98A14">HUMAN-IN-LOOP — RESPONSE CHAIN</text>
              <rect x="50" y="368" width="1060" height="140" rx="16" fill="#FDFBF6" stroke="rgba(201,138,20,.3)" strokeWidth="1" />
              <g fontFamily="Space Grotesk,sans-serif" textAnchor="middle">
                <g><rect x="920" y="396" width="160" height="64" rx="10" fill="#FFB020" stroke="#C98A14" strokeWidth="1.5" /><text x="1000" y="424" fontSize="13.5" fontWeight="600" fill="#3A2800">HUMAN ANALYST</text><text x="1000" y="444" fontSize="11.5" fill="#6B4E07" fontFamily="Inter,sans-serif">Approves action</text></g>
                <g><rect x="734" y="396" width="160" height="64" rx="10" fill="#fff" stroke="#C98A14" strokeWidth="1.5" /><text x="814" y="424" fontSize="13.5" fontWeight="600" fill="#0A1A11">HOLD PAYMENT</text><text x="814" y="444" fontSize="11.5" fill="#5F6E65" fontFamily="Inter,sans-serif">Manual review</text></g>
                <g><rect x="548" y="396" width="160" height="64" rx="10" fill="#fff" stroke="#C98A14" strokeWidth="1.5" /><text x="628" y="424" fontSize="13.5" fontWeight="600" fill="#0A1A11">ESCALATE SOC</text><text x="628" y="444" fontSize="11.5" fill="#5F6E65" fontFamily="Inter,sans-serif">Security review</text></g>
                <g><rect x="362" y="396" width="160" height="64" rx="10" fill="#fff" stroke="#C98A14" strokeWidth="1.5" /><text x="442" y="424" fontSize="13.5" fontWeight="600" fill="#0A1A11">FINANCE REVIEW</text><text x="442" y="444" fontSize="11.5" fill="#5F6E65" fontFamily="Inter,sans-serif">AP workflow</text></g>
                <g><rect x="176" y="396" width="160" height="64" rx="10" fill="#0A1A11" stroke="#0A1A11" strokeWidth="1.5" /><text x="256" y="424" fontSize="13.5" fontWeight="600" fill="#19E07C">ACTION LOG</text><text x="256" y="444" fontSize="11.5" fill="#9FD8BC" fontFamily="Inter,sans-serif">Recorded decision</text></g>
              </g>
              <g stroke="#C98A14" strokeWidth="1.4" strokeDasharray="4 5" fill="none">
                <path d="M 918 428 L 898 428" markerEnd="url(#arrA)" />
                <path d="M 732 428 L 712 428" markerEnd="url(#arrA)" />
                <path d="M 546 428 L 526 428" markerEnd="url(#arrA)" />
                <path d="M 360 428 L 340 428" markerEnd="url(#arrA)" />
              </g>
              <path id="respFlow" d="M 1000 470 Q 628 540 256 470" fill="none" stroke="#C98A14" strokeWidth="1.4" strokeDasharray="2 7" opacity=".5" />
              <circle r="4.5" fill="#FFB020"><animateMotion dur="4.8s" repeatCount="indefinite"><mpath href="#respFlow" /></animateMotion></circle>
              <circle r="4.5" fill="#FFB020" opacity=".5"><animateMotion dur="4.8s" begin="2.2s" repeatCount="indefinite"><mpath href="#respFlow" /></animateMotion></circle>
            </svg>
          </div>
        </div>
      </section>

      {/* ── METRICS ── */}
      <section className={styles.metrics}>
        <div className={styles.wrap}>
          <div className={styles.metricsGrid}>
            {METRICS.map((m) => (
              <div key={m.head} className={`${styles.metric} ${styles.reveal}`} data-reveal="">
                <div className={styles.metricNum}>{m.num}</div>
                <div className={styles.metricHead}>{m.head}</div>
                <p className={styles.metricP}>{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MCP CAPABILITY ── */}
      <section className={`${styles.capabilityProof} ${styles.section}`} id="capability">
        <div className={styles.wrap}>
          <span className={`${styles.eyebrow} ${styles.reveal}`} data-reveal="">MCP Capability</span>
          <h2 className={`${styles.featuresH2} ${styles.reveal}`} data-reveal="">See RavenLedger analyze the full risk queue</h2>
          <p className={`${styles.featuresLead} ${styles.reveal}`} data-reveal="">RavenLedger exposes Splunk MCP-ready business tools that analyze the full payment-risk queue, rank risky cases, explain business reasons, validate controls, and prepare human-approved actions before money leaves the enterprise.</p>

          <div className={`${styles.capabilityActions} ${styles.reveal}`} data-reveal="">
            <a
              href={DEMO_VIDEO_URL}
              target="_blank"
              rel="noreferrer"
              className={`${styles.btn} ${styles.btnSolid}`}
            >
              Watch MCP Capability Video <ArrowIcon />
            </a>

            <Link to="/demo/select" className={`${styles.btn} ${styles.btnGhost}`}>Run Investigation</Link>
          </div>

          <div className={`${styles.imageProofCard} ${styles.reveal}`} data-reveal="">
            <img src="/mcp_dashboard.png" alt="RavenLedger MCP dashboard" />
          </div>
        </div>
      </section>

      {/* ── TOP RISK QUEUE ── */}
      <section className={`${styles.queue} ${styles.section}`} id="queue">
        <div className={styles.wrap}>
          <span className={`${styles.eyebrow} ${styles.reveal}`} data-reveal="">Prioritization, explained</span>
          <h2 className={styles.reveal} data-reveal="" style={{ fontSize: 'clamp(28px,3vw,40px)', fontWeight: 700, maxWidth: 760 }}>Top Risk Queue. Every case carries a ranking reason.</h2>
          <p className={`${styles.featuresLead} ${styles.reveal}`} data-reveal="">After MCP-level analysis, RavenLedger ranks the risky payment cases and explains why each case should be investigated first.</p>

          <div className={`${styles.imageProofCard} ${styles.reveal}`} data-reveal="">
            <img src="/queue_cases.png" alt="RavenLedger top risk queue" />
          </div>
        </div>
      </section>

      {/* ── CONVERGENCE ── */}
      <section className={`${styles.converge} ${styles.section}`} id="converge">
        <div className={styles.wrap}>
          <span className={`${styles.eyebrow} ${styles.reveal}`} data-reveal="">Selected Case Correlation</span>
          <h2 className={styles.reveal} data-reveal="" style={{ fontSize: 'clamp(28px,3vw,40px)', fontWeight: 700, maxWidth: 760 }}>Three evidence streams. One investigation case.</h2>
          <p className={`${styles.featuresLead} ${styles.reveal}`} data-reveal="">Once a case is selected from the queue, RavenLedger correlates business risk, insider behavior, and Splunk evidence into one investigation case with score, severity, failed controls, and recommended action.</p>
          <div className={styles.convStreams}>
            {STREAMS.map((s) => (
              <div key={s.title} className={`${styles.stream} ${styles.reveal}`} data-reveal="">
                <div className={styles.streamHead}><span className={styles.sDot} style={{ background: s.dotColor }} />{s.title}</div>
                <ul>{s.items.map(item => <li key={item}>{item}</li>)}</ul>
              </div>
            ))}
          </div>
          <div className={`${styles.convArrow} ${styles.reveal}`} data-reveal="" aria-hidden="true">
            <span className={styles.convStem} />
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none"><path d="M1 1l8 9 8-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className={`${styles.convCase} ${styles.reveal}`} data-reveal="">
            <div className={styles.convTop}>
              <span className={styles.convId}>RL-CORR-0010</span>
              <span className={styles.badgeHigh}>SEVERITY · CRITICAL</span>
            </div>
            <div className={styles.convGrid}>
              <span className={styles.convK}>Invoice</span><span className={styles.convV}>INV_0069589</span>
              <span className={styles.convK}>Combined score</span><span className={styles.convV}>80 / 100</span>
              <span className={styles.convK}>Controls failed</span><span className={styles.convV}>3 of 6</span>
              <span className={styles.convK}>Action</span><span className={styles.convV} style={{ color: 'var(--risk)' }}>Hold for human review</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTROLS CHECKLIST ── */}
      <section className={`${styles.controls} ${styles.section}`} id="controls">
        <div className={`${styles.wrap} ${styles.controlsGrid}`}>
          <div>
            <span className={`${styles.eyebrow} ${styles.reveal}`} data-reveal="">Governance built in</span>
            <h2 className={`${styles.controlsH2} ${styles.reveal}`} data-reveal="">Every case, checked against named controls.</h2>
            <p className={`${styles.controlsBody} ${styles.reveal}`} data-reveal="">The Policy Decision Agent maps risk to CTRL-identified controls auditors recognize — not generic policy text. Each control reports its status and the reason behind it.</p>
          </div>
          <div className={`${styles.ctrlPanel} ${styles.reveal}`} data-reveal="" aria-label="Controls checklist">
            {CONTROLS.map((c) => (
              <div key={c.id} className={styles.ctrlRow}>
                <span className={styles.ctrlId}>{c.id}</span>
                <span className={styles.ctrlName}>{c.name}</span>
                <span className={`${styles.statusBadge} ${styles[c.cls]}`}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HUMAN IN LOOP ── */}
      <section className={`${styles.hil} ${styles.section}`} id="hil">
        <div className={`${styles.wrap} ${styles.hilGrid}`}>
          <div>
            <span className={`${styles.eyebrow} ${styles.eyebrowDark} ${styles.reveal}`} data-reveal="">Control stays with your analysts</span>
            <h2 className={`${styles.hilH2} ${styles.reveal}`} data-reveal="">Human-approved response, not blind automation.</h2>
            <p className={`${styles.hilP} ${styles.reveal}`} data-reveal="">RavenLedger does not automatically block payments or punish users. The Human Action Agent prepares the response — and records only what the analyst approves. Every decision is logged with case, action, actor, timestamp, and reason.</p>
          </div>
          <div className={`${styles.checklist} ${styles.reveal}`} data-reveal="">
            {CHECK_ITEMS.map((item) => (
              <div key={item} className={styles.checkItem}><CheckIcon />{item}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SPLUNK ── */}
      <section className={`${styles.splunkSection} ${styles.section}`} id="evidence">
        <div className={`${styles.wrap} ${styles.splunkGrid}`}>
          <div>
            <span className={`${styles.eyebrow} ${styles.reveal}`} data-reveal="">Splunk-native</span>
            <h2 className={`${styles.splunkH2} ${styles.reveal}`} data-reveal="">Built around Splunk evidence.</h2>
            <p className={`${styles.splunkBody} ${styles.reveal}`} data-reveal="">RavenLedger uses Splunk Enterprise and live BOTS v3 searches to enrich each case with operational and security telemetry.</p>
            <div className={`${styles.modeNotes} ${styles.reveal}`} data-reveal="">
              <div className={styles.modeNote}><span className={styles.modeNoteK}>CURRENT MODE</span><span>Live Splunk REST/Python adapter</span></div>
              <div className={styles.modeNote}><span className={styles.modeNoteK}>ARCHITECTURE</span><span>MCP-ready adapter layer</span></div>
            </div>
          </div>
          <div className={`${styles.terminal} ${styles.reveal}`} data-reveal="" aria-label="Sample SPL query">
            <div className={styles.termBar}>
              <i className={`${styles.termBarI} ${styles.termBarIAmber}`} />
              <i className={styles.termBarI} /><i className={styles.termBarI} />
              <span>spl — botsv3 evidence pull</span>
            </div>
            <pre className={styles.termPre}>
              <span className={styles.termCmd}>index</span>=botsv3 earliest=0{'\n'}
              <span className={styles.termPipe}>|</span> table _time host sourcetype source{'\n'}
              <span className={styles.termPipe}>|</span> head 20
            </pre>
            <div className={styles.plainEnglish}>
              <b>PLAIN ENGLISH</b>
              Searching BOTS v3 for live telemetry evidence that can be attached to the high-risk ERP payment investigation.
            </div>
            <div className={styles.termResult}><span className={styles.pulse} aria-hidden="true" />20 events returned · attached to case RL-CORR-0001</div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className={styles.finalSection} id="final">
        <div className={styles.wrap}>
          <h2 className={`${styles.finalH2} ${styles.reveal}`} data-reveal="">From risky payment to audit-ready action.</h2>
          <p className={`${styles.finalP} ${styles.reveal}`} data-reveal="">A supervisor agent coordinates seven specialists to detect payment risk, investigate with live Splunk evidence, check named controls, and act through human-approved workflows — before money leaves the enterprise.</p>
          <Link
            to="/demo/select"
            className={`${styles.btn} ${styles.btnSolid} ${styles.btnFinal} ${styles.reveal}`}
            data-reveal=""
          >
            Run RavenLedger Investigation <ArrowIcon />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <div className={`${styles.wrap} ${styles.footInner}`}>
          <span>© 2026 RavenLedger — Multi-Agent ERP RiskOps on Splunk</span>
          <span className={styles.footMono}>SUPERVISOR → 7 AGENTS → SPLUNK EVIDENCE → CONTROLS → HUMAN REVIEW → AUDIT REPORT</span>
        </div>
      </footer>
    </div>
  );
}
