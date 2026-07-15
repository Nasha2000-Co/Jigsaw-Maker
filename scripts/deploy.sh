#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BUILD="$(date +%Y%m%d%H%M)"
INDEX="index.html"

if [[ ! -f "$INDEX" ]]; then
  echo "Missing $INDEX" >&2
  exit 1
fi

perl -pi -e 's/(name="app-version" content=")[^"]+(")/${1}'"$BUILD"'${2}/' "$INDEX"

git add "$INDEX" assets/favicon.png scripts/deploy.sh
if git diff --cached --quiet; then
  echo "Nothing to commit."
  exit 0
fi

git commit -m "Deploy build ${BUILD}."
git push origin main

echo ""
echo "Deployed build ${BUILD}"
echo "Wait 2-3 minutes, then open:"
echo "  https://jigsawmaker.online/?v=${BUILD}"
