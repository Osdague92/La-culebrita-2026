import React from 'react';
import { GameMission, GameMode } from '../types/game';
import { sound } from '../game/audio/SoundSynthesizer';
import { Pause, Play, Trophy, Zap, Shield, Sparkles, Target, Volume2, VolumeX } from 'lucide-react';

interface GameHUDProps {
  score: number;
  highScore: number;
  combo: number;
  multiplier: number;
  length: number;
  speed: number;
  mode: GameMode;
  isPaused: boolean;
  onTogglePause: () => void;
  onQuitToMenu: () => void;
  rivalScore: number;
  rivalLength: number;
  commentaryText: string;
  activeMission: GameMission | null;
  onMuteToggle: () => boolean;
  isMuted: boolean;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  score,
  highScore,
  combo,
  length,
  speed,
  mode,
  isPaused,
  onTogglePause,
  onQuitToMenu,
  rivalScore,
  rivalLength,
  commentaryText,
  activeMission,
  onMuteToggle,
  isMuted,
}) => {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none select-none flex flex-col justify-between p-4 md:p-6 font-tech">
      {/* Top Bar Perimeter Cluster */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Score, Combo & Telemetry */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          {/* Main Score Readout */}
          <div className="bg-slate-950/85 border border-cyan-500/40 rounded-xl px-4 py-2.5 shadow-[0_0_20px_rgba(6,182,212,0.25)] flex items-baseline gap-3">
            <span className="text-xs text-cyan-400 font-mono tracking-widest uppercase">SCORE</span>
            <span className="text-3xl md:text-4xl font-cyber font-black tracking-wider text-cyan-300 tabular-nums">
              {score.toLocaleString()}
            </span>

            {/* Dynamic Combo Multiplier Pill */}
            {combo > 1 && (
              <div className="px-2 py-0.5 rounded bg-gradient-to-r from-amber-500 to-rose-500 text-white font-cyber text-xs font-bold animate-bounce shadow-[0_0_12px_rgba(245,158,11,0.6)]">
                x{combo} COMBO
              </div>
            )}
          </div>

          {/* Telemetry Row */}
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <div className="bg-slate-900/80 border border-slate-700/60 px-2.5 py-1 rounded-md flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400">LONGITUD</span>
              <span className="font-bold text-cyan-400 tabular-nums">{length} SEG</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-700/60 px-2.5 py-1 rounded-md flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] text-slate-400">VELOCIDAD</span>
              <span className="font-bold text-amber-400 tabular-nums">{speed.toFixed(1)}x</span>
            </div>
          </div>
        </div>

        {/* Top-Center: AI Rival Matchup Bar (in AI Rival mode) */}
        {mode === 'ai_rival' && (
          <div className="hidden sm:flex items-center gap-4 bg-slate-950/90 border border-rose-500/40 px-5 py-2 rounded-xl shadow-[0_0_20px_rgba(244,63,94,0.3)] pointer-events-auto">
            <div className="text-right">
              <div className="text-[10px] text-cyan-400 font-bold uppercase">PILOTO (TÚ)</div>
              <div className="text-sm font-cyber font-bold text-cyan-300 tabular-nums">{score} PTS</div>
            </div>

            <div className="text-xs font-cyber text-rose-500 font-bold tracking-widest px-2 py-1 rounded bg-rose-950/40 border border-rose-600/30">
              VS
            </div>

            <div className="text-left">
              <div className="text-[10px] text-rose-400 font-bold uppercase">COBRA-9 IA</div>
              <div className="text-sm font-cyber font-bold text-rose-400 tabular-nums">{rivalScore} PTS</div>
            </div>
          </div>
        )}

        {/* Top-Right: HighScore, Mode Badge & Actions */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* High Score Badge */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 border border-slate-700/60 px-3 py-1.5 rounded-lg text-xs">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">RÉCORD:</span>
            <span className="font-bold text-amber-300 tabular-nums">{highScore.toLocaleString()}</span>
          </div>

          {/* Mode Pill */}
          <div className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 uppercase tracking-widest">
            {mode.replace('_', ' ')}
          </div>

          {/* Mute Button */}
          <button
            onClick={() => {
              onMuteToggle();
              sound.playUiClick();
            }}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/60 hover:border-slate-500 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Activar Sonido' : 'Silenciar'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Pause Button */}
          <button
            onClick={() => {
              sound.playUiClick();
              onTogglePause();
            }}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/60 hover:border-cyan-400 text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer"
            title="Pausar Partida"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Bottom Perimeter: AI Transmission & Active Mission */}
      <div className="flex items-end justify-between w-full">
        {/* Bottom-Left: Live AI Companion Avatar & Commentary */}
        <div className="max-w-md bg-slate-950/85 border border-purple-500/40 rounded-xl p-3 shadow-[0_0_20px_rgba(168,85,247,0.2)] flex items-center gap-3 pointer-events-auto">
          {/* Holographic AI Avatar Eye */}
          <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-cyan-400 p-0.5 flex-shrink-0 shadow-[0_0_12px_rgba(168,85,247,0.6)]">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-300" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-cyber font-bold text-purple-400 tracking-wider">AURA-26</span>
              <span className="text-[9px] font-mono text-slate-400 uppercase">ENLACE NEURAL</span>
            </div>
            <p className="text-xs text-slate-200 truncate font-sans">
              {commentaryText || 'Trayectoria optimizada. Acumula núcleos de plasma.'}
            </p>
          </div>
        </div>

        {/* Bottom-Right: Active Mission Progress */}
        {activeMission && (
          <div className="hidden sm:flex flex-col bg-slate-950/85 border border-amber-500/40 rounded-xl p-3 shadow-[0_0_20px_rgba(245,158,11,0.2)] max-w-xs pointer-events-auto">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold mb-1">
              <Target className="w-3.5 h-3.5" />
              <span className="uppercase text-[10px] tracking-wider">{activeMission.title}</span>
            </div>
            <div className="text-[11px] text-slate-300 font-sans line-clamp-1 mb-1.5">
              {activeMission.description}
            </div>
            {/* Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300"
                style={{
                  width: `${Math.min(100, (score / Math.max(1, activeMission.targetValue)) * 100)}%`,
                }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Pause Modal Overlay */}
      {isPaused && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto">
          <div className="bg-slate-900 border border-cyan-500/60 rounded-2xl p-8 max-w-sm w-full text-center shadow-[0_0_40px_rgba(6,182,212,0.4)]">
            <h2 className="text-2xl font-cyber font-black tracking-widest text-cyan-300 mb-2">
              SISTEMA PAUSADO
            </h2>
            <p className="text-xs text-slate-400 mb-6 font-sans">
              La simulación espacial está detenida. Puedes reanudar o regresar al menú.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  sound.playUiClick();
                  onTogglePause();
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-cyber text-sm font-bold tracking-wider text-white hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                REANUDAR
              </button>

              <button
                onClick={() => {
                  sound.playUiClick();
                  onQuitToMenu();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-rose-500/60 text-slate-300 hover:text-rose-400 font-tech text-xs tracking-wider transition-all cursor-pointer"
              >
                ABANDONAR AL MENÚ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
