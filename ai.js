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
    const { provider = 'claude', system, messages, max_tokens = 1000 } = body;

    // ── CLAUDE ────────────────────────────────────────────────
    if (provider === 'claude') {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Clé API manquante côté serveur.' }) };

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens,
          system,
          messages
        })
      });

      const data = await res.json();
      if (!res.ok) return { statusCode: res.status, headers, body: JSON.stringify({ error: data.error?.message || 'Erreur Claude.' }) };
      const text = data.content?.[0]?.text || '';
      return { statusCode: 200, headers, body: JSON.stringify({ text }) };
    }

    // ── OPENAI ────────────────────────────────────────────────
    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY || body.userKey;
      if (!apiKey) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Clé OpenAI requise.' }) };

      const oaiMessages = system
        ? [{ role: 'system', content: system }, ...messages]
        : messages;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'gpt-4o', messages: oaiMessages, max_tokens })
      });

      const data = await res.json();
      if (!res.ok) return { statusCode: res.status, headers, body: JSON.stringify({ error: data.error?.message || 'Erreur OpenAI.' }) };
      const text = data.choices?.[0]?.message?.content || '';
      return { statusCode: 200, headers, body: JSON.stringify({ text }) };
    }

    // ── GEMINI ────────────────────────────────────────────────
    if (provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY || body.userKey;
      if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Clé Gemini manquante côté serveur.' }) };

      const prompt = system ? system + '\n\n' + (messages?.[0]?.content || '') : (messages?.[0]?.content || '');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await res.json();
      if (!res.ok) {
        const errMsg = data?.error?.message || JSON.stringify(data);
        console.error('Gemini error:', errMsg);
        return { statusCode: res.status, headers, body: JSON.stringify({ error: 'Gemini: ' + errMsg }) };
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return { statusCode: 200, headers, body: JSON.stringify({ text }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Provider inconnu.' }) };

  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erreur serveur : ' + e.message })
    };
  }
};
