#!/usr/bin/env bash
# ==============================================================================
# BeanLeague - Matchday Live Simulation Trigger
# ==============================================================================

API_URL="${API_URL:-http://localhost:8000}"

echo "[*] Triggering simulated live match event against ${API_URL}..."

curl -s -X POST "${API_URL}/api/admin/simulate-tick" \
    -H "Content-Type: application/json" | python3 -m json.tool || true

echo ""
echo "[✓] Matchday tick triggered! Connected frontends will pulse and recalculate points."
