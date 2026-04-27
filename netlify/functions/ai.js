exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const body = JSON.parse(event.body);
    const { system, messages, max_tokens = 1000 } = body;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Clé OpenAI manquante.' }) };

    const oaiMessages = system
      ? [{ role: 'system', content: system }, ...(messages || [])]
      : (messages || []);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: oaiMessages,
        max_tokens
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('OpenAI error:', JSON.stringify(data));
      return { statusCode: res.status, headers, body: JSON.stringify({ error: data?.error?.message || 'Erreur OpenAI.' }) };
    }

    const text = data.choices?.[0]?.message?.content || '';
    return { statusCode: 200, headers, body: JSON.stringify({ text }) };

  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur : ' + e.message }) };
  }
};
