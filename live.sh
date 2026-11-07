#!/bin/sh
# Wait until GitHub Pages has finished publishing a commit.
# Usage: sh live.sh COMMIT_SHA
# Prints LIVE, DEPLOY FAILED, or NOT LIVE AFTER 5 MINUTES. Exit 0 only for LIVE.
# Uses GitHub's public deployments record, not the page itself: a routine's
# WebFetch of the page address stops for approval and stalls the run.
SHA="$1"
API="https://api.github.com/repos/mrbam-codes/morning-brief"
first() { python3 -c 'import json,sys
try:
    d=json.load(sys.stdin); print(d[0][sys.argv[1]] if isinstance(d,list) and d else "")
except Exception:
    print("")' "$1"; }
i=0; MAX=${MAX:-20}
while [ $i -lt $MAX ]; do
  ID=$(curl -sS -m 20 "$API/deployments?environment=github-pages&sha=$SHA&per_page=1" | first id)
  if [ -n "$ID" ]; then
    STATE=$(curl -sS -m 20 "$API/deployments/$ID/statuses?per_page=1" | first state)
    if [ "$STATE" = "success" ]; then echo "LIVE"; exit 0; fi
    if [ "$STATE" = "failure" ] || [ "$STATE" = "error" ]; then echo "DEPLOY FAILED"; exit 1; fi
  fi
  i=$((i+1)); sleep 15
done
echo "NOT LIVE AFTER 5 MINUTES"; exit 1
