# RavenLedger Splunk Queries

## 1. Verify BOTS v3 Dataset

```spl
index=botsv3 earliest=0 | head 10