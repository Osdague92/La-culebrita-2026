import React, { useState } from 'react';
import { SnakeSkin } from '../types/game';
import { sound } from '../game/audio/SoundSynthesizer';
import { gemini } from '../services/geminiService';
import { X, Sparkles, Check, Wand2, Palette, Shield } from 'lucide-react';

interface CustomizerModalProps {
  currentSkin: SnakeSkin;
  onSelectSkin: (skin: SnakeSkin) => void;
  onClose: () => void;
  customSkins: SnakeSkin[];
  onAddCustomSkin: (skin: SnakeSkin) => void;
}

export const PRESET_SKINS: SnakeSkin[] = [
  {
    id: 'cyber_neon',
    name: 'CYBER NEON 2026',
    primaryColor: '#06b6d4',
    secondaryColor: '#3b82f6',
    emissiveColor: '#22d3ee',
    eyeColor: '#f43f5e',
    particleColor: '#06b6d4',
    metalness: 0.85,
    roughness: 0.2,
    headShape: 'cyber_dragon',
    lore: 'Chasis insignia de aleación superconductora y propulsores iónicos.',
    unlocked: true,
  },
  {
    id: 'viper_plasma',
    name: 'VIPER PLASMA',
    primaryColor: '#a855f7',
    secondaryColor: '#ec4899',
    emissiveColor: '#d946ef',
    eyeColor: '#10b981',
    particleColor: '#a855f7',
    metalness: 0.9,
    roughness: 0.15,
    headShape: 'nano_serpent',
    lore: 'Recubrimiento de fibra de carbono dopada con plasma de antimateria.',
    unlocked: true,
  },
  {
    id: 'solar_phoenix',
    name: 'SOLAR PHOENIX',
    primaryColor: '#f59e0b',
    secondaryColor: '#ef4444',
    emissiveColor: '#fbbf24',
    eyeColor: '#38bdf8',
    particleColor: '#f59e0b',
    metalness: 0.95,
    roughness: 0.25,
    headShape: 'mecha_vessel',
    lore: 'Forjado en reactores de fusión solar para máxima visibilidad en el hiperespacio.',
    unlocked: true,
  },
  {
    id: 'quantum_ghost',
    name: 'QUANTUM GHOST',
    primaryColor: '#10b981',
    secondaryColor: '#065f46',
    emissiveColor: '#34d399',
    eyeColor: '#ec4899',
    particleColor: '#10b981',
    metalness: 0.5,
    roughness: 0.1,
    headShape: 'quantum_stealth',
    lore: 'Chasis de refracción óptica con transistores cuánticos de camuflaje.',
    unlocked: true,
  },
];

export const CustomizerModal: React.FC<CustomizerModalProps> = ({
  currentSkin,
  onSelectSkin,
  onClose,
  customSkins,
  onAddCustomSkin,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSource, setGenerationSource] = useState<string | null>(null);

  const allSkins = [...PRESET_SKINS, ...customSkins];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    sound.playUiClick();
    setIsGenerating(true);

    try {
      const { skin, source } = await gemini.generateSkin(prompt);
      onAddCustomSkin(skin);
      onSelectSkin(skin);
      setGenerationSource(source);
      sound.playPowerup();
      setPrompt('');
    } catch {
      // Handled gracefully in geminiService fallback
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="absolute inset-0 z-30 bg-black/85 flex items-center justify-center p-4 overflow-y-auto select-none">
      <div className="bg-slate-950 border border-purple-500/40 rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-[0_0_50px_rgba(168,85,247,0.3)] my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-950/80 border border-purple-500/40 text-purple-300">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-cyber font-black tracking-widest text-purple-300">
                SINTETIZADOR DE SKINS
              </h2>
              <p className="text-xs text-slate-400 font-tech">
                Personaliza los materiales 3D, colores de neón y propulsores de tu chasis
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

        <div className="overflow-y-auto pr-1 flex-1 py-4 space-y-6">
          {/* AI Skin Generator Prompt Input */}
          <div className="bg-slate-900/90 border border-purple-500/50 rounded-xl p-4 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="font-cyber text-xs font-bold text-purple-300 tracking-wider">
                GENERADOR CON INTELIGENCIA ARTIFICIAL
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-3 font-sans">
              Describe el diseño que imaginas (ej: <em>"Serpiente robótica de dragón con escamas azules y energía eléctrica violeta"</em>).
            </p>

            <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Escribe tu descripción táctica o estética..."
                className="flex-1 bg-slate-950 border border-slate-700 focus:border-purple-400 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none font-sans"
              />
              <button
                type="submit"
                disabled={isGenerating || !prompt.trim()}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 font-cyber text-xs font-bold tracking-wider text-white disabled:opacity-50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.4)]"
              >
                {isGenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>SINTETIZANDO...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>FORJAR SKIN</span>
                  </>
                )}
              </button>
            </form>

            {generationSource && (
              <div className="text-[10px] font-mono text-purple-300 mt-2">
                Skin forjada exitosamente mediante: {generationSource === 'gemini' ? 'Google Gemini 3.8 Flash' : 'Sintetizador Procedural'}
              </div>
            )}
          </div>

          {/* Skins Grid */}
          <div>
            <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
              Chasis Disponibles ({allSkins.length})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allSkins.map((skin) => {
                const isSelected = currentSkin.id === skin.id;
                return (
                  <button
                    key={skin.id}
                    onClick={() => {
                      sound.playUiClick();
                      onSelectSkin(skin);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-purple-400 bg-purple-950/40 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-cyber text-xs font-bold text-white tracking-wide">
                          {skin.name}
                        </span>
                        {isSelected && (
                          <div className="flex items-center gap-1 text-[10px] text-purple-300 font-mono bg-purple-900/60 px-2 py-0.5 rounded border border-purple-500/40">
                            <Check className="w-3 h-3 text-purple-300" />
                            <span>EQUIPADO</span>
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 font-sans line-clamp-2 mb-3">
                        {skin.lore}
                      </p>
                    </div>

                    {/* Color Swatches */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                      <div
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{ backgroundColor: skin.primaryColor }}
                        title="Primario"
                      ></div>
                      <div
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{ backgroundColor: skin.secondaryColor }}
                        title="Secundario"
                      ></div>
                      <div
                        className="w-4 h-4 rounded-full border border-white/20 shadow-[0_0_8px]"
                        style={{ backgroundColor: skin.emissiveColor }}
                        title="Neón"
                      ></div>
                      <div
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{ backgroundColor: skin.eyeColor }}
                        title="Visor"
                      ></div>

                      <span className="ml-auto text-[10px] font-mono text-slate-500 uppercase">
                        {skin.headShape.replace('_', ' ')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
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
            GUARDAR Y SALIR
          </button>
        </div>
      </div>
    </div>
  );
};
