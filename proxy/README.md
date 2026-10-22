# ⚡ GVEN Secure AI Proxy (Cloudflare Worker with Gemini Fallback)

This serverless proxy allows public visitors to your portfolio to converse naturally with **GVEN powered by Groq LLaMA 3.3 / GPT-OSS 120B** with an **automatic, zero-downtime fallback to Google Gemini (gemini-2.0-flash / gemini-1.5-flash)** if Groq is ever rate-limited or down.

---

## 🚀 2-Minute Setup Guide (100% Free)

### Step 1: Create a Cloudflare Account
If you don't have one, sign up for free at [dash.cloudflare.com](https://dash.cloudflare.com) (no credit card required).

### Step 2: Create a Worker
1. In Cloudflare Dashboard, go to **Compute (Workers) > Workers & Pages**.
2. Click **Create Application** > **Create Worker**.
3. Name it `gven-ai-proxy` (or any name you prefer).
4. Click **Deploy**.

### Step 3: Paste the Code
1. Click **Edit Code** (top right of your newly created Worker).
2. Replace all the default code with the contents of [`cloudflare-worker.js`](cloudflare-worker.js).
3. Click **Deploy** (top right).

### Step 4: Add Your Secret API Keys
1. Go back to your Worker's main page.
2. Click **Settings** tab > **Variables and Secrets**.
3. Under **Secrets**, add:
   * **Primary Provider:**
     - **Variable name**: `GROQ_API_KEY`
     - **Value**: Your Groq API key (`gsk_...` from [console.groq.com/keys](https://console.groq.com/keys))
   * **Automatic Fallback (Recommended):**
     - **Variable name**: `GEMINI_API_KEY`
     - **Value**: Your free Google Gemini API key (`AIzaSy...` from [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey))
4. Click **Save and Deploy**.

### Step 5: Connect to Your Portfolio
1. Copy your Worker URL (e.g. `https://gven-ai-proxy.<your-subdomain>.workers.dev`).
2. Open your portfolio's `admin.html`.
3. Sign in as owner.
4. In the **AI Assistant & GVEN Configuration** card:
   - Set **Active AI Provider** to: `⚡ Secure Serverless Proxy (Public Natural Language via Groq + Gemini Fallback)`
   - Paste your Worker URL in the **Secure Proxy URL** box.
   - Click **Save AI Configuration**.

---

## 🛡️ Multi-Tier Resilience Architecture
1. **Tier 1 (Primary - Groq):** Ultra-fast sub-second responses via Groq's high-speed inference engine.
2. **Tier 2 (Fallback - Google Gemini):** If Groq encounters rate limiting (HTTP 429), model outage, or network errors, the proxy instantly reroutes to Google Gemini (`gemini-2.0-flash` or `gemini-1.5-flash`) at the edge.
3. **Tier 3 (Local Browser Fallback):** If network connectivity fails completely, GVEN seamlessly falls back to the client-side knowledge base engine.

---

## ✨ Result
* **Public Natural Language Chat:** Anyone visiting your portfolio gets instant, high-quality answers from GVEN.
* **100% Secure:** Secret keys live exclusively inside Cloudflare's encrypted environment. No API keys are exposed to the client.
* **100% Free:** Both Cloudflare Workers (100,000 req/day) and Google AI Studio free tier cost $0.
