Business Risk Tool
+ Insider Risk Tool
+ Splunk Evidence Tool
+ Correlation Tool
+ Policy/Audit Tool
= RavenLedger Investigation Agent


$env:SPLUNK_HOST="https://localhost:8089"
$env:SPLUNK_USERNAME="khushboo"
$env:SPLUNK_PASSWORD="Khushi@8246"


python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001

Now check backend in browser:

http://localhost:8001/health
http://localhost:8001/agent/run-investigation
http://localhost:8001/cases/top-risk
