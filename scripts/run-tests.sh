#!/usr/bin/env bash
# ==============================================================================
# BeanLeague - Test Suite Runner (Local & Containerized)
# ==============================================================================

set -eo pipefail

MODE="${1:-local}"

echo "=========================================================="
echo " BeanLeague Test Suite Runner (Mode: ${MODE})"
echo "=========================================================="

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "${MODE}" == "docker" || "${MODE}" == "container" ]]; then
    echo "[*] Building and running test suite inside Docker container..."
    docker build -f "${DIR}/backend/Dockerfile.test" -t beanleague-test "${DIR}"
    docker run --rm beanleague-test
    echo "[✓] Containerized tests passed successfully!"
else
    echo "[*] Running local pytest in Python environment..."
    export PYTHONPATH="${DIR}"
    
    if [[ -f "${DIR}/backend/.venv/bin/pytest" ]]; then
        "${DIR}/backend/.venv/bin/pytest" "${DIR}/backend/tests" -v --tb=short
    elif command -v pytest >/dev/null 2>&1; then
        pytest "${DIR}/backend/tests" -v --tb=short
    else
        echo "[!] Local pytest not found. Falling back to containerized test..."
        "${DIR}/scripts/run-tests.sh" docker
    fi
    echo "[✓] Local test suite passed!"
fi
