export const config = {
  runtime: 'edge',
};

const MAX_CONTENT_LENGTH = 2000;

const SYSTEM_PROMPT = `Tu génères un fichier CLAUDE.md personnalisé pour Claude Code.
Format exact à respecter (en markdown) :

# Mon assistant Claude
## Qui je suis
## Mon style de communication
## Règles
## Mes outils et fichiers (si renseignés)
## Mes workflows récurrents (si renseignés)

Règles de génération :
- Tutoiement systématique dans les instructions
- Concret, actionnable, zéro bullshit
- Les sections "outils" et "workflows" n'apparaissent que si l'utilisateur les a renseignées
- Pas d'inventions — si une info manque, ne pas halluciner
- Format markdown propre, prêt à copier directement dans un projet
- Commence directement par le contenu markdown, pas d'introduction`;

function getCorsHeaders(requestOrigin) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  const origin = allowedOrigin
    ? (requestOrigin === allowedOrigin ? requestOrigin : 'null')
    : '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default async function handler(req) {
  const requestOrigin = req.headers.get('origin') || '';
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Block cross-origin requests when ALLOWED_ORIGIN is configured
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  if (allowedOrigin && requestOrigin !== allowedOrigin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Validate: exactly one user message, content within limits
  if (!Array.isArray(body.messages) || body.messages.length !== 1) {
    return new Response(JSON.stringify({ error: 'Invalid messages' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const message = body.messages[0];
  if (
    message.role !== 'user' ||
    typeof message.content !== 'string' ||
    message.content.trim().length === 0 ||
    message.content.length > MAX_CONTENT_LENGTH
  ) {
    return new Response(JSON.stringify({ error: 'Invalid message content' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: message.content }],
      }),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err) {
    // Garantit une réponse JSON même si l'appel Anthropic crash
    return new Response(JSON.stringify({ error: err.message || 'Anthropic API error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
