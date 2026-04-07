export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `Tu génères un fichier CLAUDE.md personnalisé pour Claude Code.
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
- Commence directement par le contenu markdown, pas d'introduction`,
      messages: body.messages,
    }),
  });

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
