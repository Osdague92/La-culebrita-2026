import React from 'react';
import { CoachAnalysis } from '../types/game';
import { sound } from '../game/audio/SoundSynthesizer';
import { RotateCcw, Home, Sparkles, Trophy, Clock, Zap, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface ResultsModalProps {
  score: number;
  duration: number;
  coresCollected: number;
  cause: 'wall' | 'body' | 'hazard' | 'rival';
  rivalScore: number;
  highScore: number;
  isNewRecord: boolean;
  coachAnalysis: CoachAnalysis | null;
  coachLoading: boolean;
  coachSource: string;
  onRematch: () => void;
  onMenu: () => void;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({
  score,
  duration,
  coresCollected,
  cause,
  rivalScore,
  highScore,
  isNewRecord,
  coachAnalysis,
  coachLoading,
  coachSource,
  onRematch,
  onMenu,
}) => {
  const causeNames: Record<string, string> = {
    wall: 'Impacto con Muro Perimetral',
    body: 'Autocolisión con Estela Propia',
    hazard: 'Colisión con Barrera Láser',
    rival: 'Impacto contra Cobra-9 IA',
  };

  const getGradeColor = (grade: string = 'B') => {
    switch (grade) {
      case 'S+':
      case 'S':
        return 'from-amber-400 to-rose-500 text-amber-200 border-amber-400/60 shadow-amber-500/40';
      case 'A':
        return 'from-purple-500 to-cyan-500 text-cyan-200 border-cyan-400/60 shadow-cyan-500/40';
      case 'B':
        return 'from-blue-600 to-indigo-600 text-blue-200 border-blue-400/60 shadow-blue-500/40';
      default:
        return 'from-slate-700 to-slate-800 text-slate-300 border-slate-600 shadow-slate-700/40';
    }
  };

  return (
    <div className="absolute inset-0 z-30 bg-black/85 flex items-center justify-center p-4 overflow-y-auto select-none">
      <div className="bg-slate-950 border border-cyan-500/40 rounded-2xl max-w-xl w-full p-6 md:p-8 shadow-[0_0_50px_rgba(6,182,212,0.3)] my-auto">
        {/* Header Title & Record Notification */}
        <div className="text-center mb-6">
          {isNewRecord && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-cyber text-xs font-bold tracking-widest mb-2 shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse">
              <Trophy className="w-3.5 h-3.5" />
              <span>¡NUEVO RÉCORD HISTÓRICO!</span>
            </div>
          )}

          <h2 className="text-3xl md:text-4xl font-cyber font-black tracking-widest text-cyan-300">
            FIN DE TRANSMISIÓN
          </h2>
          <p className="text-xs font-mono text-rose-400 mt-1 uppercase tracking-wider">
            Causa: {causeNames[cause] || 'Fallo de integridad'}
          </p>
        </div>

        {/* Telemetry Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6 font-tech">
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl text-center">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Puntuación</div>
            <div className="text-2xl font-cyber font-black text-cyan-300 tabular-nums">
              {score.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl text-center">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Tiempo</span>
            </div>
            <div className="text-2xl font-cyber font-black text-amber-300 tabular-nums">
              {duration}s
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl text-center">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
              <Zap className="w-3 h-3" />
              <span>Núcleos</span>
            </div>
            <div className="text-2xl font-cyber font-black text-purple-300 tabular-nums">
              {coresCollected}
            </div>
          </div>
        </div>

        {/* AI Coach Report Card */}
        <div className="bg-slate-900/80 border border-purple-500/40 rounded-xl p-4 md:p-5 mb-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="font-cyber text-xs font-bold text-purple-300 tracking-wider">
                INFORME DEL AI COACH
              </span>
            </div>

            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 text-purple-300 uppercase">
              {coachSource === 'gemini' ? 'GOOGLE GEMINI 3.8 FLASH' : 'TELEMETRÍA LOCAL'}
            </span>
          </div>

          {coachLoading ? (
            <div className="py-8 text-center text-xs text-purple-300 font-mono flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Analizando vectores de trayectoria y rendimiento neural...</span>
            </div>
          ) : coachAnalysis ? (
            <div className="space-y-3 font-sans">
              {/* Grade & Summary */}
              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getGradeColor(
                    coachAnalysis.grade
                  )} border-2 flex items-center justify-center font-cyber font-black text-2xl shadow-lg flex-shrink-0`}
                >
                  {coachAnalysis.grade}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-200 leading-tight">
                    {coachAnalysis.summary}
                  </div>
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 font-tech">
                <div className="bg-slate-950/60 border border-emerald-500/30 p-2.5 rounded-lg">
                  <div className="text-emerald-400 font-bold flex items-center gap-1.5 mb-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Puntos Fuertes</span>
                  </div>
                  <ul className="text-slate-300 list-disc list-inside space-y-0.5 text-[11px]">
                    {coachAnalysis.strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-950/60 border border-rose-500/30 p-2.5 rounded-lg">
                  <div className="text-rose-400 font-bold flex items-center gap-1.5 mb-1 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Aspectos a Pulir</span>
                  </div>
                  <ul className="text-slate-300 list-disc list-inside space-y-0.5 text-[11px]">
                    {coachAnalysis.weaknesses.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Tactical Advice & Next Drill */}
              <div className="bg-purple-950/30 border border-purple-500/30 p-3 rounded-lg text-xs">
                <div className="text-purple-300 font-bold mb-1 flex items-center gap-1">
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Consejo Táctico:</span>
                </div>
                <p className="text-slate-200 leading-relaxed font-sans text-xs">
                  {coachAnalysis.tacticalAdvice}
                </p>

                {coachAnalysis.nextDrill && (
                  <div className="mt-2 pt-2 border-t border-purple-500/20 text-[11px] text-purple-200 font-tech">
                    <span className="text-purple-400 font-bold">Reto recomendado:</span> {coachAnalysis.nextDrill}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              sound.playUiClick();
              onRematch();
            }}
            className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-cyber text-sm font-bold tracking-widest text-white shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 border border-cyan-300/40"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REVANCHA</span>
          </button>

          <button
            onClick={() => {
              sound.playUiClick();
              onMenu();
            }}
            className="py-3.5 px-6 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-tech text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>MENÚ PRINCIPAL</span>
          </button>
        </div>
      </div>
    </div>
  );
};
