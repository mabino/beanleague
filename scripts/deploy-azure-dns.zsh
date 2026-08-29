#!/usr/bin/env zsh
# ==============================================================================
# BeanLeague - Azure DNS Ingress Deployment Script (macOS / Linux zsh)
# Deploys and configures Azure DNS zones & records for secure Homelab Ingress.
# ==============================================================================

set -eo pipefail

RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-rg-homelab-dns}"
LOCATION="${AZURE_LOCATION:-eastus}"
ZONE_NAME="${AZURE_DNS_ZONE:-bino-fantasy.com}"
RECORD_NAME="${AZURE_RECORD_NAME:-@}"
INGRESS_IP="${1:-${HOMELAB_INGRESS_IP:-}}"
TTL="${DNS_TTL:-300}"

echo "=========================================================="
echo " BeanLeague - Azure DNS Deployment"
echo "=========================================================="
echo "Resource Group : ${RESOURCE_GROUP}"
echo "Location       : ${LOCATION}"
echo "DNS Zone       : ${ZONE_NAME}"
echo "Record Name    : ${RECORD_NAME}"
echo "TTL            : ${TTL}s"
echo "=========================================================="

if ! command -v az >/dev/null 2>&1; then
    echo "[!] Azure CLI ('az') is not installed. Please install it with: brew install azure-cli"
    exit 1
fi

# Check Azure login status
if ! az account show >/dev/null 2>&1; then
    echo "[*] Not logged in to Azure. Launching 'az login'..."
    az login --output none
fi

ACCOUNT_NAME=$(az account show --query "name" -o tsv)
SUBSCRIPTION_ID=$(az account show --query "id" -o tsv)
echo "[✓] Connected to Azure Subscription: ${ACCOUNT_NAME} (${SUBSCRIPTION_ID})"

# 1. Create or ensure Resource Group exists
echo "[*] Checking Resource Group '${RESOURCE_GROUP}'..."
if ! az group show --name "${RESOURCE_GROUP}" >/dev/null 2>&1; then
    echo "[+] Creating Resource Group '${RESOURCE_GROUP}' in ${LOCATION}..."
    az group create --name "${RESOURCE_GROUP}" --location "${LOCATION}" --tags Project=BeanLeague ManagedBy=GitOps --output none
else
    echo "[✓] Resource Group exists."
fi

# 2. Create or ensure DNS Zone exists
echo "[*] Checking Azure DNS Zone '${ZONE_NAME}'..."
if ! az network dns zone show --resource-group "${RESOURCE_GROUP}" --name "${ZONE_NAME}" >/dev/null 2>&1; then
    echo "[+] Creating Azure DNS Zone '${ZONE_NAME}'..."
    az network dns zone create --resource-group "${RESOURCE_GROUP}" --name "${ZONE_NAME}" --tags Project=BeanLeague --output none
else
    echo "[✓] Azure DNS Zone exists."
fi

# 3. Create or update DNS A record if IP is provided
if [[ -n "${INGRESS_IP}" ]]; then
    echo "[*] Upserting A record '${RECORD_NAME}.${ZONE_NAME}' -> ${INGRESS_IP}..."
    az network dns record-set a add-record \
        --resource-group "${RESOURCE_GROUP}" \
        --zone-name "${ZONE_NAME}" \
        --record-set-name "${RECORD_NAME}" \
        --ipv4-address "${INGRESS_IP}" \
        --ttl "${TTL}" \
        --output none
    echo "[✓] DNS A record successfully configured!"
else
    echo "[i] No Ingress IP provided as argument. Azure DNS Zone is ready for tunnel / record binding."
fi

# Display Name Servers
echo ""
echo "=========================================================="
echo " Azure DNS Delegation Name Servers:"
az network dns zone show --resource-group "${RESOURCE_GROUP}" --name "${ZONE_NAME}" --query "nameServers" -o tsv
echo "=========================================================="
echo "[✓] Deployment complete!"
