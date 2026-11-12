export type GameMode =
  | 'classic'
  | 'survival'
  | 'cyber_arena'
  | 'ai_rival'
  | 'infinite'
  | 'challenge';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface GridCoord {
  x: number;
  z: number;
}

export interface CoreItem {
  id: string;
  x: number;
  z: number;
  type: 'quantum' | 'overclock' | 'time_dilator' | 'nano_shield' | 'mega_crystal';
  value: number;
  color: string;
  duration?: number;
}

export interface HazardItem {
  id: string;
  x: number;
  z: number;
  type: 'laser_barrier' | 'plasma_block' | 'moving_spire' | 'portal';
  targetPortal?: GridCoord;
  dx?: number;
  dz?: number;
}

export interface SnakeSkin {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  emissiveColor: string;
  eyeColor: string;
  particleColor: string;
  metalness: number;
  roughness: number;
  headShape: 'cyber_dragon' | 'mecha_vessel' | 'nano_serpent' | 'quantum_stealth';
  lore: string;
  unlocked: boolean;
}

export interface GameMission {
  title: string;
  description: string;
  objectiveType: 'collect_energy' | 'survive_time' | 'reach_score' | 'beat_rival' | 'reach_multiplier';
  targetValue: number;
  currentProgress: number;
  rewardCredits: number;
  completed: boolean;
  claimed: boolean;
  loreBrief: string;
}

export interface CoachAnalysis {
  grade: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  tacticalAdvice: string;
  nextDrill: string;
}

export interface GameStats {
  highScore: number;
  totalGames: number;
  totalEnergyCollected: number;
  longestSurvivalTime: number;
  credits: number;
  victoriesOverRival: number;
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  cameraFov: number;
  bloomEffects: boolean;
  controlType: 'dpad' | 'swipe' | 'buttons';
}
