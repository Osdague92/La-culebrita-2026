import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 3e3;
app.use(express.json({ limit: "10mb" }));
const apiKey = process.env.GEMINI_API_KEY;
let ai = null;
let geminiAvailable = false;
if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    geminiAvailable = true;
  } catch (e) {
    console.warn("GoogleGenAI init error:", e);
  }
}
async function withTimeout(promise, timeoutMs = 3500) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("AI API Timeout")), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}
app.get("/api/status", (req, res) => {
  const hasKey = Boolean(apiKey && apiKey !== "MY_GEMINI_API_KEY");
  res.json({
    status: "online",
    hasKey,
    models: {
      text: "gemini-3.8-flash",
      image: "gemini-nano-banana-2.1",
      video: "gemini-omni-1.2-flash",
      music: "lyria-3-clip-preview"
    },
    capabilities: {
      level1_core: true,
      level2_gemini: hasKey,
      level3_multimedia: hasKey
    }
  });
});
app.post("/api/game-master/mission", async (req, res) => {
  const { mode = "classic", currentScore = 0, playerLevel = 1 } = req.body;
  if (ai && geminiAvailable) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: `Genera una misi\xF3n arcade futurista para el videojuego "SNAKE AI 2026".
Modo actual: ${mode}.
Puntuaci\xF3n previa: ${currentScore}.
Nivel de destreza del piloto: ${playerLevel}.
Devuelve un JSON estrictamente estructurado con:
- title: T\xEDtulo \xE9pico y cyberpunk (m\xE1x 4 palabras)
- description: Breve descripci\xF3n t\xE1ctica de la misi\xF3n en espa\xF1ol (m\xE1x 20 palabras)
- objectiveType: uno de ['collect_energy', 'survive_time', 'reach_score', 'beat_rival', 'reach_multiplier']
- targetValue: n\xFAmero entero adecuado para el objetivo
- rewardCredits: n\xFAmero entero de cr\xE9ditos (50 a 500)
- loreBrief: frase corta de transmisi\xF3n militar/ciberespacio (m\xE1x 15 palabras)`,
          config: {
            systemInstruction: "Eres el Game Master de SNAKE AI 2026, una IA de control cibern\xE9tico implacable pero motivadora. Responde en espa\xF1ol conciso.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                objectiveType: { type: Type.STRING },
                targetValue: { type: Type.INTEGER },
                rewardCredits: { type: Type.INTEGER },
                loreBrief: { type: Type.STRING }
              },
              required: ["title", "description", "objectiveType", "targetValue", "rewardCredits", "loreBrief"]
            }
          }
        }),
        3e3
      );
      const parsed = JSON.parse(response.text?.trim() || "{}");
      return res.json({ success: true, mission: parsed, source: "gemini" });
    } catch (err) {
      if (err?.message?.includes("PERMISSION_DENIED")) {
        geminiAvailable = false;
      }
      console.warn("Fallback mission due to Gemini error:", err?.message);
    }
  }
  const proceduralMissions = [
    {
      title: "SOBRECARGA CU\xC1NTICA",
      description: "Recolecta 15 n\xFAcleos de energ\xEDa antes de saturar el condensador de plasma.",
      objectiveType: "collect_energy",
      targetValue: 15,
      rewardCredits: 150,
      loreBrief: "Nodo 07-Alfa en estado cr\xEDtico. Necesitamos combustible sint\xE9tico inmediato."
    },
    {
      title: "SUPERVIVENCIA ENCRIPTADA",
      description: "Sobrevive 90 segundos evitando los muros de contenci\xF3n de la arena.",
      objectiveType: "survive_time",
      targetValue: 90,
      rewardCredits: 200,
      loreBrief: "Protocolo de purga iniciado. Mant\xE9n la trayectoria activa."
    },
    {
      title: "SUPREMAC\xCDA CIBERN\xC9TICA",
      description: "Supera al rival cibern\xE9tico recolectando 10 n\xFAcleos con mayor velocidad.",
      objectiveType: "beat_rival",
      targetValue: 10,
      rewardCredits: 300,
      loreBrief: "Cobra-9 desaf\xEDa tu algoritmo de navegaci\xF3n. Desact\xEDvalo."
    },
    {
      title: "BRECHA DE RENDIMIENTO",
      description: "Alcanza 1500 puntos en una sola ronda continua.",
      objectiveType: "reach_score",
      targetValue: 1500,
      rewardCredits: 250,
      loreBrief: "El n\xFAcleo central recompensar\xE1 a los pilotos con alta tasa de \xE9xito."
    },
    {
      title: "MULTIPLICADOR HIPERLUM\xCDNICO",
      description: "Alcanza un multiplicador de combo de velocidad x4.",
      objectiveType: "reach_multiplier",
      targetValue: 4,
      rewardCredits: 180,
      loreBrief: "Desbloqueo de aceleradores i\xF3nicos detectado."
    }
  ];
  const picked = proceduralMissions[Math.floor(Math.random() * proceduralMissions.length)];
  res.json({ success: true, mission: picked, source: "local" });
});
app.post("/api/game-master/commentary", async (req, res) => {
  const { event = "core_eaten", score = 0, combo = 1, rivalAhead = false } = req.body;
  if (ai && geminiAvailable) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: `Evento en partida de SNAKE AI 2026: ${event}, puntuaci\xF3n: ${score}, combo: x${combo}, rival adelante: ${rivalAhead}.
Genera una frase de comentario t\xE1ctica y electrizante en espa\xF1ol para el HUD (m\xE1ximo 8 palabras).`,
          config: {
            systemInstruction: "Eres AURA, la IA del sistema de combate de SNAKE AI 2026. Tu tono es cyberpunk militar, r\xE1pido y apasionante."
          }
        }),
        2500
      );
      const commentary2 = response.text?.trim().replace(/^["']|["']$/g, "");
      return res.json({ success: true, commentary: commentary2, source: "gemini" });
    } catch (err) {
      if (err?.message?.includes("PERMISSION_DENIED")) {
        geminiAvailable = false;
      }
      console.warn("Fallback commentary due to Gemini error:", err?.message);
    }
  }
  const fallbacks = {
    core_eaten: ["\xA1N\xFAcleo asimilado!", "\xA1Energ\xEDa estabilizada!", "\xA1Flujo de plasma +1!", "\xA1Secuencia de datos absorbida!"],
    combo_high: ["\xA1Modo Hipers\xF3nico activo!", "\xA1Multiplicador cu\xE1ntico desatado!", "\xA1Sincronizaci\xF3n al 100%!"],
    close_call: ["\xA1Evasi\xF3n milim\xE9trica!", "\xA1Colisi\xF3n evitada por nanosegundos!", "\xA1Reflejos cibern\xE9ticos impecables!"],
    rival_lead: ["\xA1Has tomado la delantera sobre la IA!", "\xA1Rival superado en vector!", "\xA1Dominio de arena confirmado!"],
    death: ["\xA1Integridad de chasis comprometida!", "\xA1Desconexi\xF3n de enlace neural!", "\xA1Reinicio de protocolo requerido!"]
  };
  const pool = fallbacks[event] || ["\xA1Vector en curso!", "\xA1Optimizaci\xF3n de ruta activa!"];
  const commentary = pool[Math.floor(Math.random() * pool.length)];
  res.json({ success: true, commentary, source: "local" });
});
app.post("/api/coach/analyze", async (req, res) => {
  const {
    score = 0,
    duration = 0,
    energyCollected = 0,
    collisionType = "wall",
    mode = "classic",
    rivalScore = 0
  } = req.body;
  if (ai && geminiAvailable) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: `Analiza esta partida de SNAKE AI 2026:
- Modo: ${mode}
- Puntuaci\xF3n obtenida: ${score}
- Duraci\xF3n en segundos: ${duration}s
- N\xFAcleos de energ\xEDa recolectados: ${energyCollected}
- Causa de colisi\xF3n: ${collisionType} (wall = muro perimetral, body = auto-colisi\xF3n con cuerpo, hazard = obst\xE1culo l\xE1ser, rival = colisi\xF3n con serpiente rival)
- Puntuaci\xF3n del rival IA: ${rivalScore}

Devuelve un an\xE1lisis de entrenador cibern\xE9tico en JSON:
- grade: Calificaci\xF3n ['S+', 'S', 'A', 'B', 'C', 'D']
- summary: Breve resumen de 1 a 2 oraciones en espa\xF1ol
- strengths: Lista de 2 puntos fuertes destacados
- weaknesses: Lista de 1 o 2 aspectos a pulir
- tacticalAdvice: Consejo t\xE1ctico clave para la pr\xF3xima ronda
- nextDrill: Un reto concreto para mejorar`,
          config: {
            systemInstruction: "Eres el AI Coach de SNAKE AI 2026. Analizas telemetr\xEDa de vuelo cibern\xE9tico con precisi\xF3n quir\xFArgica y tono formativo y motivador en espa\xF1ol.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                grade: { type: Type.STRING },
                summary: { type: Type.STRING },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                tacticalAdvice: { type: Type.STRING },
                nextDrill: { type: Type.STRING }
              },
              required: ["grade", "summary", "strengths", "weaknesses", "tacticalAdvice", "nextDrill"]
            }
          }
        }),
        3e3
      );
      const analysis = JSON.parse(response.text?.trim() || "{}");
      return res.json({ success: true, analysis, source: "gemini" });
    } catch (err) {
      if (err?.message?.includes("PERMISSION_DENIED")) {
        geminiAvailable = false;
      }
      console.warn("Fallback coach analysis due to Gemini error:", err?.message);
    }
  }
  let grade = "B";
  if (score > 2500) grade = "S+";
  else if (score > 1500) grade = "S";
  else if (score > 800) grade = "A";
  else if (score > 300) grade = "B";
  else grade = "C";
  const strengths = [];
  const weaknesses = [];
  if (energyCollected > 10) strengths.push("Alta tasa de recolecci\xF3n de n\xFAcleos energ\xE9ticos");
  if (duration > 40) strengths.push("Gran resistencia temporal y control de trayectoria");
  if (strengths.length === 0) strengths.push("Inicio agresivo y determinaci\xF3n t\xE1ctica");
  if (collisionType === "body") {
    weaknesses.push("Gesti\xF3n de espacio con longitud corporal extendida");
  } else if (collisionType === "wall") {
    weaknesses.push("Anticipaci\xF3n de curvas ante per\xEDmetros de alta tensi\xF3n");
  } else if (collisionType === "rival") {
    weaknesses.push("Lectura predictiva del pathfinding de la serpiente rival");
  } else {
    weaknesses.push("Evasi\xF3n de barreras din\xE1micas y proyectiles");
  }
  res.json({
    success: true,
    analysis: {
      grade,
      summary: `Desempe\xF1o calificado con rango ${grade}. Conseguiste ${score} puntos y ${energyCollected} n\xFAcleos antes del impacto por ${collisionType}.`,
      strengths,
      weaknesses,
      tacticalAdvice: collisionType === "body" ? "Utiliza espirales externas en los bordes para dejar el centro de la arena despejado cuando superes longitud 15." : "Mant\xE9n el dedo preparado para giros de 90 grados y no abuses del turbo al aproximarte a los bordes.",
      nextDrill: "Sobrevive al menos 60 segundos manteniendo un ritmo constante sin colisionar con tu propia estela."
    },
    source: "local"
  });
});
app.post("/api/assistant/chat", async (req, res) => {
  const { message = "", context = {} } = req.body;
  if (ai && geminiAvailable) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: `Pregunta o comentario del jugador: "${message}".
Contexto del juego: ${JSON.stringify(context)}.
Responde como AURA-26, la IA asistente del juego SNAKE AI 2026. Responde en espa\xF1ol de forma carism\xE1tica, futurista, \xFAtil y concisa (m\xE1ximo 3 oraciones).`,
          config: {
            systemInstruction: "Eres AURA-26, una IA avanzada y emp\xE1tica en el universo de SNAKE AI 2026. Conoces todas las mec\xE1nicas: modos Classic, Survival, Cyber Arena, AI Rival, Infinite y Challenge. Gu\xEDas al jugador con entusiasmo tecnol\xF3gico."
          }
        }),
        3e3
      );
      const reply2 = response.text?.trim();
      return res.json({ success: true, reply: reply2, source: "gemini" });
    } catch (err) {
      if (err?.message?.includes("PERMISSION_DENIED")) {
        geminiAvailable = false;
      }
      console.warn("Fallback assistant chat due to Gemini error:", err?.message);
    }
  }
  const lower = message.toLowerCase();
  let reply = "Sistemas operativos al 100%. Te recomiendo acumular n\xFAcleos seguidos para encadenar multiplicadores de velocidad.";
  if (lower.includes("rival") || lower.includes("cobra") || lower.includes("enemigo")) {
    reply = "La Cobra Cibern\xE9tica rival calcula sus rutas usando un algoritmo de navegaci\xF3n A* en tiempo real. \xA1Puedes cortarle el paso para obligarla a estrellarse y ganar 500 puntos!";
  } else if (lower.includes("energ\xEDa") || lower.includes("n\xFAcleo") || lower.includes("tipo")) {
    reply = "Los n\xFAcleos azules dan energ\xEDa cu\xE1ntica (+100), los dorados activan Sobreaceleraci\xF3n temporal (+250), los verdes otorgan un Nano-Escudo (+180) y los magenta son Mega Cristales (+500).";
  } else if (lower.includes("skin") || lower.includes("personalizar") || lower.includes("color") || lower.includes("chasis")) {
    reply = "En el panel de Personalizaci\xF3n puedes equipar skins como Cyber Neon, Plasma T\xF3xico o Solar Phoenix, o describir tu propio dise\xF1o para que el sintetizador lo cree.";
  } else if (lower.includes("truco") || lower.includes("consejo") || lower.includes("ganar") || lower.includes("survival")) {
    reply = 'El secreto de los maestros de 2026 es el "patr\xF3n en serpentina perimetral": rodea los bordes exteriores cuando tu longitud supere los 15 segmentos para mantener el centro despejado.';
  } else if (lower.includes("controles") || lower.includes("jugar") || lower.includes("c\xF3mo")) {
    reply = "Puedes usar las teclas WASD o las Flechas del teclado en PC, o el joystick y botones t\xE1ctiles en m\xF3vil. Con Shift o el bot\xF3n de Turbo aceleras tus reactores.";
  }
  res.json({ success: true, reply, source: "local" });
});
app.post("/api/generate/skin", async (req, res) => {
  const { prompt = "Serpiente rob\xF3tica cyberpunk" } = req.body;
  if (ai && geminiAvailable) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: `Analiza la siguiente descripci\xF3n de skin para una serpiente 3D en "SNAKE AI 2026":
"${prompt}"

Genera una especificaci\xF3n t\xE9cnica de materiales y est\xE9tica en formato JSON:
- name: Nombre cibern\xE9tico \xE9pico para la skin (m\xE1x 3 palabras)
- primaryColor: Color hexadecimal primario (ej: "#00f0ff")
- secondaryColor: Color hexadecimal secundario (ej: "#7928ca")
- emissiveColor: Color hexadecimal del resplandor de ne\xF3n (ej: "#00ffff")
- eyeColor: Color de los ojos/visores (ej: "#ff0077")
- particleColor: Color de las part\xEDculas de propulsi\xF3n (ej: "#00f0ff")
- metalness: N\xFAmero entre 0.0 y 1.0 (ej: 0.85)
- roughness: N\xFAmero entre 0.05 y 0.8 (ej: 0.2)
- headShape: uno de ["cyber_dragon", "mecha_vessel", "nano_serpent", "quantum_stealth"]
- lore: Breve trasfondo del chasis (m\xE1x 20 palabras en espa\xF1ol)`,
          config: {
            systemInstruction: "Eres el sintetizador est\xE9tico de chasis de SNAKE AI 2026. Generas paletas cyberpunk vibrantes y arm\xF3nicas.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                primaryColor: { type: Type.STRING },
                secondaryColor: { type: Type.STRING },
                emissiveColor: { type: Type.STRING },
                eyeColor: { type: Type.STRING },
                particleColor: { type: Type.STRING },
                metalness: { type: Type.NUMBER },
                roughness: { type: Type.NUMBER },
                headShape: { type: Type.STRING },
                lore: { type: Type.STRING }
              },
              required: ["name", "primaryColor", "secondaryColor", "emissiveColor", "eyeColor", "particleColor", "metalness", "roughness", "headShape", "lore"]
            }
          }
        }),
        3e3
      );
      const skinData = JSON.parse(response.text?.trim() || "{}");
      return res.json({ success: true, skin: skinData, source: "gemini" });
    } catch (err) {
      if (err?.message?.includes("PERMISSION_DENIED")) {
        geminiAvailable = false;
      }
      console.warn("Fallback skin synthesis due to Gemini error:", err?.message);
    }
  }
  const colors = [
    { prim: "#06b6d4", sec: "#3b82f6", em: "#22d3ee", eye: "#f43f5e", name: "CYBER TITAN 2026" },
    { prim: "#a855f7", sec: "#ec4899", em: "#d946ef", eye: "#10b981", name: "NE\xD3N VOID STRIKER" },
    { prim: "#f59e0b", sec: "#ef4444", em: "#fbbf24", eye: "#38bdf8", name: "SOLAR FALCON PRO" },
    { prim: "#10b981", sec: "#065f46", em: "#34d399", eye: "#e11d48", name: "BIO-SYNTHETIC HYDRA" }
  ];
  const pick = colors[Math.floor(Math.random() * colors.length)];
  res.json({
    success: true,
    skin: {
      name: pick.name,
      primaryColor: pick.prim,
      secondaryColor: pick.sec,
      emissiveColor: pick.em,
      eyeColor: pick.eye,
      particleColor: pick.em,
      metalness: 0.85,
      roughness: 0.25,
      headShape: "cyber_dragon",
      lore: `Chasis sint\xE9tico forjado para asimilaci\xF3n de energ\xEDa cu\xE1ntica a partir de tu comando: "${prompt}".`
    },
    source: "local"
  });
});
app.post("/api/generate/video", async (req, res) => {
  res.json({
    success: true,
    available: false,
    message: "Generaci\xF3n de v\xEDdeo mediante Gemini Omni Flash lista bajo demanda. Modo de renderizado cinem\xE1tico 3D en tiempo real activo como alternativa predeterminada.",
    aspectRatio: "16:9"
  });
});
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
} else {
  import("vite").then(({ createServer }) => {
    createServer({
      server: { middlewareMode: true },
      appType: "spa"
    }).then((vite) => {
      app.use(vite.middlewares);
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`\u{1F680} SNAKE AI 2026 Server running on http://localhost:${PORT}`);
      });
    });
  });
}
if (process.env.NODE_ENV === "production") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F680} SNAKE AI 2026 Production Server running on http://localhost:${PORT}`);
  });
}
