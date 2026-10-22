/**
 * GVEN Portfolio AI Proxy — Cloudflare Worker
 * 
 * High-performance, resilient AI proxy that allows public visitors to chat
 * naturally with GVEN using Groq with an automatic Google Gemini fallback
 * without exposing your secret API keys to the browser.
 * 
 * Setup Instructions:
 * 1. Go to https://dash.cloudflare.com/ -> Workers & Pages -> Create Application -> Create Worker
 * 2. Paste this entire code into the worker editor and click "Deploy".
 * 3. Go to Worker Settings -> Variables and Secrets -> Add Secrets:
 *      Name: GROQ_API_KEY
 *      Value: <your-groq-api-key> (from https://console.groq.com/keys)
 *      Name: GEMINI_API_KEY (Recommended automatic fallback)
 *      Value: <your-gemini-api-key> (from https://aistudio.google.com/app/apikey)
 * 4. Copy your worker URL (e.g. https://gven-ai-proxy.<subdomain>.workers.dev)
 * 5. Paste the URL into your Portfolio Admin Panel -> AI Configuration -> Secure Proxy URL.
 */

export default {
  async fetch(request, env) {
    // Standard CORS headers allowing requests from your portfolio
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const groqApiKey = String(env.GROQ_API_KEY || '').trim().replace(/^["']|["']$/g, '');
    const geminiApiKey = String(env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');

    // Health check on GET
    if (request.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'GVEN Portfolio AI Proxy',
        groqConfigured: !!groqApiKey,
        geminiConfigured: !!geminiApiKey,
        activeChain: [
          groqApiKey ? 'Groq (openai/gpt-oss-120b)' : null,
          geminiApiKey ? 'Google Gemini (gemini-2.0-flash fallback)' : null
        ].filter(Boolean)
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      const body = await request.json();

      if (!groqApiKey && !geminiApiKey) {
        return new Response(
          JSON.stringify({ error: 'Neither GROQ_API_KEY nor GEMINI_API_KEY secret is configured in Cloudflare Worker environment.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const messages = body.messages || [];
      const requestedProvider = String(body.provider || '').toLowerCase();
      const requestedModel = String(body.model || '').toLowerCase();

      // If client explicitly requests Gemini or a gemini-* model
      const preferGemini = requestedProvider === 'gemini' || requestedModel.startsWith('gemini');

      if (preferGemini && geminiApiKey) {
        return await handleGeminiCall(geminiApiKey, body, corsHeaders, false);
      }

      // ── Step 1: Attempt Primary Provider (Groq) ──────────────────────
      if (groqApiKey) {
        try {
          let model = body.model || 'openai/gpt-oss-120b';
          if (!model || model.includes('llama-3') || model.includes('llama3') || model.includes('gemma') || model === 'groq/compound-mini') {
            model = 'openai/gpt-oss-120b';
          }

          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${groqApiKey}`
            },
            body: JSON.stringify({
              model,
              messages,
              max_tokens: body.max_tokens || 800,
              temperature: body.temperature ?? 0.6
            })
          });

          if (groqRes.ok) {
            const groqData = await groqRes.json();
            groqData.provider = 'groq';
            return new Response(JSON.stringify(groqData), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          console.warn(`Groq API returned HTTP ${groqRes.status}. Evaluating Gemini fallback...`);
        } catch (groqErr) {
          console.warn('Groq fetch error:', groqErr.message);
        }
      }

      // ── Step 2: Automatic Fallback to Google Gemini ───────────────────
      if (geminiApiKey) {
        console.log('⚡ Groq unavailable or rate-limited. Falling back to Google Gemini...');
        return await handleGeminiCall(geminiApiKey, body, corsHeaders, true);
      }

      // If we reach here, Groq failed and Gemini is not configured
      return new Response(JSON.stringify({
        error: 'Groq API request failed, and GEMINI_API_KEY fallback is not configured in Cloudflare Worker.'
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message || 'Internal proxy error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * Handle Google Gemini API call with dual-endpoint resilience:
 * 1. OpenAI-compatible endpoint
 * 2. Native REST generateContent endpoint with automatic model fallback
 */
async function handleGeminiCall(apiKey, body, corsHeaders, isFallback = false) {
  const messages = body.messages || [];
  const primaryModel = body.geminiModel || 'gemini-2.0-flash';
  const modelsToTry = [primaryModel, 'gemini-1.5-flash'];

  // Method 1: Google Gemini OpenAI-compatible completions endpoint
  for (const mName of modelsToTry) {
    try {
      const openAiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: mName,
          messages,
          max_tokens: body.max_tokens || 800,
          temperature: body.temperature ?? 0.6
        })
      });

      if (openAiRes.ok) {
        const data = await openAiRes.json();
        if (data.choices?.[0]?.message?.content) {
          data.provider = isFallback ? 'gemini-fallback' : 'gemini';
          data.is_fallback = isFallback;
          return new Response(JSON.stringify(data), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    } catch (_) { }
  }

  // Method 2: Google Gemini Native REST generateContent endpoint
  try {
    let systemText = '';
    const contents = [];
    for (const m of messages) {
      if (m.role === 'system') {
        systemText += (systemText ? '\n\n' : '') + (m.content || '');
      } else if (m.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: m.content || '' }] });
      } else if (m.role === 'assistant') {
        contents.push({ role: 'model', parts: [{ text: m.content || '' }] });
      }
    }

    const payload = {
      contents,
      generationConfig: {
        maxOutputTokens: body.max_tokens || 800,
        temperature: body.temperature ?? 0.6
      }
    };
    if (systemText) {
      payload.system_instruction = { parts: [{ text: systemText }] };
    }

    for (const mName of modelsToTry) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(mName)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const restRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (restRes.ok) {
        const restData = await restRes.json();
        const text = restData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const formattedOpenAi = {
            id: 'chatcmpl-gemini-' + Date.now(),
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: mName,
            provider: isFallback ? 'gemini-fallback' : 'gemini',
            is_fallback: isFallback,
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: text
                },
                finish_reason: 'stop'
              }
            ]
          };
          return new Response(JSON.stringify(formattedOpenAi), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }
  } catch (err) {
    console.warn('Gemini native REST fallback error:', err.message);
  }

  return new Response(JSON.stringify({ error: 'Google Gemini API request failed' }), {
    status: 502,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
