#!/usr/bin/env bash
# ==============================================================================
# BotBounty Smart Contract Deployment Script for BOT Chain (Bohr Testnet & Mainnet)
# Powered by Foundry (forge & cast)
# ==============================================================================

set -euo pipefail

NETWORK="${1:-testnet}"
CONTRACT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v forge &> /dev/null; then
    echo "❌ Error: forge not found in PATH."
    echo "Please ensure Foundry is installed."
    exit 1
fi

echo "=================================================================="
echo "🚀 BotBounty Smart Contract Deployer"
echo "Target Network: ${NETWORK}"
echo "=================================================================="

if [ "${NETWORK}" = "mainnet" ]; then
    RPC_URL="https://rpc.botchain.ai"
    CHAIN_ID="677"
    EXPLORER_URL="https://scan.botchain.ai"
    USDT_ADDRESS="0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C"
elif [ "${NETWORK}" = "testnet" ]; then
    # Use local proxy if running to ensure reliable connectivity without DNS failures
    if curl -s -X POST http://127.0.0.1:8545 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | grep -q "result"; then
        RPC_URL="http://127.0.0.1:8545"
        echo "ℹ️  Using local Bohr proxy tunnel on http://127.0.0.1:8545"
    else
        RPC_URL="https://rpc.bohr.life"
    fi
    CHAIN_ID="968"
    EXPLORER_URL="https://scan.bohr.life"
    USDT_ADDRESS="0x75edC9335175Fc0552D51D48439F229c10420fe3"
else
    echo "❌ Unknown network: ${NETWORK}. Choose 'testnet' or 'mainnet'."
    exit 1
fi

echo "Network Details:"
echo "  • Chain ID: ${CHAIN_ID}"
echo "  • RPC URL: ${RPC_URL}"
echo "  • Explorer: ${EXPLORER_URL}"
echo "  • Bridged USDT: ${USDT_ADDRESS}"
echo "=================================================================="

if [ -z "${PRIVATE_KEY:-}" ]; then
    echo ""
    echo "⚠️  PRIVATE_KEY environment variable is not set."
    if [ "${NETWORK}" = "testnet" ]; then
        echo "To deploy to Bohr Testnet (Chain ID 968):"
        echo "1. Get free test tBOT gas at: https://faucet.botchain.ai"
        echo "2. Run: PRIVATE_KEY=0x<your-private-key> ./deploy_botchain.sh testnet"
    else
        echo "To deploy to BOT Chain Mainnet (Chain ID 677):"
        echo "Share your deployer address with Leon / BOT Chain team for gas sponsorship."
        echo "Run: PRIVATE_KEY=0x<your-private-key> ./deploy_botchain.sh mainnet"
    fi
    echo ""
    exit 1
fi

echo "📦 1. Compiling BotBountyEscrow.sol with Forge..."
cd "${CONTRACT_DIR}"
forge build

echo ""
echo "📡 2. Broadcasting Deployment Transaction to ${NETWORK} (Chain ID: ${CHAIN_ID})..."
DEPLOY_OUTPUT=$(forge create BotBountyEscrow.sol:BotBountyEscrow \
    --rpc-url "${RPC_URL}" \
    --private-key "${PRIVATE_KEY}" \
    --broadcast)

echo "${DEPLOY_OUTPUT}"

# Extract deployed address
DEPLOYED_ADDRESS=$(echo "${DEPLOY_OUTPUT}" | grep -i "Deployed to:" | awk '{print $3}')

if [ -n "${DEPLOYED_ADDRESS}" ]; then
    echo ""
    echo "=================================================================="
    echo "🎉 DEPLOYMENT SUCCESSFUL!"
    echo "Contract Address: ${DEPLOYED_ADDRESS}"
    echo "Explorer: ${EXPLORER_URL}/address/${DEPLOYED_ADDRESS}"
    echo "=================================================================="
    echo ""
    echo "✅ Contract ready. Update your BOTBOUNTY frontend and backend configs with:"
    echo "BOTBOUNTY_ESCROW_ADDRESS=${DEPLOYED_ADDRESS}"
    echo "BOTBOUNTY_NETWORK=${NETWORK}"
    echo "BOTBOUNTY_USDT_ADDRESS=${USDT_ADDRESS}"
fi
