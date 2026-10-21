#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
repo='SuperNova080710/aleph-t02'
command -v gh >/dev/null || { echo 'GitHub CLI(gh)를 설치하고 gh auth login을 완료하세요.' >&2; exit 1; }
gh auth status
for body in docs/issues/*.md; do
  title=$(sed -n '1s/^# //p' "$body")
  existing=$(gh issue list --repo "$repo" --state all --search "$title in:title" --json title,url --jq ".[] | select(.title == \"$title\") | .url")
  if [[ -n "$existing" ]]; then
    echo "이미 존재: $existing"
  else
    gh issue create --repo "$repo" --title "$title" --body-file "$body"
  fi
done
