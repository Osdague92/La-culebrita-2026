import React, { useState } from 'react';
import { GameSettings } from '../types/game';
import { sound } from '../game/audio/SoundSynthesizer';
import { X, Volume2, VolumeX, Sliders, Cpu, Radio, ShieldCheck } from 'lucide-react';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onClose: () => void;
  hasGeminiKey: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  hasGeminiKey,
}) => {
  const [sfx, setSfx] = useState(settings.sfxVolume);
  const [music, setMusic] = useState(settings.musicVolume);

  const handleSfxChange = (val: number) => {
    setSfx(val);
    sound.setSfxVolume(val);
    onUpdateSettings({ sfxVolume: val });
  };

  const handleMusicChange = (val: number) => {
    setMusic(val);
    sound.setMusicVolume(val);
    onUpdateSettings({ musicVolume: val });
  };

  return (
    <div className="absolute inset-0 z-30 bg-black/85 flex items-center justify-center p-4 overflow-y-auto select-none">
      <div className="bg-slate-950 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-[0_0_40px_rgba(15,23,42,0.6)] my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-cyber font-black tracking-widest text-slate-200">
                CONFIGURACIÓN DEL SISTEMA
              </h2>
              <p className="text-[11px] text-slate-400 font-tech">
                Ajustes de sonido, controles y arquitectura de IA
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

        <div className="overflow-y-auto py-4 space-y-5 text-xs font-sans flex-1 pr-1">
          {/* Audio Controls */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-cyber font-bold text-slate-200">EFECTOS DE SONIDO (SFX)</span>
              <span className="font-tech text-cyan-400">{Math.round(sfx * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sfx}
              onChange={(e) => handleSfxChange(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />

            <div className="flex items-center justify-between pt-2">
              <span className="font-cyber font-bold text-slate-200">MÚSICA SYNTHWAVE (BGM)</span>
              <span className="font-tech text-purple-400">{Math.round(music * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={music}
              onChange={(e) => handleMusicChange(parseFloat(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
          </div>

          {/* AI Architecture Tiers */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="font-cyber font-bold text-cyan-300">ARQUITECTURA DE IA DE 3 NIVELES</span>
            </div>

            <div className="space-y-2 font-tech text-[11px]">
              <div className="p-2 rounded-lg bg-slate-950/80 border border-emerald-500/30 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-emerald-400">NIVEL 1 — CORE 3D GRATUITO (ACTIVO)</div>
                  <div className="text-slate-400">
                    Motor Three.js 60fps, físicas de colisión, rival autónomo con pathfinding A*, audio procedural Web Audio API. 100% jugable offline.
                  </div>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/80 border border-purple-500/30 flex items-start gap-2">
                <Radio className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-purple-400">
                    NIVEL 2 — GOOGLE GEMINI 3.8 FLASH ({hasGeminiKey ? 'CONECTADO' : 'SUBRUTINA LOCAL ACTIVA'})
                  </div>
                  <div className="text-slate-400">
                    AI Game Master dinámico, análisis post-partida de AI Coach, sintetizador de skins y personalidad conversacional AURA-26.
                  </div>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-700 flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-500 mt-1.5 flex-shrink-0"></div>
                <div>
                  <div className="font-bold text-slate-300">NIVEL 3 — MULTIMEDIA BAJO DEMANDA</div>
                  <div className="text-slate-400">
                    Soporte para generación de vídeo con Gemini Omni Flash e imágenes con Nano Banana bajo demanda sin interferir en la fluidez del juego.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => {
              sound.playUiClick();
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-tech text-xs tracking-wider transition-colors cursor-pointer"
          >
            GUARDAR Y CERRAR
          </button>
        </div>
      </div>
    </div>
  );
};
