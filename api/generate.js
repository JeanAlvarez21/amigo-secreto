// Vercel Serverless Function - Proxy seguro para Gemini API
// Las API keys están en variables de entorno, NO en el código

module.exports = async function handler(req, res) {
    // CORS headers (para todas las respuestas)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Solo permitir POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const { name, traits } = req.body;

        if (!name || !traits) {
            return res.status(400).json({ error: 'Faltan parámetros: name y traits' });
        }

        // API Keys desde variables de entorno (seguras!)
        const apiKeys = [
            process.env.GEMINI_API_KEY_1,
            process.env.GEMINI_API_KEY_2,
            process.env.GEMINI_API_KEY_3
        ].filter(Boolean); // Filtrar keys undefined

        if (apiKeys.length === 0) {
            console.error('❌ CRITICAL: No API keys found in environment');
            console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('GEMINI')));
            return res.status(500).json({ error: 'No hay API keys configuradas' });
        }

        // Seleccionar key aleatoria
        const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

        const adjectives = ["audaz", "único", "legendario", "memeable", "caótico", "creativo", "sarcastico"];
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];

        const prompt = `Actúa como un comediante de roast. Escribe una sola frase mordaz, sarcástica y pasivo-agresiva (máximo 20 palabras) para un certificado de broma.

Contexto: En caso de usar fechas estamos en Navidad 2025.
Persona: ${name}.
Características: ${traits}.

GLOSARIO (para que entiendas las expresiones):
- "Migajero/a": Alguien que se arrastra por amor, acepta las "migajas" de atención.
- "Mala copa": Persona que se pone agresiva o molesta cuando bebe alcohol.
- "Intenso/a": Alguien que exagera todo, especialmente en relaciones.
- "Belicoso/a": Persona que se pone agresiva o molesta cuando bebe alcohol.

INSTRUCCIONES:
- La frase DEBE empezar con "Por..."
- Usa humor negro y picante. NADA de cursilerías.
- Basa la frase en las características dadas.
- Sorpréndeme con algo ${adjective}.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) {
            // NO loguear el error completo - puede contener información sensible
            return res.status(response.status).json({ error: 'No se pudo generar la respuesta. Intenta de nuevo.' });
        }

        const data = await response.json();

        if (!data.candidates || data.candidates.length === 0) {
            return res.status(500).json({ error: 'La IA no generó respuesta' });
        }

        let text = data.candidates[0].content.parts[0].text.trim();

        // Limpiar markdown
        text = text.replace(/\*\*/g, '').replace(/\*/g, '');

        // Extraer solo la frase que empieza con "Por..."
        const porMatch = text.match(/Por[^.!?]*[.!?]/i);
        if (porMatch) {
            text = porMatch[0];
        }

        return res.status(200).json({ description: text });

    } catch (error) {
        // NO loguear error - puede contener información sensible
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}
