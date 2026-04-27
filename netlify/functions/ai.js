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
    const { provider = 'gemini', system, messages, max_tokens = 1000 } = body;

    if (provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY || body.userKey;
      if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Clé Gemini manquante.' }) };

      const prompt = system ? system + '\n\n' + (messages?.[0]?.content || '') : (messages?.[0]?.content || '');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('Gemini error:', JSON.stringify(data));
        return { statusCode: res.status, headers, body: JSON.stringify({ error: data?.error?.message || 'Erreur Gemini.' }) };
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return { statusCode: 200, headers, body: JSON.stringify({ text }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Provider inconnu.' }) };

  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur : ' + e.message }) };
  }
};
