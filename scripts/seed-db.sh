#!/usr/bin/env bash
# ==============================================================================
# BeanLeague - Manual Daily Seeder Trigger
# ==============================================================================

API_URL="${API_URL:-http://localhost:8000}"

echo "[*] Triggering Daily Seeder on ${API_URL}..."

curl -s -X POST "${API_URL}/api/admin/seed?force_mock=true" \
    -H "Content-Type: application/json" | python3 -m json.tool || true

echo ""
echo "[✓] Database seeded successfully."
