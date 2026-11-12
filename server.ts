import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI client if API key is present
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
let geminiAvailable = false;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  try {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    geminiAvailable = true;
  } catch (e) {
    console.warn('GoogleGenAI init error:', e);
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 3500): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI API Timeout')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// 1. Status endpoint
app.get('/api/status', (req, res) => {
  const hasKey = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');
  res.json({
    status: 'online',
    hasKey,
    models: {
      text: 'gemini-3.8-flash',
      image: 'gemini-nano-banana-2.1',
      video: 'gemini-omni-1.2-flash',
      music: 'lyria-3-clip-preview',
    },
    capabilities: {
      level1_core: true,
      level2_gemini: hasKey,
      level3_multimedia: hasKey,
    },
  });
});

// 2. AI Game Master: Dynamic Mission Generator
app.post('/api/game-master/mission', async (req, res) => {
  const { mode = 'classic', currentScore = 0, playerLevel = 1 } = req.body;

  if (ai && geminiAvailable) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Genera una misión arcade futurista para el videojuego "SNAKE AI 2026".
Modo actual: ${mode}.
Puntuación previa: ${currentScore}.
Nivel de destreza del piloto: ${playerLevel}.
Devuelve un JSON estrictamente estructurado con:
- title: Título épico y cyberpunk (máx 4 palabras)
- description: Breve descripción táctica de la misión en español (máx 20 palabras)
- objectiveType: uno de ['collect_energy', 'survive_time', 'reach_score', 'beat_rival', 'reach_multiplier']
- targetValue: número entero adecuado para el objetivo
- rewardCredits: número entero de créditos (50 a 500)
- loreBrief: frase corta de transmisión militar/ciberespacio (máx 15 palabras)`,
          config: {
            systemInstruction: 'Eres el Game Master de SNAKE AI 2026, una IA de control cibernético implacable pero motivadora. Responde en español conciso.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                objectiveType: { type: Type.STRING },
                targetValue: { type: Type.INTEGER },
                rewardCredits: { type: Type.INTEGER },
                loreBrief: { type: Type.STRING },
              },
              required: ['title', 'description', 'objectiveType', 'targetValue', 'rewardCredits', 'loreBrief'],
            },
          },
        }),
        3000
      );

      const parsed = JSON.parse(response.text?.trim() || '{}');
      return res.json({ success: true, mission: parsed, source: 'gemini' });
    } catch (err: any) {
      if (err?.message?.includes('PERMISSION_DENIED')) {
        geminiAvailable = false;
      }
      console.warn('Fallback mission due to Gemini error:', err?.message);
    }
  }

  // Fallback procedural mission
  const proceduralMissions = [
    {
      title: 'SOBRECARGA CUÁNTICA',
      description: 'Recolecta 15 núcleos de energía antes de saturar el condensador de plasma.',
      objectiveType: 'collect_energy',
      targetValue: 15,
      rewardCredits: 150,
      loreBrief: 'Nodo 07-Alfa en estado crítico. Necesitamos combustible sintético inmediato.',
    },
    {
      title: 'SUPERVIVENCIA ENCRIPTADA',
      description: 'Sobrevive 90 segundos evitando los muros de contención de la arena.',
      objectiveType: 'survive_time',
      targetValue: 90,
      rewardCredits: 200,
      loreBrief: 'Protocolo de purga iniciado. Mantén la trayectoria activa.',
    },
    {
      title: 'SUPREMACÍA CIBERNÉTICA',
      description: 'Supera al rival cibernético recolectando 10 núcleos con mayor velocidad.',
      objectiveType: 'beat_rival',
      targetValue: 10,
      rewardCredits: 300,
      loreBrief: 'Cobra-9 desafía tu algoritmo de navegación. Desactívalo.',
    },
    {
      title: 'BRECHA DE RENDIMIENTO',
      description: 'Alcanza 1500 puntos en una sola ronda continua.',
      objectiveType: 'reach_score',
      targetValue: 1500,
      rewardCredits: 250,
      loreBrief: 'El núcleo central recompensará a los pilotos con alta tasa de éxito.',
    },
    {
      title: 'MULTIPLICADOR HIPERLUMÍNICO',
      description: 'Alcanza un multiplicador de combo de velocidad x4.',
      objectiveType: 'reach_multiplier',
      targetValue: 4,
      rewardCredits: 180,
      loreBrief: 'Desbloqueo de aceleradores iónicos detectado.',
    },
  ];

  const picked = proceduralMissions[Math.floor(Math.random() * proceduralMissions.length)];
  res.json({ success: true, mission: picked, source: 'local' });
});

// 3. AI Game Master: In-Game Contextual Commentary
app.post('/api/game-master/commentary', async (req, res) => {
  const { event = 'core_eaten', score = 0, combo = 1, rivalAhead = false } = req.body;

  if (ai && geminiAvailable) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Evento en partida de SNAKE AI 2026: ${event}, puntuación: ${score}, combo: x${combo}, rival adelante: ${rivalAhead}.
Genera una frase de comentario táctica y electrizante en español para el HUD (máximo 8 palabras).`,
          config: {
            systemInstruction: 'Eres AURA, la IA del sistema de combate de SNAKE AI 2026. Tu tono es cyberpunk militar, rápido y apasionante.',
          },
        }),
        2500
      );

      const commentary = response.text?.trim().replace(/^["']|["']$/g, '');
      return res.json({ success: true, commentary, source: 'gemini' });
    } catch (err: any) {
      if (err?.message?.includes('PERMISSION_DENIED')) {
        geminiAvailable = false;
      }
      console.warn('Fallback commentary due to Gemini error:', err?.message);
    }
  }

  // Fallback commentary
  const fallbacks: Record<string, string[]> = {
    core_eaten: ['¡Núcleo asimilado!', '¡Energía estabilizada!', '¡Flujo de plasma +1!', '¡Secuencia de datos absorbida!'],
    combo_high: ['¡Modo Hipersónico activo!', '¡Multiplicador cuántico desatado!', '¡Sincronización al 100%!'],
    close_call: ['¡Evasión milimétrica!', '¡Colisión evitada por nanosegundos!', '¡Reflejos cibernéticos impecables!'],
    rival_lead: ['¡Has tomado la delantera sobre la IA!', '¡Rival superado en vector!', '¡Dominio de arena confirmado!'],
    death: ['¡Integridad de chasis comprometida!', '¡Desconexión de enlace neural!', '¡Reinicio de protocolo requerido!'],
  };

  const pool = fallbacks[event] || ['¡Vector en curso!', '¡Optimización de ruta activa!'];
  const commentary = pool[Math.floor(Math.random() * pool.length)];
  res.json({ success: true, commentary, source: 'local' });
});

// 4. AI Coach: Post-Match Analysis & Recommendations
app.post('/api/coach/analyze', async (req, res) => {
  const {
    score = 0,
    duration = 0,
    energyCollected = 0,
    collisionType = 'wall',
    mode = 'classic',
    rivalScore = 0,
  } = req.body;

  if (ai && geminiAvailable) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Analiza esta partida de SNAKE AI 2026:
- Modo: ${mode}
- Puntuación obtenida: ${score}
- Duración en segundos: ${duration}s
- Núcleos de energía recolectados: ${energyCollected}
- Causa de colisión: ${collisionType} (wall = muro perimetral, body = auto-colisión con cuerpo, hazard = obstáculo láser, rival = colisión con serpiente rival)
- Puntuación del rival IA: ${rivalScore}

Devuelve un análisis de entrenador cibernético en JSON:
- grade: Calificación ['S+', 'S', 'A', 'B', 'C', 'D']
- summary: Breve resumen de 1 a 2 oraciones en español
- strengths: Lista de 2 puntos fuertes destacados
- weaknesses: Lista de 1 o 2 aspectos a pulir
- tacticalAdvice: Consejo táctico clave para la próxima ronda
- nextDrill: Un reto concreto para mejorar`,
          config: {
            systemInstruction: 'Eres el AI Coach de SNAKE AI 2026. Analizas telemetría de vuelo cibernético con precisión quirúrgica y tono formativo y motivador en español.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                grade: { type: Type.STRING },
                summary: { type: Type.STRING },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                tacticalAdvice: { type: Type.STRING },
                nextDrill: { type: Type.STRING },
              },
              required: ['grade', 'summary', 'strengths', 'weaknesses', 'tacticalAdvice', 'nextDrill'],
            },
          },
        }),
        3000
      );

      const analysis = JSON.parse(response.text?.trim() || '{}');
      return res.json({ success: true, analysis, source: 'gemini' });
    } catch (err: any) {
      if (err?.message?.includes('PERMISSION_DENIED')) {
        geminiAvailable = false;
      }
      console.warn('Fallback coach analysis due to Gemini error:', err?.message);
    }
  }

  // Fallback smart heuristic coach
  let grade = 'B';
  if (score > 2500) grade = 'S+';
  else if (score > 1500) grade = 'S';
  else if (score > 800) grade = 'A';
  else if (score > 300) grade = 'B';
  else grade = 'C';

  const strengths = [];
  const weaknesses = [];

  if (energyCollected > 10) strengths.push('Alta tasa de recolección de núcleos energéticos');
  if (duration > 40) strengths.push('Gran resistencia temporal y control de trayectoria');
  if (strengths.length === 0) strengths.push('Inicio agresivo y determinación táctica');

  if (collisionType === 'body') {
    weaknesses.push('Gestión de espacio con longitud corporal extendida');
  } else if (collisionType === 'wall') {
    weaknesses.push('Anticipación de curvas ante perímetros de alta tensión');
  } else if (collisionType === 'rival') {
    weaknesses.push('Lectura predictiva del pathfinding de la serpiente rival');
  } else {
    weaknesses.push('Evasión de barreras dinámicas y proyectiles');
  }

  res.json({
    success: true,
    analysis: {
      grade,
      summary: `Desempeño calificado con rango ${grade}. Conseguiste ${score} puntos y ${energyCollected} núcleos antes del impacto por ${collisionType}.`,
      strengths,
      weaknesses,
      tacticalAdvice:
        collisionType === 'body'
          ? 'Utiliza espirales externas en los bordes para dejar el centro de la arena despejado cuando superes longitud 15.'
          : 'Mantén el dedo preparado para giros de 90 grados y no abuses del turbo al aproximarte a los bordes.',
      nextDrill: 'Sobrevive al menos 60 segundos manteniendo un ritmo constante sin colisionar con tu propia estela.',
    },
    source: 'local',
  });
});

// 5. AI Personality / Virtual Assistant Chat (AURA-26)
app.post('/api/assistant/chat', async (req, res) => {
  const { message = '', context = {} } = req.body;

  if (ai && geminiAvailable) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Pregunta o comentario del jugador: "${message}".
Contexto del juego: ${JSON.stringify(context)}.
Responde como AURA-26, la IA asistente del juego SNAKE AI 2026. Responde en español de forma carismática, futurista, útil y concisa (máximo 3 oraciones).`,
          config: {
            systemInstruction: 'Eres AURA-26, una IA avanzada y empática en el universo de SNAKE AI 2026. Conoces todas las mecánicas: modos Classic, Survival, Cyber Arena, AI Rival, Infinite y Challenge. Guías al jugador con entusiasmo tecnológico.',
          },
        }),
        3000
      );

      const reply = response.text?.trim();
      return res.json({ success: true, reply, source: 'gemini' });
    } catch (err: any) {
      if (err?.message?.includes('PERMISSION_DENIED')) {
        geminiAvailable = false;
      }
      console.warn('Fallback assistant chat due to Gemini error:', err?.message);
    }
  }

  // Fallback interactive assistant
  const lower = message.toLowerCase();
  let reply = 'Sistemas operativos al 100%. Te recomiendo acumular núcleos seguidos para encadenar multiplicadores de velocidad.';

  if (lower.includes('rival') || lower.includes('cobra') || lower.includes('enemigo')) {
    reply = 'La Cobra Cibernética rival calcula sus rutas usando un algoritmo de navegación A* en tiempo real. ¡Puedes cortarle el paso para obligarla a estrellarse y ganar 500 puntos!';
  } else if (lower.includes('energía') || lower.includes('núcleo') || lower.includes('tipo')) {
    reply = 'Los núcleos azules dan energía cuántica (+100), los dorados activan Sobreaceleración temporal (+250), los verdes otorgan un Nano-Escudo (+180) y los magenta son Mega Cristales (+500).';
  } else if (lower.includes('skin') || lower.includes('personalizar') || lower.includes('color') || lower.includes('chasis')) {
    reply = 'En el panel de Personalización puedes equipar skins como Cyber Neon, Plasma Tóxico o Solar Phoenix, o describir tu propio diseño para que el sintetizador lo cree.';
  } else if (lower.includes('truco') || lower.includes('consejo') || lower.includes('ganar') || lower.includes('survival')) {
    reply = 'El secreto de los maestros de 2026 es el "patrón en serpentina perimetral": rodea los bordes exteriores cuando tu longitud supere los 15 segmentos para mantener el centro despejado.';
  } else if (lower.includes('controles') || lower.includes('jugar') || lower.includes('cómo')) {
    reply = 'Puedes usar las teclas WASD o las Flechas del teclado en PC, o el joystick y botones táctiles en móvil. Con Shift o el botón de Turbo aceleras tus reactores.';
  }

  res.json({ success: true, reply, source: 'local' });
});

// 6. AI Skin Synthesis & Generation
app.post('/api/generate/skin', async (req, res) => {
  const { prompt = 'Serpiente robótica cyberpunk' } = req.body;

  if (ai && geminiAvailable) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Analiza la siguiente descripción de skin para una serpiente 3D en "SNAKE AI 2026":
"${prompt}"

Genera una especificación técnica de materiales y estética en formato JSON:
- name: Nombre cibernético épico para la skin (máx 3 palabras)
- primaryColor: Color hexadecimal primario (ej: "#00f0ff")
- secondaryColor: Color hexadecimal secundario (ej: "#7928ca")
- emissiveColor: Color hexadecimal del resplandor de neón (ej: "#00ffff")
- eyeColor: Color de los ojos/visores (ej: "#ff0077")
- particleColor: Color de las partículas de propulsión (ej: "#00f0ff")
- metalness: Número entre 0.0 y 1.0 (ej: 0.85)
- roughness: Número entre 0.05 y 0.8 (ej: 0.2)
- headShape: uno de ["cyber_dragon", "mecha_vessel", "nano_serpent", "quantum_stealth"]
- lore: Breve trasfondo del chasis (máx 20 palabras en español)`,
          config: {
            systemInstruction: 'Eres el sintetizador estético de chasis de SNAKE AI 2026. Generas paletas cyberpunk vibrantes y armónicas.',
            responseMimeType: 'application/json',
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
                lore: { type: Type.STRING },
              },
              required: ['name', 'primaryColor', 'secondaryColor', 'emissiveColor', 'eyeColor', 'particleColor', 'metalness', 'roughness', 'headShape', 'lore'],
            },
          },
        }),
        3000
      );

      const skinData = JSON.parse(response.text?.trim() || '{}');
      return res.json({ success: true, skin: skinData, source: 'gemini' });
    } catch (err: any) {
      if (err?.message?.includes('PERMISSION_DENIED')) {
        geminiAvailable = false;
      }
      console.warn('Fallback skin synthesis due to Gemini error:', err?.message);
    }
  }

  // Fallback procedural skin synthesis
  const colors = [
    { prim: '#06b6d4', sec: '#3b82f6', em: '#22d3ee', eye: '#f43f5e', name: 'CYBER TITAN 2026' },
    { prim: '#a855f7', sec: '#ec4899', em: '#d946ef', eye: '#10b981', name: 'NEÓN VOID STRIKER' },
    { prim: '#f59e0b', sec: '#ef4444', em: '#fbbf24', eye: '#38bdf8', name: 'SOLAR FALCON PRO' },
    { prim: '#10b981', sec: '#065f46', em: '#34d399', eye: '#e11d48', name: 'BIO-SYNTHETIC HYDRA' },
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
      headShape: 'cyber_dragon',
      lore: `Chasis sintético forjado para asimilación de energía cuántica a partir de tu comando: "${prompt}".`,
    },
    source: 'local',
  });
});

// 7. Video generation routing endpoint
app.post('/api/generate/video', async (req, res) => {
  res.json({
    success: true,
    available: false,
    message: 'Generación de vídeo mediante Gemini Omni Flash lista bajo demanda. Modo de renderizado cinemático 3D en tiempo real activo como alternativa predeterminada.',
    aspectRatio: '16:9',
  });
});

// Production / Dev Vite static integration
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  // In dev mode, attach Vite middleware
  import('vite').then(({ createServer }) => {
    createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    }).then((vite) => {
      app.use(vite.middlewares);
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 SNAKE AI 2026 Server running on http://localhost:${PORT}`);
      });
    });
  });
}

if (process.env.NODE_ENV === 'production') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SNAKE AI 2026 Production Server running on http://localhost:${PORT}`);
  });
}
