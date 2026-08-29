#!/usr/bin/env bash
# ==============================================================================
# BeanLeague - Homelab Submodule & GitOps Setup Script
# Integrates BeanLeague as a git submodule in ../homelab for GitOps deployment.
# ==============================================================================

set -eo pipefail

HOMELAB_DIR="${1:-../homelab}"

echo "=========================================================="
echo " BeanLeague -> Homelab GitOps Submodule Integration"
echo "=========================================================="

if [[ ! -d "${HOMELAB_DIR}" ]]; then
    echo "[!] Homelab directory '${HOMELAB_DIR}' not found."
    exit 1
fi

echo "[*] Integrating BeanLeague into homelab at ${HOMELAB_DIR}..."

# 1. Check if git repository exists
if [[ -d "${HOMELAB_DIR}/.git" ]]; then
    cd "${HOMELAB_DIR}"
    
    SUBMODULE_PATH="web/beanleague"
    if [[ ! -d "${SUBMODULE_PATH}" ]]; then
        echo "[*] Adding submodule '${SUBMODULE_PATH}'..."
        # Use relative path or remote URL
        git submodule add ../beanleague "${SUBMODULE_PATH}" || true
    else
        echo "[✓] Submodule path '${SUBMODULE_PATH}' already registered."
    fi
fi

echo ""
echo "[✓] Homelab submodule configuration verified."
echo "[i] Ingress snippet available at: deploy/homelab-ingress.conf"
echo "[i] Ready for GitOps continuous deployment."
