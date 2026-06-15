import "./SimpleStartPage.css";

function SimpleStartPage({ onStart }) {
  return (
    <main className="rl-start-page">
      <section className="rl-start-card">
        <div className="rl-start-badge">RavenLedger Demo</div>

        <h1>
          Agentic ERP RiskOps
          <span> Investigator on Splunk</span>
        </h1>

        <p>
          Start the demo to see how RavenLedger turns scattered Finance, SOC,
          Audit, ERP, and Splunk signals into one investigation case.
        </p>

        <button type="button" className="rl-start-button" onClick={onStart}>
          Open Command Center
        </button>
      </section>
    </main>
  );
}

export default SimpleStartPage;