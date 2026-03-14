# Safe Zafira — DTC LLM Service

Provides short, human-readable fix suggestions for OBD-II DTC fault codes,
powered by a small local LLM running on the MacBook and exposed to the
frontend through the homeserver.

---

## Architecture

```
Frontend / Spring server
        │
        │  HTTPS  POST /api/dtc/suggest
        ▼
┌───────────────────┐
│   Homeserver      │  public domain  (e.g. zafira.yourdomain.com)
│   nginx proxy     │  TLS termination, rate-limiting, auth pass-through
└────────┬──────────┘
         │  WireGuard tunnel  →  10.8.0.2:8090
         ▼
┌───────────────────┐
│   MacBook         │  WireGuard peer  (10.8.0.2)
│   FastAPI app     │  binds only to WireGuard interface
│   Ollama (local)  │  qwen3:4b  (~2.5 GB, ~1–3 s/response on M-series)
└───────────────────┘
```

**Why this layout?**

| Concern | Solution |
|---|---|
| LLM compute | MacBook — Apple Silicon handles qwen3:4b in ~1-3 s |
| Public accessibility | Homeserver has a static IP + domain |
| Security | Service binds to WireGuard IP only, never exposed to internet |
| TLS | Nginx + Let's Encrypt certbot (auto-renewing) |
| Abuse prevention | nginx rate-limit: 10 req/min per IP |

---

## Model recommendation

| Model | Size | Speed (M2) | Quality |
|---|---|---|---|
| `qwen3:4b` ✅ recommended | 2.5 GB | ~1–3 s | newest small text model here, strong instruction following |
| `gemma3:4b` | 3.3 GB | ~2–4 s | very current, strong QA, slightly heavier |
| `llama3.2:3b` | 2.0 GB | ~1–2 s | solid small model, but older |
| `gemma3:1b` | 815 MB | < 1 s | ultra-light fallback, weaker for nuanced advice |

On an RPi / resource-constrained edge device, **do not** run the LLM locally —
keep it on the MacBook and proxy through the homeserver.

---

## Setup

### 1. MacBook — install Ollama

```bash
brew install ollama
ollama pull qwen3:4b
```

### 2. MacBook — WireGuard

Ensure WireGuard is configured and your MacBook has a static WG IP
(e.g. `10.8.0.2`). The service will bind to that IP.

### 3. MacBook — configure & start service

```bash
cd llm/macbook

# Required: set your actual values
export WG_HOST=10.8.0.2          # MacBook WireGuard IP
export PORT=8090
export DTC_API_KEY=your-secret-key-here
export OLLAMA_MODEL=qwen3:4b     # or whichever model you pulled

chmod +x start.sh
./start.sh
```

Test it locally first (before pointing the homeserver at it):
```bash
curl -s -X POST http://10.8.0.2:8090/dtc/suggest \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key-here" \
  -d '{"code": "P0300"}' | python3 -m json.tool
```

### 4. Homeserver — edit nginx config

In `llm/homeserver/nginx.conf`, replace the three placeholders:

| Placeholder | Example value |
|---|---|
| `<YOUR_DOMAIN>` | `zafira.yourdomain.com` |
| `<MACBOOK_WG_IP>` | `10.8.0.2` |
| `<DTC_LLM_PORT>` | `8090` |

### 5. Homeserver — first-run TLS cert

```bash
# On the homeserver, issue the cert before starting nginx
docker run --rm -p 80:80 \
  -v $(pwd)/certs:/etc/letsencrypt \
  -v $(pwd)/certbot-www:/var/www/certbot \
  certbot/certbot certonly --standalone \
  -d zafira.yourdomain.com --agree-tos --non-interactive -m you@example.com
```

### 6. Homeserver — start the stack

```bash
cd llm/homeserver
docker compose up -d
```

### 7. Spring server — call the DTC service

The Spring backend should forward DTC lookup requests to the homeserver:

```
POST https://zafira.yourdomain.com/api/dtc/suggest
X-API-Key: your-secret-key-here
Content-Type: application/json

{ "code": "P0300", "description": "Random misfire detected" }
```

---

## API reference

### `POST /dtc/suggest`

**Headers:**
- `X-API-Key: <key>` — required

**Body:**
```json
{
  "code": "P0300",
  "description": "Random misfire detected"   // optional
}
```

**Response `200`:**
```json
{
  "code": "P0300",
  "suggestion": "A P0300 random misfire is most often caused by worn spark plugs, a failing ignition coil, or a vacuum leak. Start by inspecting and replacing spark plugs, then test each coil with a swap. If misfires persist, check for intake manifold vacuum leaks.",
  "model": "qwen3:4b"
}
```

### `GET /health`

No auth required. Returns `200` with Ollama reachability status.

---

## Security notes

- The FastAPI service **only listens on the WireGuard IP** (`WG_HOST`). It has no path to the public internet.
- The nginx proxy enforces **rate limiting** (10 req/min per IP, burst 3).
- TLS 1.2+ only; HSTS enabled.
- API key is checked both at nginx (pass-through) and at the FastAPI app (double validation at the app layer).
- Do not commit `DTC_API_KEY` — inject via environment or a secrets manager.
