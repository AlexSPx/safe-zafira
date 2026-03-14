#!/usr/bin/env bash
# start.sh — first-run setup + launch for the DTC LLM service (MacBook)
#
# Usage: ./start.sh
# Env vars (all optional):
#   WG_HOST      MacBook WireGuard IP      default: 127.0.0.1 (loopback for local dev)
#   PORT         Listen port               default: 8090
#   OLLAMA_MODEL Ollama model tag          default: qwen3:4b
#   DTC_API_KEY  Shared secret with proxy  default: change-me-in-production

set -euo pipefail

MODEL="${OLLAMA_MODEL:-qwen3:4b}"
WG_HOST="${WG_HOST:-127.0.0.1}"
PORT="${PORT:-8090}"

echo "=== Safe Zafira — DTC LLM Service ==="
echo "  Model  : $MODEL"
echo "  Listen : $WG_HOST:$PORT"
echo ""

# ── 1. Check / start Ollama ───────────────────────────────────────────────────
if ! command -v ollama &>/dev/null; then
  echo "[ERROR] Ollama not found. Install from https://ollama.com then re-run."
  exit 1
fi

# Start Ollama server if it isn't already running
if ! curl -sf http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  echo "[INFO] Starting Ollama server in background..."
  ollama serve &>/tmp/ollama.log &
  sleep 3
fi

# ── 2. Pull model if needed ───────────────────────────────────────────────────
if ! ollama list | grep -q "^${MODEL}"; then
  echo "[INFO] Pulling model $MODEL (this may take a few minutes)..."
  ollama pull "$MODEL"
fi

echo "[INFO] Ollama is running with model $MODEL"

# ── 3. Create venv if needed ─────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$SCRIPT_DIR/.venv"

if [[ ! -d "$VENV" ]]; then
  echo "[INFO] Creating Python venv..."
  python3 -m venv "$VENV"
fi

"$VENV/bin/pip" install --quiet --upgrade pip
"$VENV/bin/pip" install --quiet -r "$SCRIPT_DIR/requirements.txt"

# ── 4. Launch ─────────────────────────────────────────────────────────────────
echo "[INFO] Launching FastAPI service..."
cd "$SCRIPT_DIR"
exec "$VENV/bin/python" app.py
