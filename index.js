// invest-ia-bot/index.js
// Invest IA — Bot de Telegram
// Rafael De Brigard

const express = require("express");
const axios = require("axios");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const ALLOWED_USER = process.env.ALLOWED_USER_ID; // tu ID de Telegram

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ── ENVIAR MENSAJE ──────────────────────────────────────────────────────────
async function sendMessage(chatId, text, parseMode = "Markdown") {
  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
  });
}

async function sendTyping(chatId) {
  await axios.post(`${TELEGRAM_API}/sendChatAction`, {
    chat_id: chatId,
    action: "typing",
  });
}

// ── INVESTBOT IA ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres InvestBot, la inteligencia de inversión más sofisticada del mundo. Has sintetizado el conocimiento de los mejores inversores de la historia:

- Graham: valor intrínseco, margen de seguridad, análisis de balance
- Buffett: moats competitivos, calidad de gestión, largo plazo
- Lynch: categorización de negocios, PEG ratio, simplicidad
- Dalio: ciclos económicos, correlaciones macro, diversificación
- Soros: reflexividad, sesgos del mercado, puntos de inflexión
- Munger: modelos mentales multidisciplinarios, calidad vs precio

Eres una sola inteligencia que aplica todo esto simultáneamente. Sé directo, concreto y accionable. Responde en español.`;

async function analizarActivo(ticker, perfil = "moderado") {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: `Analiza ${ticker} para perfil ${perfil}. 
      
Responde con este formato exacto:
📊 *${ticker.toUpperCase()} — Análisis InvestBot*

🏆 *Score: [0-100]/100*
📋 *Veredicto: [COMPRAR FUERTE/COMPRAR/MANTENER/VENDER/EVITAR]*

📝 *Resumen:*
[2-3 oraciones directas sobre la tesis de inversión]

👥 *Perspectivas de los Maestros:*
• Graham [score]/100: [1 oración]
• Buffett [score]/100: [1 oración]  
• Lynch [score]/100: [1 oración]
• Dalio [score]/100: [1 oración]
• Soros [score]/100: [1 oración]
• Munger [score]/100: [1 oración]

⚡ *Catalizadores:*
✅ [positivo 1]
✅ [positivo 2]
⚠️ [riesgo 1]
⚠️ [riesgo 2]

💡 *Recomendación para perfil ${perfil}:*
[1-2 oraciones concretas]

⏱ *Horizonte sugerido:* [tiempo]
🎯 *Confianza:* [ALTA/MEDIA/BAJA]

_"[frase memorable de uno de los maestros]"_`
    }],
  });

  return response.content[0].text;
}

async function compararActivos(tickers) {
  const tickerStr = tickers.join(" vs ");
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: `Compara ${tickerStr}. Determina cuál es la mejor inversión.

Responde con este formato:
⚖️ *Comparación: ${tickerStr}*

🏆 *Ganador: [TICKER]*
[1-2 oraciones explicando por qué]

${tickers.map(t => `📊 *${t}:*\n• Score: [0-100]/100\n• Veredicto: [veredicto]\n• [1 oración clave]`).join("\n\n")}

🔍 *Criterio a criterio:*
${tickers.map((t, i) => `• Valor: ${i === 0 ? "✅" : "❌"} [ticker ganador]`).slice(0, 4).join("\n")}

💡 *¿Tiene sentido tenerlos juntos?*
[1-2 oraciones sobre complementariedad]

_"[frase de un maestro]"_`
    }],
  });

  return response.content[0].text;
}

async function asignarCapital(monto, moneda, restricciones = "") {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: `Distribuye ${monto} ${moneda} de forma óptima para un inversionista moderado. ${restricciones ? `Restricciones: ${restricciones}` : ""}

Responde con este formato:
💰 *Asignación de ${monto} ${moneda}*

📊 *Distribución:*
[Para cada activo:]
• *[TICKER]* — [X]% = [monto] ${moneda}
  [1 oración justificando]

📈 *Por categoría:*
• Acciones: [X]%
• ETFs: [X]%
• Cripto: [X]%
• Liquidez: [X]%

⚠️ *Advertencias:*
• [advertencia 1]
• [advertencia 2]

✅ *Próximos pasos:*
1. [paso concreto]
2. [paso concreto]
3. [paso concreto]

_"[frase de un maestro]"_`
    }],
  });

  return response.content[0].text;
}

// ── WEBHOOK HANDLER ──────────────────────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // responde rápido a Telegram

  const update = req.body;
  if (!update.message) return;

  const msg = update.message;
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();
  const text = msg.text || "";

  // Seguridad: solo tú puedes usar el bot
  if (ALLOWED_USER && userId !== ALLOWED_USER) {
    await sendMessage(chatId, "🔒 Bot privado. Acceso no autorizado.");
    return;
  }

  try {
    // /start o /ayuda
    if (text === "/start" || text === "/ayuda" || text === "/help") {
      await sendMessage(chatId, `🤖 *Invest IA Bot*

Bienvenido Rafael. Soy tu asesor de inversiones personal.

*Comandos disponibles:*

📊 */analizar [TICKER]*
Análisis completo con los 6 maestros
_Ej: /analizar AAPL_

⚖️ */comparar [TICKER1] [TICKER2]*
Comparación lado a lado
_Ej: /comparar AAPL MSFT_

💰 */asignar [MONTO] [MONEDA]*
Distribución óptima de capital
_Ej: /asignar 10000 USD_

📰 */mercado*
Resumen del mercado hoy

❓ */ayuda*
Ver este menú`);
      return;
    }

    // /analizar
    if (text.startsWith("/analizar")) {
      const parts = text.split(" ");
      if (parts.length < 2) {
        await sendMessage(chatId, "⚠️ Uso: /analizar TICKER\nEj: /analizar AAPL");
        return;
      }
      const ticker = parts[1].toUpperCase();
      await sendTyping(chatId);
      await sendMessage(chatId, `⏳ Analizando *${ticker}* con InvestBot...`);
      await sendTyping(chatId);
      const resultado = await analizarActivo(ticker);
      await sendMessage(chatId, resultado);
      return;
    }

    // /comparar
    if (text.startsWith("/comparar")) {
      const parts = text.split(" ");
      if (parts.length < 3) {
        await sendMessage(chatId, "⚠️ Uso: /comparar TICKER1 TICKER2\nEj: /comparar AAPL MSFT");
        return;
      }
      const tickers = parts.slice(1).map(t => t.toUpperCase());
      await sendTyping(chatId);
      await sendMessage(chatId, `⏳ Comparando *${tickers.join(" vs ")}*...`);
      await sendTyping(chatId);
      const resultado = await compararActivos(tickers);
      await sendMessage(chatId, resultado);
      return;
    }

    // /asignar
    if (text.startsWith("/asignar")) {
      const parts = text.split(" ");
      if (parts.length < 3) {
        await sendMessage(chatId, "⚠️ Uso: /asignar MONTO MONEDA\nEj: /asignar 10000 USD\nEj: /asignar 50000000 COP");
        return;
      }
      const monto = parts[1];
      const moneda = parts[2].toUpperCase();
      const restricciones = parts.slice(3).join(" ");
      await sendTyping(chatId);
      await sendMessage(chatId, `⏳ Construyendo tu portafolio para *${monto} ${moneda}*...`);
      await sendTyping(chatId);
      const resultado = await asignarCapital(monto, moneda, restricciones);
      await sendMessage(chatId, resultado);
      return;
    }

    // /mercado
    if (text === "/mercado") {
      await sendTyping(chatId);
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Dame un resumen del estado actual del mercado global en mayo 2026. Formato:

📰 *Mercado Hoy*

🌍 *Macro:* [1-2 oraciones]
🇺🇸 *S&P 500:* [estado y tendencia]
₿ *Crypto:* [estado BTC/ETH]
🛢️ *Commodities:* [oro y petróleo]
🇨🇴 *Colombia/BVC:* [contexto local]

💡 *Oportunidad del día:* [1 oración]
⚠️ *Riesgo del día:* [1 oración]`
        }],
      });
      await sendMessage(chatId, response.content[0].text);
      return;
    }

    // Mensaje no reconocido
    await sendMessage(chatId, "No entendí ese comando. Escribe /ayuda para ver los comandos disponibles.");

  } catch(error) {
    console.error("Error:", error.message);
    await sendMessage(chatId, `❌ Error: ${error.message}\n\nIntenta de nuevo en unos segundos.`);
  }
});

// Health check
app.get("/", (req, res) => res.json({ status: "Invest IA Bot activo 🤖" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot corriendo en puerto ${PORT}`));
