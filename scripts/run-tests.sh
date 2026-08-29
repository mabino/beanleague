#!/usr/bin/env bash
# ==============================================================================
# BeanLeague - Test Suite Runner (Local & Containerized)
# ==============================================================================

set -eo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-local}"

echo "=========================================================="
echo " BeanLeague Test Suite Runner (Mode: ${MODE})"
echo "=========================================================="

if [[ "${MODE}" == "docker" || "${MODE}" == "container" ]]; then
    echo "[*] Building and running test suite inside Docker container..."
    docker build -f "${DIR}/backend/Dockerfile.test" -t beanleague-test "${DIR}"
    docker run --rm beanleague-test
    echo "[✓] Containerized tests passed successfully!"
else
    echo "[*] Running local pytest..."
    export PYTHONPATH="${DIR}:${DIR}/backend:${PYTHONPATH:-}"

    # Load mise runtimes if present
    if command -v mise >/dev/null 2>&1; then
        eval "$(mise activate bash 2>/dev/null || true)"
    elif [[ -x "$HOME/.homebrew/bin/mise" ]]; then
        eval "$("$HOME/.homebrew/bin/mise" activate bash 2>/dev/null || true)"
    fi

    # Locate pytest executable
    VENV_PYTEST=""
    if [[ -x "${DIR}/backend/.venv/bin/pytest" ]]; then
        VENV_PYTEST="${DIR}/backend/.venv/bin/pytest"
    elif [[ -x "${DIR}/.venv/bin/pytest" ]]; then
        VENV_PYTEST="${DIR}/.venv/bin/pytest"
    elif command -v pytest >/dev/null 2>&1; then
        VENV_PYTEST="pytest"
    fi

    if [[ -n "${VENV_PYTEST}" ]]; then
        "${VENV_PYTEST}" "${DIR}/backend/tests" -v --tb=short
    else
        echo "[*] Setting up virtual environment in ${DIR}/backend/.venv..."
        python3 -m venv "${DIR}/backend/.venv"
        "${DIR}/backend/.venv/bin/pip" install -q -r "${DIR}/backend/requirements-dev.txt"
        "${DIR}/backend/.venv/bin/pytest" "${DIR}/backend/tests" -v --tb=short
    fi
    echo "[✓] Local test suite passed!"
fi
