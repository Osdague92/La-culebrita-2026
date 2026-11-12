import React, { useState } from 'react';
import { GameMission } from '../types/game';
import { sound } from '../game/audio/SoundSynthesizer';
import { gemini } from '../services/geminiService';
import { X, Target, CheckCircle2, Sparkles, RefreshCw, Award, Radio } from 'lucide-react';

interface MissionsModalProps {
  missions: GameMission[];
  onClaimReward: (index: number) => void;
  onAddMission: (mission: GameMission) => void;
  onClose: () => void;
  currentScore: number;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({
  missions,
  onClaimReward,
  onAddMission,
  onClose,
  currentScore,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [genSource, setGenSource] = useState<string | null>(null);

  const handleRequestMission = async () => {
    sound.playUiClick();
    setIsGenerating(true);

    try {
      const { mission, source } = await gemini.getMission('challenge', currentScore, 2);
      onAddMission(mission);
      setGenSource(source);
      sound.playPowerup();
    } catch {
      // Handled in geminiService
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="absolute inset-0 z-30 bg-black/85 flex items-center justify-center p-4 overflow-y-auto select-none">
      <div className="bg-slate-950 border border-amber-500/40 rounded-2xl max-w-xl w-full p-6 md:p-8 shadow-[0_0_50px_rgba(245,158,11,0.25)] my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-300">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-cyber font-black tracking-widest text-amber-300">
                AI GAME MASTER — MISIONES
              </h2>
              <p className="text-xs text-slate-400 font-tech">
                Objetivos tácticos dinámicos generados por la arquitectura de combate
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playUiClick();
              onClose();
            }}
            className="p-2 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto pr-1 flex-1 py-4 space-y-4">
          {/* Mission Generation Banner */}
          <div className="bg-gradient-to-r from-amber-950/50 via-slate-900 to-purple-950/40 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <div className="text-xs font-cyber font-bold text-amber-300 flex items-center gap-1.5 mb-0.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>¿BUSCAS UN RETO SUPERIOR?</span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans">
                Solicita al Game Master un nuevo protocolo adaptado a tu desempeño.
              </p>
            </div>

            <button
              onClick={handleRequestMission}
              disabled={isGenerating}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-cyber text-xs font-bold tracking-wider disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-[0_0_15px_rgba(245,158,11,0.4)]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'GENERANDO...' : 'NUEVO PROTOCOLO'}</span>
            </button>
          </div>

          {genSource && (
            <div className="text-[10px] font-mono text-amber-300/80">
              Protocolo generado vía: {genSource === 'gemini' ? 'Google Gemini 3.8 Flash' : 'Subrutina Local'}
            </div>
          )}

          {/* Missions List */}
          <div className="space-y-3">
            {missions.map((mission, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border transition-all ${
                  mission.claimed
                    ? 'border-slate-800 bg-slate-950/40 opacity-60'
                    : mission.completed
                    ? 'border-emerald-500/50 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                    : 'border-slate-800 bg-slate-900/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-[9px] font-mono text-amber-400 tracking-widest uppercase">
                      PROTOCOLO #{idx + 1}
                    </span>
                    <h3 className="font-cyber text-sm font-bold text-white tracking-wide">
                      {mission.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 font-tech text-xs font-bold text-cyan-300 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-700">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>+{mission.rewardCredits} CR</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 font-sans mb-3">
                  {mission.description}
                </p>

                {mission.loreBrief && (
                  <div className="text-[10px] font-tech text-slate-400 italic mb-3 flex items-center gap-1.5">
                    <Radio className="w-3 h-3 text-purple-400" />
                    <span>"{mission.loreBrief}"</span>
                  </div>
                )}

                {/* Status / Claim Button */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] font-mono text-slate-400">
                    Objetivo: {mission.targetValue} ({mission.objectiveType.replace('_', ' ')})
                  </span>

                  {mission.claimed ? (
                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-slate-500" />
                      RECLAMADO
                    </span>
                  ) : mission.completed ? (
                    <button
                      onClick={() => {
                        sound.playVictory();
                        onClaimReward(idx);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-cyber text-[10px] font-bold tracking-wider transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                    >
                      RECLAMAR RECOMPENSA
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono text-amber-400/90 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                      EN PROGRESO
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => {
              sound.playUiClick();
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-tech text-xs tracking-wider transition-colors cursor-pointer"
          >
            VOLVER AL MENÚ
          </button>
        </div>
      </div>
    </div>
  );
};
