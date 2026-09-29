# ⚡ GVEN Secure AI Proxy (Cloudflare Worker)

This allows public visitors to your portfolio to converse naturally with **GVEN powered by Groq LLaMA 3.3 70B**, asking any question they want, without exposing your private `GROQ_API_KEY` to browser inspection or GitHub secret scanners.

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

### Step 4: Add Your Secret Groq API Key
1. Go back to your Worker's main page.
2. Click **Settings** tab > **Variables and Secrets**.
3. Under **Secrets**, click **Add**.
4. Set:
   - **Variable name**: `GROQ_API_KEY`
   - **Value**: Your new Groq API key (`gsk_...` from [console.groq.com/keys](https://console.groq.com/keys))
5. Click **Save and Deploy**.

### Step 5: Connect to Your Portfolio
1. Copy your Worker URL (e.g. `https://gven-ai-proxy.<your-subdomain>.workers.dev`).
2. Open your portfolio's `admin.html`.
3. Sign in as owner.
4. In the **AI Assistant & GVEN Configuration** card:
   - Set **Active AI Provider** to: `⚡ Secure Serverless Proxy (Public Natural Language via Groq)`
   - Paste your Worker URL in the **Secure Proxy URL** box.
   - Click **Save AI Configuration**.

---

## ✨ Result
* **Public Natural Language Chat:** Anyone visiting your portfolio can talk to GVEN using the full conversational power of Groq LLaMA 3.3 70B!
* **100% Secure:** Your `GROQ_API_KEY` lives exclusively inside Cloudflare's encrypted environment. It is never transmitted to the browser or stored in your GitHub repo.
* **100% Free:** Cloudflare includes 100,000 free requests every single day.
