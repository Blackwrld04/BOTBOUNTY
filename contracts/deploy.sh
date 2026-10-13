#!/usr/bin/env bash
# ==============================================================================
# BotBounty Smart Contract Deployment Script Wrapper
# ==============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/deploy_botchain.sh" "$@"
