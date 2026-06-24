import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trade, AppSettings, RecoveryState } from '../types';
import { getTradeStats, calculateDisciplineScore, calculateEmotionalScore, shouldActivateRecovery } from '../store';
import { Bot, X, AlertTriangle, Shield, Brain, Zap } from 'lucide-react';

interface FloatingAssistantProps {
  trades: Trade[];
  settings: AppSettings;
  recovery: RecoveryState;
}

export default function FloatingAssistant({ trades, settings, recovery }: FloatingAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);

  const stats = getTradeStats(trades);
  const discipline = calculateDisciplineScore(trades, settings);
  const emotional = calculateEmotionalScore(trades);
  const shouldRecover = shouldActivateRecovery(trades, settings);

  const generateTips = useCallback((): string[] => {
    const tips: string[] = [];
    const today = new Date().toISOString().split('T')[0];
    const todayTrades = trades.filter(t => t.date === today);

    if (todayTrades.length === 0) tips.push('🌅 No trades today. Take time to analyze the market before trading.');
    if (todayTrades.length >= settings.dailyTradeLimit - 1) tips.push(`⚠️ ${todayTrades.length}/${settings.dailyTradeLimit} trades today. Almost at limit.`);
    if (stats.currentStreak < -2) tips.push('🔴 On a losing streak. Consider a break.');
    if (stats.currentStreak >= 3) tips.push('🟢 Great streak! Stay disciplined.');
    if (discipline < 50) tips.push('🛡️ Discipline needs improvement. Follow your rules.');
    if (emotional < 40) tips.push('🧠 Emotional state is low. Consider stepping away.');
    if (recovery.active) tips.push('🔒 Recovery Mode active. Trade with reduced size.');
    if (shouldRecover.activate && !recovery.active) tips.push(`⚠️ ${shouldRecover.reason}. Recovery recommended.`);
    if (stats.avgRR < 1 && stats.totalTrades > 5) tips.push('📊 Improve R:R ratio. Aim for 1:2 minimum.');
    if (tips.length === 0) tips.push('✅ Systems normal. Trade with discipline.');

    return tips;
  }, [trades, settings, stats, discipline, emotional, recovery, shouldRecover]);

  const tips = generateTips();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % tips.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [tips.length]);

  const statusColor = emotional >= 60 && discipline >= 60 ? '#00ff88' :
    emotional >= 40 && discipline >= 40 ? '#ffdd00' : '#ff3366';

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="glass-card p-4 mb-3 w-72 neon-glow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#00d4ff] flex items-center gap-1.5">
                <Brain size={14} /> NEXUS AI
              </span>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-300">
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-lg bg-[rgba(30,42,58,0.5)] text-gray-300 leading-relaxed">
                {tips[currentTip]}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-1.5 rounded bg-[rgba(30,42,58,0.3)]">
                  <Shield size={12} className="mx-auto" style={{ color: discipline >= 70 ? '#00ff88' : '#ffdd00' }} />
                  <div className="text-[10px] mt-1 stat-value" style={{ color: discipline >= 70 ? '#00ff88' : '#ffdd00' }}>{discipline}%</div>
                  <div className="text-[7px] text-gray-600">DISC</div>
                </div>
                <div className="text-center p-1.5 rounded bg-[rgba(30,42,58,0.3)]">
                  <Brain size={12} className="mx-auto" style={{ color: emotional >= 60 ? '#00d4ff' : '#ffdd00' }} />
                  <div className="text-[10px] mt-1 stat-value" style={{ color: emotional >= 60 ? '#00d4ff' : '#ffdd00' }}>{emotional}%</div>
                  <div className="text-[7px] text-gray-600">EMO</div>
                </div>
                <div className="text-center p-1.5 rounded bg-[rgba(30,42,58,0.3)]">
                  <Zap size={12} className="mx-auto" style={{ color: stats.winRate >= 50 ? '#00ff88' : '#ff3366' }} />
                  <div className="text-[10px] mt-1 stat-value" style={{ color: stats.winRate >= 50 ? '#00ff88' : '#ff3366' }}>{stats.winRate}%</div>
                  <div className="text-[7px] text-gray-600">WIN</div>
                </div>
              </div>

              {recovery.active && (
                <div className="flex items-center gap-1.5 text-[10px] text-[#ff3366] p-1.5 rounded bg-[rgba(255,51,102,0.1)]">
                  <AlertTriangle size={10} /> Recovery Mode Active
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all animate-float"
        style={{
          background: `linear-gradient(135deg, ${statusColor}33, rgba(0,212,255,0.2))`,
          border: `2px solid ${statusColor}`,
          boxShadow: `0 0 20px ${statusColor}33`,
        }}
      >
        <Bot size={20} style={{ color: statusColor }} />
      </motion.button>
    </div>
  );
}
