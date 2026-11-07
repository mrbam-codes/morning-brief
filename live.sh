#!/bin/sh
# Wait until GitHub Pages has finished publishing.
# Usage: sh live.sh COMMIT_SHA      (old path: waits for that commit's deploy)
#    or: sh live.sh 2026-11-08T07:59:00Z  (new path: waits for any deploy that
#        started at or after that time, UTC, which is how briefs-branch pushes go live)
# "inactive" means it went live and a newer deploy has since replaced it.
# Prints LIVE, DEPLOY FAILED, or NOT LIVE AFTER 5 MINUTES. Exit 0 only for LIVE.
# Uses GitHub's public deployments record, not the page itself: a routine's
# WebFetch of the page address stops for approval and stalls the run.
ARG="$1"
API="https://api.github.com/repos/mrbam-codes/morning-brief"
MAX=${MAX:-20}
pick() { python3 -c 'import json,sys
arg=sys.argv[1]
try:
    d=json.load(sys.stdin)
except Exception:
    d=[]
ids=[x["id"] for x in d if isinstance(x,dict) and ("T" in arg and x.get("created_at","")>=arg or x.get("sha")==arg)]
print(ids[0] if ids else "")' "$ARG"; }
state() { python3 -c 'import json,sys
try:
    d=json.load(sys.stdin); print(d[0]["state"] if d else "")
except Exception:
    print("")'; }
i=0
while [ $i -lt $MAX ]; do
  ID=$(curl -sS -m 20 "$API/deployments?environment=github-pages&per_page=10" | pick)
  if [ -n "$ID" ]; then
    STATE=$(curl -sS -m 20 "$API/deployments/$ID/statuses?per_page=1" | state)
    if [ "$STATE" = "success" ] || [ "$STATE" = "inactive" ]; then echo "LIVE"; exit 0; fi
    if [ "$STATE" = "failure" ] || [ "$STATE" = "error" ]; then echo "DEPLOY FAILED"; exit 1; fi
  fi
  i=$((i+1)); sleep 15
done
echo "NOT LIVE AFTER 5 MINUTES"; exit 1
