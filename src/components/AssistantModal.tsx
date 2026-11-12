import React, { useState } from 'react';
import { sound } from '../game/audio/SoundSynthesizer';
import { gemini } from '../services/geminiService';
import { X, Sparkles, Send, Bot, User, HelpCircle } from 'lucide-react';

interface AssistantModalProps {
  onClose: () => void;
  highScore: number;
  totalGames: number;
}

interface Message {
  sender: 'user' | 'aura';
  text: string;
}

export const AssistantModal: React.FC<AssistantModalProps> = ({
  onClose,
  highScore,
  totalGames,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'aura',
      text: '¡Saludos, piloto! Soy AURA-26, tu asistente neural. Puedo asesorarte sobre estrategias de combate, evasión de la Cobra IA, o los secretos de cada núcleo de energía. ¿Qué deseas consultar?',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const quickQuestions = [
    '¿Cómo vencer al rival IA?',
    '¿Qué hace cada núcleo de energía?',
    '¿Cómo funciona el multiplicador de combo?',
    '¿Consejo para el modo Survival?',
  ];

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;

    sound.playUiClick();
    const userMsg = textToSend.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setInputText('');
    setIsTyping(true);

    try {
      const reply = await gemini.chatWithAssistant(userMsg, { highScore, totalGames });
      setMessages((prev) => [...prev, { sender: 'aura', text: reply }]);
      sound.playTurn();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'aura',
          text: 'Interferencia momentánea en el enlace neural. Te sugiero maniobrar cerca de las esquinas para mantener el centro despejado.',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="absolute inset-0 z-30 bg-black/85 flex items-center justify-center p-4 overflow-y-auto select-none">
      <div className="bg-slate-950 border border-cyan-500/40 rounded-2xl max-w-xl w-full p-6 shadow-[0_0_50px_rgba(6,182,212,0.3)] my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 p-0.5 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.5)]">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                <Bot className="w-4 h-4 text-cyan-300" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-cyber font-black tracking-widest text-cyan-300">
                AURA-26 — ASISTENTE IA
              </h2>
              <p className="text-[11px] text-slate-400 font-tech">
                Enlace de telemetría y consultas tácticas en español
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

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1 text-xs font-sans">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                  m.sender === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-cyan-600 text-white shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                }`}
              >
                {m.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`max-w-[80%] p-3 rounded-xl leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-purple-950/60 border border-purple-500/40 text-purple-100 rounded-tr-none'
                    : 'bg-slate-900/90 border border-cyan-500/30 text-slate-200 rounded-tl-none'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono">
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              <span>AURA-26 formulando respuesta táctica...</span>
            </div>
          )}
        </div>

        {/* Quick Question Chips */}
        <div className="py-2 flex flex-wrap gap-1.5 border-t border-slate-800">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={isTyping}
              className="text-[11px] font-tech px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 hover:border-cyan-500/60 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Field */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputText);
          }}
          className="pt-2 flex gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Pregunta a AURA sobre estrategias, modos o secretos..."
            className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none font-sans"
          />
          <button
            type="submit"
            disabled={isTyping || !inputText.trim()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-cyber text-xs font-bold tracking-wider disabled:opacity-50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.4)]"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
