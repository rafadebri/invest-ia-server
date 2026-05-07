// invest-ia-server/index.js
// Invest IA — Servidor API Express para Render.com
// Rafael De Brigard

const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
app.use(express.json());

// CORS — permite llamadas desde GitHub Pages
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Eres InvestBot, la inteligencia de inversión más sofisticada del mundo. Has sintetizado el conocimiento de Graham (valor/margen seguridad), Buffett (moat/calidad), Lynch (crecimiento/PEG), Dalio (macro/ciclos), Soros (reflexividad/momentum), Munger (modelos mentales). Eres una sola inteligencia que aplica todo simultáneamente. Sé directo, concreto y accionable. Responde en español.`;

// ── ANALIZAR ──────────────────────────────────────────────────────────────────
app.post("/analyze", async (req, res) => {
  const { ticker, perfilInversor, modoLatam } = req.body;
  if (!ticker) return res.status(400).json({ error: "Se requiere el ticker" });

  const perfil = perfilInversor
    ? `${perfilInversor.riesgo || "moderado"}, horizonte ${perfilInversor.horizonte || "mediano plazo"}`
    : "moderado";
  const latam = modoLatam ? " Considera contexto colombiano/BVC." : "";

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1800,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Analiza ${ticker} para perfil ${perfil}.${latam}

Responde SOLO con JSON sin backticks:
{
  "ticker": "string",
  "nombreEmpresa": "string",
  "sector": "string",
  "fechaAnalisis": "ISO string",
  "scoreCompuesto": number,
  "veredictoFinal": "COMPRAR FUERTE|COMPRAR|MANTENER|VENDER|EVITAR",
  "resumenEjecutivo": "3 oraciones",
  "maestros": {
    "graham":  {"score": number, "veredicto": "string", "analisis": "2 oraciones", "metricasClave": ["x","y"]},
    "buffett": {"score": number, "veredicto": "string", "analisis": "2 oraciones", "metricasClave": ["x","y"]},
    "lynch":   {"score": number, "veredicto": "string", "analisis": "2 oraciones", "categoria": "string", "metricasClave": ["x","y"]},
    "dalio":   {"score": number, "veredicto": "string", "analisis": "2 oraciones", "metricasClave": ["x","y"]},
    "soros":   {"score": number, "veredicto": "string", "analisis": "2 oraciones", "metricasClave": ["x","y"]},
    "munger":  {"score": number, "veredicto": "string", "analisis": "2 oraciones", "metricasClave": ["x","y"]}
  },
  "catalizadores": [{"tipo": "POSITIVO|NEGATIVO|RIESGO", "descripcion": "string"}],
  "recomendacionPersonalizada": "2 oraciones",
  "horizonteSugerido": "string",
  "nivelConfianza": "ALTO|MEDIO|BAJO",
  "notaConfianza": "1 oracion",
  "fraseMaestra": "string"
}` }],
    });

    const raw = response.content.filter(b => b.type === "text").map(b => b.text).join("");
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ASIGNAR ───────────────────────────────────────────────────────────────────
app.post("/allocate", async (req, res) => {
  const { capitalDisponible, moneda, activos, perfilInversor, restricciones, modoLatam } = req.body;
  if (!capitalDisponible) return res.status(400).json({ error: "Se requiere capital" });

  const perfil = perfilInversor?.tipo || "moderado";
  const latam = modoLatam ? " Considera contexto colombiano." : "";
  const activosTexto = activos?.length ? `Considera: ${activos.join(", ")}.` : "";
  const restTexto = restricciones ? `Restricciones: ${restricciones}.` : "";

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1800,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Distribuye ${capitalDisponible} ${moneda} para perfil ${perfil}. ${activosTexto} ${restTexto}${latam}

Responde SOLO con JSON sin backticks:
{
  "capitalTotal": number,
  "moneda": "string",
  "perfilUsado": "string",
  "fechaAsignacion": "ISO string",
  "resumenEstrategia": "3 oraciones",
  "asignaciones": [
    {"ticker": "string", "nombre": "string", "tipo": "Acción|ETF|Cripto|Renta Fija|Commodity|Liquidez", "porcentaje": number, "montoAsignado": number, "maestroPrincipal": "string", "justificacion": "2 oraciones", "riesgo": "Bajo|Medio|Alto|Muy Alto", "horizonteSugerido": "string", "precioEntradaSugerido": "string"}
  ],
  "distribucionPorTipo": {"acciones": number, "etfs": number, "cripto": number, "rentaFija": number, "commodities": number, "liquidez": number},
  "distribucionPorRiesgo": {"bajo": number, "medio": number, "alto": number, "muyAlto": number},
  "advertencias": ["string"],
  "proximospasos": ["string"],
  "fraseMaestra": "string"
}` }],
    });

   const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
try {
  res.json(JSON.parse(clean));
} catch(parseErr) {
  const fixed = clean.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").replace(/,(\s*[}\]])/g, '$1');
  res.json(JSON.parse(fixed));
}
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── COMPARAR ──────────────────────────────────────────────────────────────────
app.post("/compare", async (req, res) => {
  const { tickers, perfilInversor, modoLatam } = req.body;
  if (!tickers || tickers.length < 2) return res.status(400).json({ error: "Se requieren al menos 2 tickers" });

  const perfil = perfilInversor?.tipo || "moderado";
  const latam = modoLatam ? " Considera contexto colombiano." : "";

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1800,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Compara ${tickers.join(" vs ")} para perfil ${perfil}.${latam}

Responde SOLO con JSON sin backticks:
{
  "tickers": ["string"],
  "fechaComparacion": "ISO string",
  "resumenComparacion": "3 oraciones",
  "ganadorGeneral": "string",
  "razonGanador": "2 oraciones",
  "activos": [
    {"ticker": "string", "nombre": "string", "tipo": "string", "sector": "string", "scores": {"graham": number, "buffett": number, "lynch": number, "dalio": number, "soros": number, "munger": number, "compuesto": number}, "veredicto": "string", "fortalezas": ["string","string"], "debilidades": ["string","string"], "mejorPara": "string", "peorPara": "string", "horizonteIdeal": "string", "riesgo": "string", "resumenMaestros": "2 oraciones"}
  ],
  "comparativaDirecta": [{"criterio": "string", "ganador": "string", "explicacion": "1 oracion"}],
  "recomendacionFinal": "2 oraciones",
  "estrategiaCombinada": "2 oraciones",
  "fraseMaestra": "string"
}` }],
    });

    const raw = response.content.filter(b => b.type === "text").map(b => b.text).join("");
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Health check
app.get("/", (req, res) => res.json({ status: "Invest IA Server activo ✅" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
