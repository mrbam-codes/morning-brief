#!/bin/sh
# Publish today's brief by pushing it to the briefs branch (never main).
# Usage: sh publish.sh YYYY-MM-DD [BRANCH]   (BRANCH defaults to briefs)
# Builds one new commit whose parent is the branch tip, so the push is a
# normal fast-forward (no force push). Then, for the briefs branch, waits for
# GitHub Pages to finish publishing and prints LIVE, or why not.
DATE="$1"; BRANCH="${2:-briefs}"
case "$BRANCH" in briefs|briefs-rehearsal) ;; *) echo "Refusing to push to $BRANCH"; exit 1 ;; esac
git fetch -q origin briefs "$BRANCH" 2>/dev/null || git fetch -q origin briefs
PARENT=$(git rev-parse -q --verify "origin/$BRANCH" || git rev-parse origin/briefs)
# The commit is the branch tip plus this folder's briefs/ files only, so no
# other file the run touched can travel with it.
IDX=$(mktemp); rm -f "$IDX"
GIT_INDEX_FILE="$IDX" git read-tree "$PARENT" && GIT_INDEX_FILE="$IDX" git add briefs && TREE=$(GIT_INDEX_FILE="$IDX" git write-tree)
rm -f "$IDX"
if [ -z "$TREE" ]; then echo "PUSH FAILED: could not build the commit"; exit 1; fi
COMMIT=$(git -c user.name="Morning brief" -c user.email="mrbam-codes@users.noreply.github.com" commit-tree "$TREE" -p "$PARENT" -m "Brief $DATE")
START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
if ! git push -q origin "$COMMIT:refs/heads/$BRANCH"; then echo "PUSH FAILED"; exit 1; fi
echo "PUSHED $COMMIT to $BRANCH at $START"
if [ "$BRANCH" = "briefs" ]; then sh "$(dirname "$0")/live.sh" "$START"; fi
