#!/usr/bin/env zsh
# ==============================================================================
# BeanLeague - Azure DNS Update Script (macOS / Linux zsh)
# Updates Azure DNS records when Homelab IP or Cloudflare/Tailscale Tunnel changes.
# ==============================================================================

set -eo pipefail

RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-rg-homelab-dns}"
ZONE_NAME="${AZURE_DNS_ZONE:-bino-fantasy.com}"
RECORD_NAME="${AZURE_RECORD_NAME:-@}"
TARGET="${1:-${HOMELAB_INGRESS_IP:-}}"
RECORD_TYPE="${2:-A}" # A or CNAME

if [[ -z "${TARGET}" ]]; then
    echo "Usage: $0 <target_ip_or_cname> [A|CNAME]"
    exit 1
fi

echo "[*] Updating Azure DNS '${RECORD_NAME}.${ZONE_NAME}' -> ${TARGET} (${RECORD_TYPE})..."

if [[ "${RECORD_TYPE:u}" == "A" ]]; then
    # Reset existing records in record set
    az network dns record-set a delete \
        --resource-group "${RESOURCE_GROUP}" \
        --zone-name "${ZONE_NAME}" \
        --name "${RECORD_NAME}" \
        --yes >/dev/null 2>&1 || true

    az network dns record-set a add-record \
        --resource-group "${RESOURCE_GROUP}" \
        --zone-name "${ZONE_NAME}" \
        --record-set-name "${RECORD_NAME}" \
        --ipv4-address "${TARGET}" \
        --ttl 300 \
        --output none
else
    az network dns record-set cname set-record \
        --resource-group "${RESOURCE_GROUP}" \
        --zone-name "${ZONE_NAME}" \
        --record-set-name "${RECORD_NAME}" \
        --cname "${TARGET}" \
        --ttl 300 \
        --output none
fi

echo "[✓] Record updated successfully."
