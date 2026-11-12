/**
 * SNAKE AI 2026 — THE NEXT EVOLUTION
 * Architecture: React 19 + Three.js PBR Engine + Google Gemini AI
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CoachAnalysis, GameMission, GameMode, GameSettings, GameStats, SnakeSkin } from './types/game';
import { GameEngine } from './game/engine/GameEngine';
import { sound } from './game/audio/SoundSynthesizer';
import { gemini } from './services/geminiService';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { MobileControls } from './components/MobileControls';
import { ResultsModal } from './components/ResultsModal';
import { CustomizerModal, PRESET_SKINS } from './components/CustomizerModal';
import { MissionsModal } from './components/MissionsModal';
import { AssistantModal } from './components/AssistantModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Status & Keys
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(false);

  // Game Screen State
  const [gameState, setGameState] = useState<'title' | 'playing' | 'results'>('title');
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic');
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Active Modals
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Stats & Progression (with LocalStorage)
  const [stats, setStats] = useState<GameStats>(() => {
    try {
      const saved = localStorage.getItem('snake_ai_2026_stats');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      highScore: 1200,
      totalGames: 0,
      totalEnergyCollected: 0,
      longestSurvivalTime: 0,
      credits: 250,
      victoriesOverRival: 0,
    };
  });

  // Settings
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem('snake_ai_2026_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      musicVolume: 0.4,
      sfxVolume: 0.7,
      soundEnabled: true,
      musicEnabled: true,
      cameraFov: 46,
      bloomEffects: true,
      controlType: 'dpad',
    };
  });

  const [isMuted, setIsMuted] = useState(false);

  // Current Skin & Custom Skins
  const [currentSkin, setCurrentSkin] = useState<SnakeSkin>(PRESET_SKINS[0]);
  const [customSkins, setCustomSkins] = useState<SnakeSkin[]>(() => {
    try {
      const saved = localStorage.getItem('snake_ai_2026_custom_skins');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // In-Game Live Telemetry State
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [multiplier, setMultiplier] = useState(1);
  const [snakeLength, setSnakeLength] = useState(3);
  const [speed, setSpeed] = useState(1.0);
  const [rivalScore, setRivalScore] = useState(0);
  const [rivalLength, setRivalLength] = useState(0);
  const [commentary, setCommentary] = useState('Sistemas activados. Buena suerte, piloto.');

  // Results State
  const [lastMatch, setLastMatch] = useState<{
    score: number;
    duration: number;
    coresCollected: number;
    cause: 'wall' | 'body' | 'hazard' | 'rival';
    rivalScore: number;
    isNewRecord: boolean;
  } | null>(null);

  const [coachAnalysis, setCoachAnalysis] = useState<CoachAnalysis | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachSource, setCoachSource] = useState('local');

  // Missions
  const [missions, setMissions] = useState<GameMission[]>([
    {
      title: 'SOBRECARGA CUÁNTICA',
      description: 'Recolecta 15 núcleos de energía en una sola partida.',
      objectiveType: 'collect_energy',
      targetValue: 15,
      currentProgress: 0,
      rewardCredits: 150,
      completed: false,
      claimed: false,
      loreBrief: 'Sector 07 en déficit de plasma.',
    },
    {
      title: 'SUPREMACÍA CIBERNÉTICA',
      description: 'Supera los 1,000 puntos en modo AI Rival frente a Cobra-9.',
      objectiveType: 'beat_rival',
      targetValue: 1000,
      currentProgress: 0,
      rewardCredits: 300,
      completed: false,
      claimed: false,
      loreBrief: 'Desafío de supremacía algorítmica.',
    },
  ]);

  // Save Stats to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('snake_ai_2026_stats', JSON.stringify(stats));
    } catch {}
  }, [stats]);

  // Save Custom Skins to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('snake_ai_2026_custom_skins', JSON.stringify(customSkins));
    } catch {}
  }, [customSkins]);

  // Check API Status on Mount
  useEffect(() => {
    gemini.getStatus().then((status) => {
      setHasGeminiKey(status.hasKey);
    });
  }, []);

  // Initialize GameEngine once inside canvasMountRef
  useEffect(() => {
    if (!canvasMountRef.current || engineRef.current) return;

    const engine = new GameEngine(canvasMountRef.current, currentSkin, {
      onScoreUpdate: (newScore, newCombo, newMult, len, spd) => {
        setScore(newScore);
        setCombo(newCombo);
        setMultiplier(newMult);
        setSnakeLength(len);
        setSpeed(spd);
      },
      onGameOver: (finalScore, duration, cores, cause, rScore) => {
        handleGameOver(finalScore, duration, cores, cause, rScore);
      },
      onCoreEaten: (coreType, points) => {
        // Update mission progress
        setMissions((prev) =>
          prev.map((m) => {
            if (m.objectiveType === 'collect_energy' && !m.completed) {
              const nextProg = m.currentProgress + 1;
              return {
                ...m,
                currentProgress: nextProg,
                completed: nextProg >= m.targetValue,
              };
            }
            return m;
          })
        );
      },
      onCommentary: (text) => {
        setCommentary(text);
      },
      onRivalUpdate: (rScore, rLen) => {
        setRivalScore(rScore);
        setRivalLength(rLen);
      },
    });

    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Handle Game Over & AI Coach Request
  const handleGameOver = useCallback(
    async (
      finalScore: number,
      duration: number,
      cores: number,
      cause: 'wall' | 'body' | 'hazard' | 'rival',
      rScore: number
    ) => {
      const isNewRecord = finalScore > stats.highScore;

      setStats((prev) => ({
        ...prev,
        totalGames: prev.totalGames + 1,
        totalEnergyCollected: prev.totalEnergyCollected + cores,
        longestSurvivalTime: Math.max(prev.longestSurvivalTime, duration),
        highScore: Math.max(prev.highScore, finalScore),
        credits: prev.credits + Math.floor(finalScore / 10),
      }));

      setLastMatch({
        score: finalScore,
        duration,
        coresCollected: cores,
        cause,
        rivalScore: rScore,
        isNewRecord,
      });

      setGameState('results');
      setCoachLoading(true);

      try {
        const { analysis, source } = await gemini.analyzeMatch({
          score: finalScore,
          duration,
          energyCollected: cores,
          collisionType: cause,
          mode: selectedMode,
          rivalScore: rScore,
        });

        setCoachAnalysis(analysis);
        setCoachSource(source);
      } catch {
        // Fallback already returned by geminiService
      } finally {
        setCoachLoading(false);
      }
    },
    [stats.highScore, selectedMode]
  );

  // Keyboard Controls Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showCustomizer || showMissions || showAssistant || showSettings) return;

      if (gameState === 'title') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleStartGame(selectedMode);
        }
        return;
      }

      if (gameState === 'playing') {
        switch (e.code) {
          case 'ArrowUp':
          case 'KeyW':
            e.preventDefault();
            engineRef.current?.setDirection('UP');
            break;
          case 'ArrowDown':
          case 'KeyS':
            e.preventDefault();
            engineRef.current?.setDirection('DOWN');
            break;
          case 'ArrowLeft':
          case 'KeyA':
            e.preventDefault();
            engineRef.current?.setDirection('LEFT');
            break;
          case 'ArrowRight':
          case 'KeyD':
            e.preventDefault();
            engineRef.current?.setDirection('RIGHT');
            break;
          case 'ShiftLeft':
          case 'ShiftRight':
            e.preventDefault();
            engineRef.current?.setTurbo(true);
            break;
          case 'Space':
            e.preventDefault();
            togglePause();
            break;
          case 'Escape':
            e.preventDefault();
            togglePause();
            break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        engineRef.current?.setTurbo(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, selectedMode, showCustomizer, showMissions, showAssistant, showSettings]);

  const handleStartGame = (mode: GameMode) => {
    setSelectedMode(mode);
    setGameState('playing');
    setIsPaused(false);
    engineRef.current?.startGame(mode);
  };

  const togglePause = () => {
    setIsPaused((prev) => {
      const next = !prev;
      engineRef.current?.togglePause();
      return next;
    });
  };

  const handleQuitToMenu = () => {
    setGameState('title');
    setIsPaused(false);
    engineRef.current?.setupMenuPreview();
  };

  const handleSelectSkin = (skin: SnakeSkin) => {
    setCurrentSkin(skin);
    engineRef.current?.updateSkin(skin);
  };

  const handleAddCustomSkin = (skin: SnakeSkin) => {
    setCustomSkins((prev) => [skin, ...prev]);
  };

  const handleClaimMission = (index: number) => {
    setMissions((prev) =>
      prev.map((m, idx) => {
        if (idx === index && m.completed && !m.claimed) {
          setStats((s) => ({ ...s, credits: s.credits + m.rewardCredits }));
          return { ...m, claimed: true };
        }
        return m;
      })
    );
  };

  const handleAddMission = (mission: GameMission) => {
    setMissions((prev) => [mission, ...prev]);
  };

  const toggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
    return muted;
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black font-sans select-none touch-none">
      {/* 3D WebGL Canvas isolated container */}
      <div ref={canvasMountRef} className="absolute inset-0 z-0" />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          onStartGame={handleStartGame}
          selectedMode={selectedMode}
          onSelectMode={setSelectedMode}
          onOpenCustomizer={() => setShowCustomizer(true)}
          onOpenMissions={() => setShowMissions(true)}
          onOpenAssistant={() => setShowAssistant(true)}
          onOpenSettings={() => setShowSettings(true)}
          currentSkin={currentSkin}
          highScore={stats.highScore}
          credits={stats.credits}
          hasGeminiKey={hasGeminiKey}
        />
      )}

      {/* In-Game HUD Overlay */}
      {gameState === 'playing' && (
        <>
          <GameHUD
            score={score}
            highScore={stats.highScore}
            combo={combo}
            multiplier={multiplier}
            length={snakeLength}
            speed={speed}
            mode={selectedMode}
            isPaused={isPaused}
            onTogglePause={togglePause}
            onQuitToMenu={handleQuitToMenu}
            rivalScore={rivalScore}
            rivalLength={rivalLength}
            commentaryText={commentary}
            activeMission={missions[0] || null}
            onMuteToggle={toggleMute}
            isMuted={isMuted}
          />

          {/* Mobile Touch & Gesture Controls */}
          <MobileControls
            onDirection={(dir) => engineRef.current?.setDirection(dir)}
            onTurbo={(active) => engineRef.current?.setTurbo(active)}
          />
        </>
      )}

      {/* Post-Game Results & AI Coach Modal */}
      {gameState === 'results' && lastMatch && (
        <ResultsModal
          score={lastMatch.score}
          duration={lastMatch.duration}
          coresCollected={lastMatch.coresCollected}
          cause={lastMatch.cause}
          rivalScore={lastMatch.rivalScore}
          highScore={stats.highScore}
          isNewRecord={lastMatch.isNewRecord}
          coachAnalysis={coachAnalysis}
          coachLoading={coachLoading}
          coachSource={coachSource}
          onRematch={() => handleStartGame(selectedMode)}
          onMenu={handleQuitToMenu}
        />
      )}

      {/* Skin Customizer & AI Genesis Modal */}
      {showCustomizer && (
        <CustomizerModal
          currentSkin={currentSkin}
          onSelectSkin={handleSelectSkin}
          onClose={() => setShowCustomizer(false)}
          customSkins={customSkins}
          onAddCustomSkin={handleAddCustomSkin}
        />
      )}

      {/* AI Game Master Missions Modal */}
      {showMissions && (
        <MissionsModal
          missions={missions}
          onClaimReward={handleClaimMission}
          onAddMission={handleAddMission}
          onClose={() => setShowMissions(false)}
          currentScore={score}
        />
      )}

      {/* AURA-26 Virtual Assistant Chat Modal */}
      {showAssistant && (
        <AssistantModal
          onClose={() => setShowAssistant(false)}
          highScore={stats.highScore}
          totalGames={stats.totalGames}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={(newSet) => setSettings((prev) => ({ ...prev, ...newSet }))}
          onClose={() => setShowSettings(false)}
          hasGeminiKey={hasGeminiKey}
        />
      )}
    </div>
  );
}
