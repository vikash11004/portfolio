/**
 * GVEN Portfolio AI Proxy — Cloudflare Worker
 * 
 * Secure reverse proxy that allows public visitors to chat with Groq LLaMA 3.3
 * in natural language without exposing your secret GROQ_API_KEY to the public.
 * 
 * Setup Instructions:
 * 1. Go to https://dash.cloudflare.com/ -> Workers & Pages -> Create Application -> Create Worker
 * 2. Paste this entire code into the worker editor and click "Deploy".
 * 3. Go to Worker Settings -> Variables and Secrets -> Add Secret:
 *      Name: GROQ_API_KEY
 *      Value: <your-new-groq-api-key> (from https://console.groq.com/keys)
 * 4. Copy your worker URL (e.g. https://gven-ai.your-subdomain.workers.dev)
 * 5. Paste the URL into your Portfolio Admin Panel -> AI Configuration -> Secure Proxy URL.
 */

export default {
  async fetch(request, env) {
    // Standard CORS headers allowing requests from your portfolio
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Health check on GET
    if (request.method === 'GET') {
      const apiKey = String(env.GROQ_API_KEY || '').trim().replace(/^["']|["']$/g, '');
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'GVEN Portfolio AI Proxy',
        groqConfigured: !!apiKey
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
      const apiKey = String(env.GROQ_API_KEY || '').trim().replace(/^["']|["']$/g, '');

      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: 'GROQ_API_KEY secret is not set in Cloudflare Worker environment.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Default to fast, active Groq flagship model
      let model = body.model || 'openai/gpt-oss-120b';
      if (!model || model.includes('llama-3') || model.includes('llama3') || model.includes('gemma') || model === 'groq/compound-mini') {
        model = 'openai/gpt-oss-120b';
      }
      const messages = body.messages || [];

      // Forward request to Groq with secure server-side authorization
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: body.max_tokens || 800,
          temperature: body.temperature ?? 0.6
        })
      });

      const groqData = await groqRes.json();

      return new Response(JSON.stringify(groqData), {
        status: groqRes.status,
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
