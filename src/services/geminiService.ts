import { CoachAnalysis, GameMission, SnakeSkin } from '../types/game';

export interface ApiStatus {
  status: string;
  hasKey: boolean;
  models: {
    text: string;
    image: string;
    video: string;
    music: string;
  };
  capabilities: {
    level1_core: boolean;
    level2_gemini: boolean;
    level3_multimedia: boolean;
  };
}

class GeminiService {
  public async getStatus(): Promise<ApiStatus> {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error('Status request failed');
      return await res.json();
    } catch {
      return {
        status: 'offline',
        hasKey: false,
        models: {
          text: 'gemini-3.8-flash',
          image: 'gemini-nano-banana-2.1',
          video: 'gemini-omni-1.2-flash',
          music: 'lyria-3-clip-preview',
        },
        capabilities: {
          level1_core: true,
          level2_gemini: false,
          level3_multimedia: false,
        },
      };
    }
  }

  public async getMission(mode: string, currentScore: number, playerLevel: number): Promise<{ mission: GameMission; source: string }> {
    try {
      const res = await fetch('/api/game-master/mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, currentScore, playerLevel }),
      });
      const data = await res.json();
      return {
        mission: {
          ...data.mission,
          currentProgress: 0,
          completed: false,
          claimed: false,
        },
        source: data.source || 'local',
      };
    } catch {
      return {
        mission: {
          title: 'SOBRECARGA CUÁNTICA',
          description: 'Recolecta 15 núcleos de energía antes de saturar el condensador.',
          objectiveType: 'collect_energy',
          targetValue: 15,
          currentProgress: 0,
          rewardCredits: 150,
          completed: false,
          claimed: false,
          loreBrief: 'Nodo 07 en estado crítico. Requiere combustible inmediato.',
        },
        source: 'local',
      };
    }
  }

  public async getCommentary(event: string, score: number, combo: number, rivalAhead: boolean = false): Promise<string> {
    try {
      const res = await fetch('/api/game-master/commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, score, combo, rivalAhead }),
      });
      const data = await res.json();
      return data.commentary || '¡Vector confirmado!';
    } catch {
      return '¡Vector en curso!';
    }
  }

  public async analyzeMatch(params: {
    score: number;
    duration: number;
    energyCollected: number;
    collisionType: string;
    mode: string;
    rivalScore: number;
  }): Promise<{ analysis: CoachAnalysis; source: string }> {
    try {
      const res = await fetch('/api/coach/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      return {
        analysis: data.analysis,
        source: data.source || 'local',
      };
    } catch {
      return {
        analysis: {
          grade: params.score > 1000 ? 'A' : 'B',
          summary: `Has acumulado ${params.score} puntos en ${params.duration}s de navegación.`,
          strengths: ['Buena precisión en el trazado inicial', 'Captura veloz de núcleos cuánticos'],
          weaknesses: ['Anticipación ante giros cerrados a alta velocidad'],
          tacticalAdvice: 'Traza patrones en S perimetrales para evitar encerrarte con tu propio chasis.',
          nextDrill: 'Supera 50 segundos de juego continuo manteniendo un combo x2.',
        },
        source: 'local',
      };
    }
  }

  public async chatWithAssistant(message: string, context: any = {}): Promise<string> {
    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context }),
      });
      const data = await res.json();
      return data.reply || 'Canal de comunicación establecido. ¿En qué puedo asistirte, piloto?';
    } catch {
      return 'Conexión neural local activa. Utiliza WASD o las Flechas para maniobrar tu nave.';
    }
  }

  public async generateSkin(prompt: string): Promise<{ skin: SnakeSkin; source: string }> {
    try {
      const res = await fetch('/api/generate/skin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      const s = data.skin;
      return {
        skin: {
          id: `custom_${Date.now()}`,
          name: s.name || 'AI GENESIS',
          primaryColor: s.primaryColor || '#06b6d4',
          secondaryColor: s.secondaryColor || '#3b82f6',
          emissiveColor: s.emissiveColor || '#22d3ee',
          eyeColor: s.eyeColor || '#f43f5e',
          particleColor: s.particleColor || '#06b6d4',
          metalness: Number(s.metalness) || 0.85,
          roughness: Number(s.roughness) || 0.2,
          headShape: s.headShape || 'cyber_dragon',
          lore: s.lore || 'Skin sintetizada por IA a partir de comando neural.',
          unlocked: true,
        },
        source: data.source || 'local',
      };
    } catch {
      return {
        skin: {
          id: `custom_${Date.now()}`,
          name: 'NANO DRAGON 2026',
          primaryColor: '#06b6d4',
          secondaryColor: '#a855f7',
          emissiveColor: '#22d3ee',
          eyeColor: '#f43f5e',
          particleColor: '#06b6d4',
          metalness: 0.85,
          roughness: 0.2,
          headShape: 'cyber_dragon',
          lore: 'Chasis generado mediante síntesis local.',
          unlocked: true,
        },
        source: 'local',
      };
    }
  }
}

export const gemini = new GeminiService();
