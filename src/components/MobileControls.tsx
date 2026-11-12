import React, { useEffect, useRef } from 'react';
import { Direction } from '../types/game';
import { sound } from '../game/audio/SoundSynthesizer';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Zap } from 'lucide-react';

interface MobileControlsProps {
  onDirection: (dir: Direction) => void;
  onTurbo: (active: boolean) => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ onDirection, onTurbo }) => {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Swipe gesture listener across the entire screen
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Minimum swipe threshold (25px)
      if (Math.max(absDx, absDy) > 25) {
        if (absDx > absDy) {
          onDirection(dx > 0 ? 'RIGHT' : 'LEFT');
        } else {
          onDirection(dy > 0 ? 'DOWN' : 'UP');
        }
      }
      touchStartRef.current = null;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onDirection]);

  return (
    <div className="md:hidden absolute inset-x-0 bottom-4 z-20 flex items-center justify-between px-6 pointer-events-none select-none">
      {/* Virtual Directional D-Pad */}
      <div className="relative w-36 h-36 pointer-events-auto">
        {/* UP */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onDirection('UP');
          }}
          className="absolute top-0 left-12 w-12 h-12 rounded-xl bg-slate-900/80 border border-cyan-500/40 active:bg-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer"
        >
          <ChevronUp className="w-6 h-6" />
        </button>

        {/* DOWN */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onDirection('DOWN');
          }}
          className="absolute bottom-0 left-12 w-12 h-12 rounded-xl bg-slate-900/80 border border-cyan-500/40 active:bg-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        {/* LEFT */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onDirection('LEFT');
          }}
          className="absolute top-12 left-0 w-12 h-12 rounded-xl bg-slate-900/80 border border-cyan-500/40 active:bg-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* RIGHT */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onDirection('RIGHT');
          }}
          className="absolute top-12 right-0 w-12 h-12 rounded-xl bg-slate-900/80 border border-cyan-500/40 active:bg-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* D-Pad Center Core */}
        <div className="absolute top-12 left-12 w-12 h-12 rounded-lg bg-slate-950/60 border border-cyan-500/20 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-cyan-400/40"></div>
        </div>
      </div>

      {/* Turbo Boost Action Button */}
      <div className="pointer-events-auto">
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onTurbo(true);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            onTurbo(false);
          }}
          className="w-18 h-18 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 border border-amber-300/40 active:scale-95 text-white flex flex-col items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-pointer"
        >
          <Zap className="w-7 h-7 fill-white" />
          <span className="text-[10px] font-cyber font-bold tracking-widest mt-0.5">TURBO</span>
        </button>
      </div>
    </div>
  );
};
