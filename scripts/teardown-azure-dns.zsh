#!/usr/bin/env zsh
# ==============================================================================
# BeanLeague - Azure DNS Teardown Script (macOS / Linux zsh)
# Cleans up Azure DNS resources created for BeanLeague.
# ==============================================================================

set -eo pipefail

RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-rg-homelab-dns}"
ZONE_NAME="${AZURE_DNS_ZONE:-bino-fantasy.com}"
RECORD_NAME="${AZURE_RECORD_NAME:-@}"
PURGE_ZONE="${1:-false}"

echo "=========================================================="
echo " BeanLeague - Azure DNS Teardown"
echo "=========================================================="

if ! command -v az >/dev/null 2>&1; then
    echo "[!] Azure CLI ('az') not found."
    exit 1
fi

if [[ "${PURGE_ZONE}" == "--purge-all" ]]; then
    echo "[!] Deleting entire DNS Zone '${ZONE_NAME}' in '${RESOURCE_GROUP}'..."
    az network dns zone delete --resource-group "${RESOURCE_GROUP}" --name "${ZONE_NAME}" --yes --output none
    echo "[✓] Zone deleted."
else
    echo "[*] Deleting record '${RECORD_NAME}' in zone '${ZONE_NAME}'..."
    az network dns record-set a delete \
        --resource-group "${RESOURCE_GROUP}" \
        --zone-name "${ZONE_NAME}" \
        --name "${RECORD_NAME}" \
        --yes --output none || true
    echo "[✓] Record cleaned up."
fi

echo "[✓] Teardown complete."
