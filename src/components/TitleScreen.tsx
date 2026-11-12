import React from 'react';
import { GameMode, SnakeSkin } from '../types/game';
import { sound } from '../game/audio/SoundSynthesizer';
import { Play, Shield, Cpu, Flame, Infinity as InfinityIcon, Trophy, Sparkles, Sliders, MessageSquare, Target } from 'lucide-react';

interface TitleScreenProps {
  onStartGame: (mode: GameMode) => void;
  selectedMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  onOpenCustomizer: () => void;
  onOpenMissions: () => void;
  onOpenAssistant: () => void;
  onOpenSettings: () => void;
  currentSkin: SnakeSkin;
  highScore: number;
  credits: number;
  hasGeminiKey: boolean;
}

const MODES: { id: GameMode; name: string; tag: string; desc: string; icon: any; color: string }[] = [
  {
    id: 'classic',
    name: 'CLASSIC 2026',
    tag: 'ORIGINAL EVOLVED',
    desc: 'La experiencia de cuadrícula pura con aceleración y combos continuos.',
    icon: Play,
    color: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'survival',
    name: 'SURVIVAL PURGE',
    tag: 'ALERTA DE OBSTÁCULOS',
    desc: 'Barreras de plasma dinámicas que saturan la arena progresivamente.',
    icon: Shield,
    color: 'from-purple-500 to-indigo-600',
  },
  {
    id: 'cyber_arena',
    name: 'CYBER ARENA',
    tag: 'PORTALES Y AGUJAS',
    desc: 'Arena tridimensional con agujas láser móviles y portales de teletransporte.',
    icon: Flame,
    color: 'from-amber-500 to-rose-600',
  },
  {
    id: 'ai_rival',
    name: 'AI RIVAL: COBRA-9',
    tag: 'PATHFINDING A* EN VIVO',
    desc: 'Compite contra una serpiente autónoma con IA por la energía del sector.',
    icon: Cpu,
    color: 'from-rose-500 to-red-700',
  },
  {
    id: 'infinite',
    name: 'INFINITE DRIFT',
    tag: 'SIN LÍMITE TEMPORAL',
    desc: 'Modo sin fin con cambios atmosféricos y dificultad hiperbólica.',
    icon: InfinityIcon,
    color: 'from-emerald-500 to-teal-700',
  },
  {
    id: 'challenge',
    name: 'CHALLENGE PROTOCOL',
    tag: 'DISEÑO GAME MASTER',
    desc: 'Desafíos tácticos con objetivos únicos generados por Google Gemini.',
    icon: Target,
    color: 'from-fuchsia-500 to-purple-800',
  },
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  selectedMode,
  onSelectMode,
  onOpenCustomizer,
  onOpenMissions,
  onOpenAssistant,
  onOpenSettings,
  currentSkin,
  highScore,
  credits,
  hasGeminiKey,
}) => {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 md:p-8 pointer-events-none select-none">
      {/* Top Header Cluster */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded border border-cyan-500/40 bg-cyan-950/40 text-cyan-400 text-xs font-mono tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>MOTOR 3D R160+</span>
          </div>

          <div className={`px-3 py-1 rounded border text-xs font-mono tracking-wider flex items-center gap-2 ${
            hasGeminiKey
              ? 'border-purple-500/40 bg-purple-950/40 text-purple-300'
              : 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400'
          }`}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>{hasGeminiKey ? 'GEMINI 3.8 FLASH: CONECTADO' : 'IA LOCAL: ACTIVA'}</span>
          </div>
        </div>

        {/* Credits & HighScore */}
        <div className="flex items-center gap-4 text-right font-tech">
          <div className="bg-slate-900/80 border border-slate-700/60 px-3.5 py-1.5 rounded-lg flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest leading-none">Récord</div>
              <div className="text-amber-400 font-bold text-sm tracking-wider leading-none mt-0.5">{highScore.toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/60 px-3.5 py-1.5 rounded-lg flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400"></div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest leading-none">Créditos</div>
              <div className="text-cyan-300 font-bold text-sm tracking-wider leading-none mt-0.5">{credits} CR</div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Centerpiece & Title Lockup */}
      <div className="my-auto flex flex-col items-center text-center max-w-4xl mx-auto">
        {/* Bespoke Cyberpunk Inline SVG Title Lockup */}
        <div className="relative mb-2">
          <svg viewBox="0 0 680 90" className="w-[85vw] max-w-[620px] h-auto drop-shadow-[0_0_25px_rgba(6,182,212,0.6)]">
            <defs>
              <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
            <text
              x="50%"
              y="60"
              textAnchor="middle"
              className="font-cyber font-black text-5xl md:text-6xl tracking-[0.2em]"
              fill="url(#neonGradient)"
              stroke="#082f49"
              strokeWidth="2"
            >
              SNAKE AI
            </text>
            <text
              x="50%"
              y="85"
              textAnchor="middle"
              className="font-tech text-xs md:text-sm tracking-[0.55em]"
              fill="#94a3b8"
            >
              — 2026 : THE NEXT EVOLUTION —
            </text>
          </svg>
        </div>

        <p className="text-sm md:text-base text-slate-300 max-w-lg mb-6 leading-relaxed font-sans">
          Reinterpretación arcade 3D de alta fidelidad impulsada por físicas en tiempo real,
          pathfinding autónomo y arquitectura cognitiva de Google Gemini.
        </p>

        {/* Primary Start CTA Button */}
        <button
          onClick={() => {
            sound.playUiClick();
            onStartGame(selectedMode);
          }}
          className="pointer-events-auto group relative px-10 py-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 rounded-xl font-cyber text-lg font-bold tracking-widest text-white shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:shadow-[0_0_50px_rgba(6,182,212,0.8)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-3 border border-cyan-300/40"
        >
          <Play className="w-5 h-5 fill-white" />
          <span>INICIAR MISIÓN</span>
          <span className="hidden sm:inline-block ml-2 text-xs font-tech px-2 py-0.5 rounded bg-black/40 text-cyan-200 border border-cyan-400/30">
            ENTER
          </span>
        </button>

        {/* Flat control-hint line */}
        <div className="mt-4 text-xs font-tech text-slate-400 tracking-wider">
          WASD / Flechas <span className="text-slate-600">·</span> Shift Turbo <span className="text-slate-600">·</span> Espacio Pausa
        </div>
      </div>

      {/* Bottom Mode Carousel & Navigation Dock */}
      <div className="flex flex-col gap-4 w-full max-w-5xl mx-auto pointer-events-auto">
        {/* Mode Selector Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {MODES.map((m) => {
            const isSelected = selectedMode === m.id;
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => {
                  sound.playUiClick();
                  onSelectMode(m.id);
                }}
                className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/60 shadow-[0_0_20px_rgba(6,182,212,0.3)] scale-[1.02]'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-1.5 rounded-lg bg-gradient-to-br ${m.color} text-white`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></div>
                  )}
                </div>
                <div>
                  <div className="text-[9px] font-mono text-cyan-400/90 tracking-wider uppercase leading-none mb-1">
                    {m.tag}
                  </div>
                  <div className="font-cyber text-xs font-bold text-white tracking-wide leading-tight">
                    {m.name}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Collapsible Action Dock */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2 border-t border-slate-800/80">
          <button
            onClick={() => {
              sound.playUiClick();
              onOpenCustomizer();
            }}
            className="px-4 py-2 rounded-lg bg-slate-900/90 border border-slate-700/70 hover:border-purple-500/60 text-slate-200 hover:text-purple-300 font-tech text-xs tracking-wider flex items-center gap-2 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Skins & IA Genesis ({currentSkin.name})</span>
          </button>

          <button
            onClick={() => {
              sound.playUiClick();
              onOpenMissions();
            }}
            className="px-4 py-2 rounded-lg bg-slate-900/90 border border-slate-700/70 hover:border-amber-500/60 text-slate-200 hover:text-amber-300 font-tech text-xs tracking-wider flex items-center gap-2 transition-all cursor-pointer"
          >
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span>Misiones Game Master</span>
          </button>

          <button
            onClick={() => {
              sound.playUiClick();
              onOpenAssistant();
            }}
            className="px-4 py-2 rounded-lg bg-slate-900/90 border border-slate-700/70 hover:border-cyan-500/60 text-slate-200 hover:text-cyan-300 font-tech text-xs tracking-wider flex items-center gap-2 transition-all cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>Asistente AURA-26</span>
          </button>

          <button
            onClick={() => {
              sound.playUiClick();
              onOpenSettings();
            }}
            className="px-3.5 py-2 rounded-lg bg-slate-900/90 border border-slate-700/70 hover:border-slate-500 text-slate-300 hover:text-white font-tech text-xs tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Ajustes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
