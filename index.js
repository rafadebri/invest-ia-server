// invest-ia-server/index.js
// Invest IA — Servidor API Express para Render.com
// Rafael De Brigard

const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Eres InvestBot, experto en inversiones. Combinas Graham, Buffett, Lynch, Dalio, Soros y Munger. Responde SIEMPRE en español con JSON valido y conciso. Cada campo de texto maximo 60 caracteres.`;

function parseJSON(raw) {
  const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch(e) {
    try {
      const fixed = clean
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
        .replace(/,(\s*[}\]])/g, '$1');
      return JSON.parse(fixed);
    } catch(e2) {
      return { error: "Error parseando JSON: " + e2.message, raw: clean.substring(0, 200) };
    }
  }
}

// ── ANALIZAR ──────────────────────────────────────────────────────────────────
app.post("/analyze", async (req, res) => {
  const { ticker, perfilInversor, modoLatam } = req.body;
  if (!ticker) return res.status(400).json({ error: "Se requiere el ticker" });

  const perfil = perfilInversor?.riesgo || "moderado";
  const latam = modoLatam ? " Contexto Colombia/BVC." : "";

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Analiza ${ticker} perfil ${perfil}.${latam}
JSON sin backticks (textos max 60 chars cada uno):
{"ticker":"","nombreEmpresa":"","sector":"","fechaAnalisis":"","scoreCompuesto":0,"veredictoFinal":"COMPRAR FUERTE|COMPRAR|MANTENER|VENDER|EVITAR","resumenEjecutivo":"","maestros":{"graham":{"score":0,"veredicto":"","analisis":"","metricasClave":["",""]},"buffett":{"score":0,"veredicto":"","analisis":"","metricasClave":["",""]},"lynch":{"score":0,"veredicto":"","analisis":"","categoria":"","metricasClave":["",""]},"dalio":{"score":0,"veredicto":"","analisis":"","metricasClave":["",""]},"soros":{"score":0,"veredicto":"","analisis":"","metricasClave":["",""]},"munger":{"score":0,"veredicto":"","analisis":"","metricasClave":["",""]}},"catalizadores":[{"tipo":"POSITIVO","descripcion":""},{"tipo":"RIESGO","descripcion":""}],"recomendacionPersonalizada":"","horizonteSugerido":"","nivelConfianza":"ALTO|MEDIO|BAJO","notaConfianza":"","fraseMaestra":""}` }],
    });

    const raw = response.content.filter(b => b.type === "text").map(b => b.text).join("");
    const result = parseJSON(raw);
    if (result.error) return res.status(500).json(result);
    res.json(result);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ASIGNAR ───────────────────────────────────────────────────────────────────
app.post("/allocate", async (req, res) => {
  const { capitalDisponible, moneda, activos, perfilInversor, restricciones, modoLatam } = req.body;
  if (!capitalDisponible) return res.status(400).json({ error: "Se requiere capital" });

  const perfil = perfilInversor?.tipo || "moderado";
  const latam = modoLatam ? " Contexto Colombia." : "";
  const extras = [
    activos?.length ? `Activos: ${activos.join(",")}` : "",
    restricciones || ""
  ].filter(Boolean).join(". ");

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Distribuye ${capitalDisponible} ${moneda} perfil ${perfil}. ${extras}${latam}
JSON sin backticks (textos max 60 chars):
{"capitalTotal":0,"moneda":"","perfilUsado":"","fechaAsignacion":"","resumenEstrategia":"","asignaciones":[{"ticker":"","nombre":"","tipo":"Accion|ETF|Cripto|Renta Fija|Liquidez","porcentaje":0,"montoAsignado":0,"maestroPrincipal":"","justificacion":"","riesgo":"Bajo|Medio|Alto","horizonteSugerido":"","precioEntradaSugerido":""}],"distribucionPorTipo":{"acciones":0,"etfs":0,"cripto":0,"rentaFija":0,"liquidez":0},"advertencias":[""],"proximospasos":[""],"fraseMaestra":""}` }],
    });

    const raw = response.content.filter(b => b.type === "text").map(b => b.text).join("");
    const result = parseJSON(raw);
    if (result.error) return res.status(500).json(result);
    res.json(result);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── COMPARAR ──────────────────────────────────────────────────────────────────
app.post("/compare", async (req, res) => {
  const { tickers, perfilInversor, modoLatam } = req.body;
  if (!tickers || tickers.length < 2) return res.status(400).json({ error: "Se requieren al menos 2 tickers" });

  const perfil = perfilInversor?.tipo || "moderado";
  const latam = modoLatam ? " Contexto Colombia." : "";

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Compara ${tickers.join(" vs ")} perfil ${perfil}.${latam}
JSON sin backticks (textos max 60 chars):
{"tickers":[],"fechaComparacion":"","resumenComparacion":"","ganadorGeneral":"","razonGanador":"","activos":[{"ticker":"","nombre":"","tipo":"","sector":"","scores":{"graham":0,"buffett":0,"lynch":0,"dalio":0,"soros":0,"munger":0,"compuesto":0},"veredicto":"","fortalezas":["",""],"debilidades":["",""],"mejorPara":"","peorPara":"","horizonteIdeal":"","riesgo":"","resumenMaestros":""}],"comparativaDirecta":[{"criterio":"","ganador":"","explicacion":""}],"recomendacionFinal":"","estrategiaCombinada":"","fraseMaestra":""}` }],
    });

    const raw = response.content.filter(b => b.type === "text").map(b => b.text).join("");
    const result = parseJSON(raw);
    if (result.error) return res.status(500).json(result);
    res.json(result);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/", (req, res) => res.json({ status: "Invest IA Server activo" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
