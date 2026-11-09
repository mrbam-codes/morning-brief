#!/bin/sh
# Stage a throwaway copy of the site for page tests: SITE_DIR then fixture files named YYYY-MM-DD.json.
set -e
SITE="$1"; shift
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
rm -rf "$SITE"; mkdir -p "$SITE"
rsync -a --exclude .git --exclude tests --exclude .claude "$ROOT/" "$SITE/"
(cd "$ROOT" && git archive origin/briefs briefs) | tar -x -C "$SITE"
for f in "$@"; do cp "$f" "$SITE/briefs/$(basename "$f")"; done
python3 -c "import json,os,sys;d=sorted({f[:-5] for f in os.listdir(sys.argv[1]+'/briefs') if f[:4].isdigit() and f.endswith('.json')},reverse=True);open(sys.argv[1]+'/briefs/index.json','w').write(json.dumps(d))" "$SITE"
echo "staged $SITE"
