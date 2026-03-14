#!/usr/bin/env python3
"""
Safe Zafira — DTC LLM Service (MacBook)

Wraps a locally-running Ollama model and exposes a single REST endpoint:

  POST /dtc/suggest
  Body:  { "code": "P0300", "description": "optional raw text from ECU" }
  Reply: { "code": "P0300", "suggestion": "..." }

The service binds only to the WireGuard interface (WG_HOST env var) so it is
not reachable from the public internet — only from the homeserver over the
WireGuard tunnel.

Requires:
  pip install fastapi uvicorn httpx
  brew install ollama          (or install from https://ollama.com)
    ollama pull qwen3:4b         (recommended — modern small model, ~2.5 GB)
"""

import os
import logging
import httpx
from fastapi import FastAPI, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, field_validator

# ── Config (override with env vars) ──────────────────────────────────────────
OLLAMA_BASE   = os.getenv("OLLAMA_BASE",   "http://127.0.0.1:11434")
MODEL         = os.getenv("OLLAMA_MODEL",  "qwen3:4b")
# Bind only to the WireGuard interface so no public exposure.
# Set WG_HOST to your MacBook's WireGuard IP (e.g. 10.8.0.2).
WG_HOST       = os.getenv("WG_HOST",       "127.0.0.1")
PORT          = int(os.getenv("PORT",      "8090"))
API_KEY       = os.getenv("DTC_API_KEY",   "change-me-in-production")
TIMEOUT_SECS  = float(os.getenv("TIMEOUT", "45"))

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [dtc-llm] %(levelname)s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("dtc-llm")

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Safe Zafira — DTC LLM Service",
    version="1.0.0",
    docs_url="/docs",   # disable in prod if desired
)

# ── Auth — simple API key in X-API-Key header ─────────────────────────────────
_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)


def _require_key(key: str = Security(_api_key_header)) -> None:
    if key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key",
        )


# ── Request / response models ─────────────────────────────────────────────────
class DTCRequest(BaseModel):
    code: str                       # e.g. "P0300"
    description: str | None = None  # optional raw ECU description text

    @field_validator("code")
    @classmethod
    def normalise_code(cls, v: str) -> str:
        return v.strip().upper()


class DTCResponse(BaseModel):
    code: str
    suggestion: str
    model: str


# ── DTC prompt builder ────────────────────────────────────────────────────────
_SYSTEM = (
    "You are a concise automotive diagnostic assistant. "
    "When given an OBD-II DTC fault code, explain the most likely cause "
    "and the top 2-3 practical fixes in plain language. "
    "Keep your answer under 80 words. Do not use bullet points or headers."
)


def _build_prompt(code: str, description: str | None) -> str:
    extra = f" The ECU description reads: \"{description}\"." if description else ""
    return (
        f"OBD-II fault code: {code}.{extra}\n"
        "Give a brief explanation of the most likely cause and the top 2-3 fixes."
    )


# ── Endpoint ──────────────────────────────────────────────────────────────────
@app.post("/dtc/suggest", response_model=DTCResponse)
async def suggest(
    req: DTCRequest,
    _: None = Security(_require_key),
) -> DTCResponse:
    """
    Query the local LLM for a short human-readable suggestion for a DTC code.
    """
    prompt = _build_prompt(req.code, req.description)
    logger.info(f"Querying model={MODEL} for code={req.code}")

    payload = {
        "model":  MODEL,
        "prompt": prompt,
        "system": _SYSTEM,
        "stream": False,
        "options": {
            "temperature": 0.3,   # low temp → consistent, factual answers
            "num_predict": 160,   # ~80 words
        },
    }

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECS) as client:
            resp = await client.post(f"{OLLAMA_BASE}/api/generate", json=payload)
            resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error(f"Ollama HTTP error: {exc.response.status_code} {exc.response.text[:200]}")
        raise HTTPException(status_code=502, detail="LLM backend error")
    except httpx.RequestError as exc:
        logger.error(f"Ollama connection error: {exc}")
        raise HTTPException(status_code=503, detail="LLM backend unreachable — is Ollama running?")

    data = resp.json()
    suggestion = data.get("response", "").strip()
    if not suggestion:
        raise HTTPException(status_code=502, detail="Empty response from LLM")

    logger.info(f"Response for {req.code}: {suggestion[:60]}...")
    return DTCResponse(code=req.code, suggestion=suggestion, model=MODEL)


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health() -> dict:
    """Liveness probe — also checks Ollama is reachable."""
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            r = await client.get(f"{OLLAMA_BASE}/api/tags")
            ollama_ok = r.status_code == 200
    except Exception:
        ollama_ok = False
    return {"status": "ok" if ollama_ok else "degraded", "ollama": ollama_ok, "model": MODEL}


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting DTC LLM service on {WG_HOST}:{PORT} — model: {MODEL}")
    uvicorn.run(
        "app:app",
        host=WG_HOST,
        port=PORT,
        log_level="info",
        workers=1,   # single worker — LLM is the bottleneck anyway
    )
