import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trade, AppSettings, PageType } from '../types';
import { getTradeStats, calculateDisciplineScore, calculateEmotionalScore, generateAIInsights } from '../store';
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, Send, Bot, User } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface VoiceAssistantProps {
  trades: Trade[];
  settings: AppSettings;
  onNavigate: (page: PageType) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function VoiceAssistant({ trades, settings, onNavigate }: VoiceAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'assistant', content: 'Welcome to NEXUS AI Assistant. I\'m your trading mentor, risk manager, and recovery coach. Ask me anything about your trading performance, or use voice commands like "Show analytics", "Add trade", or "Show discipline score".', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const stats = getTradeStats(trades);
  const discipline = calculateDisciplineScore(trades, settings);
  const emotional = calculateEmotionalScore(trades);
  const insights = generateAIInsights(trades);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    synth.speak(utterance);
  }, [voiceEnabled]);

  const processCommand = useCallback((text: string): string => {
    const lower = text.toLowerCase().trim();

    // Navigation commands
    if (lower.includes('show analytics') || lower.includes('open analytics')) {
      onNavigate('analytics');
      return 'Opening Analytics page. Here you can see detailed performance metrics across all your trades.';
    }
    if (lower.includes('add trade') || lower.includes('new trade') || lower.includes('enter trade')) {
      onNavigate('trade-entry');
      return 'Opening Trade Entry. Fill in your trade details including entry/exit prices, emotions, and strategy used.';
    }
    if (lower.includes('recovery') || lower.includes('recovery mode')) {
      onNavigate('recovery');
      return `Opening Recovery Mode. ${stats.currentStreak < -2 ? 'I notice you\'re on a losing streak. Recovery Mode might be beneficial.' : 'Your current state looks stable.'}`;
    }
    if (lower.includes('show graphs') || lower.includes('open graphs')) {
      onNavigate('graphs');
      return 'Opening Graphs page with interactive charts of your trading performance.';
    }
    if (lower.includes('calendar')) {
      onNavigate('calendar');
      return 'Opening Trading Calendar with your daily performance heatmap.';
    }
    if (lower.includes('psychology') || lower.includes('psych')) {
      onNavigate('psychology');
      return 'Opening Psychology Tracker to monitor your mental state and trading discipline.';
    }
    if (lower.includes('goals')) {
      onNavigate('goals');
      return 'Opening Goals & Discipline page where you can track your trading objectives.';
    }
    if (lower.includes('report') || lower.includes('generate report')) {
      onNavigate('reports');
      return 'Opening Reports page. You can generate detailed performance reports here.';
    }
    if (lower.includes('dashboard') || lower.includes('home')) {
      onNavigate('dashboard');
      return 'Returning to Dashboard with your performance overview.';
    }
    if (lower.includes('settings')) {
      onNavigate('settings');
      return 'Opening Settings. You can configure your trading limits, risk parameters, and notification preferences here.';
    }

    // Analytics queries
    if (lower.includes('discipline score') || lower.includes('how disciplined')) {
      const msg = discipline >= 80 ? `Your discipline score is ${discipline}%. Excellent work! Keep maintaining these standards.` :
        discipline >= 60 ? `Your discipline score is ${discipline}%. Good, but there's room for improvement. Focus on following your rules consistently.` :
        `Your discipline score is ${discipline}%. This needs attention. Focus on sticking to your trading plan and risk limits.`;
      return msg;
    }
    if (lower.includes('win rate') || lower.includes('how am i doing') || lower.includes('performance')) {
      return `Your current stats: Win rate ${stats.winRate}%, Total P/L $${stats.totalPnL}, Profit factor ${stats.profitFactor}, ${stats.totalTrades} total trades. ${stats.winRate >= 50 ? 'You\'re doing well!' : 'There\'s room for improvement.'}`;
    }
    if (lower.includes('losses') || lower.includes('show losses') || lower.includes('losing')) {
      return `You have ${stats.losses} losing trades with average loss of $${stats.avgLoss}. Worst trade: $${stats.worstTrade}. Max drawdown: $${stats.maxDrawdown}. ${stats.currentStreak < 0 ? `Currently on a ${Math.abs(stats.currentStreak)}-loss streak.` : ''}`;
    }
    if (lower.includes('emotional') || lower.includes('emotion') || lower.includes('how do i feel')) {
      return `Emotional stability score: ${emotional}%. ${emotional >= 70 ? 'Your emotional state is stable — good for trading.' : emotional >= 40 ? 'Watch your emotions. Consider taking a break if you feel frustrated.' : 'Your emotional state is concerning. I strongly recommend a trading break.'}`;
    }
    if (lower.includes('take a break') || lower.includes('should i stop')) {
      if (stats.currentStreak < -2 || emotional < 40 || discipline < 50) {
        return 'Yes, I strongly recommend taking a break right now. Your metrics suggest you\'re not in an optimal state for trading. Step away, review your journal, and come back with a clear mind.';
      }
      return 'Your metrics look acceptable, but if you feel tired or emotional, it\'s always better to take a break. Quality over quantity.';
    }
    if (lower.includes('advice') || lower.includes('help') || lower.includes('tips') || lower.includes('suggest')) {
      return insights.slice(0, 3).join(' ');
    }
    if (lower.includes('risk') || lower.includes('risk level')) {
      return `Average risk per trade: ${(trades.slice(0, 10).reduce((s, t) => s + t.riskPercent, 0) / Math.max(1, Math.min(10, trades.length))).toFixed(1)}%. Max recommended: ${settings.maxRiskPerTrade}%. ${stats.maxDrawdown > settings.accountBalance * 0.1 ? 'Your drawdown is significant. Consider reducing position sizes.' : 'Risk levels appear manageable.'}`;
    }
    if (lower.includes('strategy') || lower.includes('best strategy')) {
      if (trades.length < 3) return 'Not enough trade data to analyze strategies. Keep logging your trades.';
      return insights.find(i => i.includes('strategy')) || 'Continue trading with your current strategies and I\'ll identify the best performers.';
    }
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return `Hello, trader! Your current standing: ${stats.totalPnL >= 0 ? '📈' : '📉'} P/L $${stats.totalPnL}, ${stats.winRate}% win rate, ${discipline}% discipline. How can I help you today?`;
    }
    if (lower.includes('motivat') || lower.includes('encourage')) {
      return 'Remember: Every successful trader has faced losses. What matters is your response. Stay disciplined, manage risk, and trust your process. Consistency is the key to long-term success. 💪';
    }

    // Default
    return `I understand you said: "${text}". I can help you with: showing analytics, checking discipline score, analyzing your performance, reviewing losses, assessing emotional state, navigating to any page, or providing trading advice. Try asking "How am I doing?" or "Show my discipline score".`;
  }, [stats, discipline, emotional, insights, trades, settings, onNavigate]);

  const handleSend = useCallback((text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date() };
    const response = processCommand(msg);
    const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: response, timestamp: new Date() };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInput('');
    speak(response);
  }, [input, processCommand, speak]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Voice recognition is not supported in this browser. Try Chrome or Edge.', timestamp: new Date() }]);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      handleSend(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, [isListening, handleSend]);

  // Quick action buttons
  const quickActions = [
    'How am I doing?',
    'Show discipline score',
    'Show losses',
    'Any advice?',
    'Should I take a break?',
    'Check emotional state',
  ];

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSpeaking ? 'bg-[rgba(0,255,136,0.2)] animate-pulse' : 'bg-gradient-to-br from-[#a855f7] to-[#00d4ff]'}`}>
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#00d4ff]">NEXUS AI Voice Assistant</h2>
            <p className="text-[10px] text-gray-500">Trading Mentor · Risk Manager · Recovery Coach</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`p-2 rounded-lg transition-all ${voiceEnabled ? 'text-[#00ff88]' : 'text-gray-600'}`}>
            {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button onClick={toggleListening}
            className={`p-2 rounded-lg transition-all ${isListening ? 'bg-[rgba(255,51,102,0.2)] text-[#ff3366] animate-pulse' : 'text-gray-400 hover:text-[#00ff88]'}`}>
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="flex gap-2 flex-wrap">
        {quickActions.map(action => (
          <button key={action} onClick={() => handleSend(action)}
            className="px-3 py-1.5 rounded-full text-[10px] bg-[rgba(30,42,58,0.5)] text-gray-400 hover:text-[#00ff88] hover:bg-[rgba(0,255,136,0.1)] transition-all border border-transparent hover:border-[rgba(0,255,136,0.2)]">
            {action}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="glass-card p-4 flex-1 overflow-y-auto max-h-[500px] space-y-3">
        {messages.map(msg => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-[rgba(0,212,255,0.15)]' : 'bg-[rgba(168,85,247,0.15)]'}`}>
              {msg.role === 'user' ? <User size={14} className="text-[#00d4ff]" /> : <Bot size={14} className="text-[#a855f7]" />}
            </div>
            <div className={`max-w-[80%] p-3 rounded-xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-[rgba(0,212,255,0.1)] text-gray-200' : 'bg-[rgba(30,42,58,0.5)] text-gray-300'}`}>
              {msg.content}
              <div className="text-[8px] text-gray-600 mt-1">{msg.timestamp.toLocaleTimeString()}</div>
            </div>
          </motion.div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <button onClick={toggleListening}
          className={`p-3 rounded-xl transition-all flex-shrink-0 ${isListening ? 'bg-[rgba(255,51,102,0.2)] border border-[rgba(255,51,102,0.3)] text-[#ff3366]' : 'glass-card text-gray-400 hover:text-[#00ff88]'}`}>
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <div className="flex-1 flex gap-2">
          <input
            className="cyber-input flex-1"
            placeholder={isListening ? 'Listening...' : 'Type a command or question...'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button onClick={() => handleSend()} className="cyber-button p-3">
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Voice Status */}
      {isListening && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 text-[#ff3366] text-xs">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <motion.div key={i} animate={{ height: [4, 16, 4] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                className="w-1 bg-[#ff3366] rounded-full" />
            ))}
          </div>
          <MessageCircle size={14} /> Listening for voice command...
        </motion.div>
      )}
    </div>
  );
}
