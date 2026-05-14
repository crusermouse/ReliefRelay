#!/usr/bin/env bash
# Simple demo validation script: health, one intake, export PDF, repeated intake stress
set -euo pipefail
BASE=http://127.0.0.1:8011
echo "Health:" 
curl -sS $BASE/health | jq .

echo "Creating sample intake..."
RESPONSE=$(curl -sS -X POST $BASE/intake -F "manual_text=Demo validation: Jane, 28, fever and dehydration" -H 'Accept: application/json')
echo "$RESPONSE" | jq .
CASE_ID=$(echo "$RESPONSE" | jq -r '.case_id')

if [ -n "$CASE_ID" ] && [ "$CASE_ID" != "null" ]; then
  echo "Exporting PDF for $CASE_ID"
  curl -sS -o /tmp/relief_case_${CASE_ID}.pdf $BASE/export/${CASE_ID}/pdf && ls -lh /tmp/relief_case_${CASE_ID}.pdf
else
  echo "No case created"
  exit 1
fi

echo "Running 3 quick sequential intakes"
for i in 1 2 3; do
  curl -sS -X POST $BASE/intake -F "manual_text=Demo run $i: minor issues" -H 'Accept: application/json' | jq -r '.case_id + " " + .operational_mode'
  sleep 1
done

echo "Demo validation complete"
