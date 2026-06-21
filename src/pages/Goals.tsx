// src/pages/Goals.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Goal, Trade, AppSettings } from '../types';
import { getGoals, saveGoals, getTradeStats, calculateDisciplineScore, getDailyPnL, calculateEmotionalScore } from '../store';
import { v4 as uuidv4 } from 'uuid';
import { 
  Target, Plus, Trash2, CheckCircle2, Award, Zap, Star, TrendingUp,
  Calendar, Crown, Clock, Coins, BarChart, ChevronRight,
  ChevronDown, TrendingDown, Activity, Info, X, Lightbulb,
  Flame, Sparkles, Trophy, Medal, Rocket, Gem, Shield,
  Compass, Layers, GitBranch, Wallet, PieChart, Gift
} from 'lucide-react';

interface GoalsProps {
  trades: Trade[];
  settings: AppSettings;
  onQuickAddTrade?: () => void;
}

const CATEGORIES = ['Profit', 'Risk Control', 'Discipline', 'Consistency', 'Recovery', 'Psychology', 'Learning'];

const QUICK_TEMPLATES = [
  { title: 'Maintain 2.0+ Profit Factor', category: 'Consistency', target: '2', unit: 'PF', desc: 'Focus on letting winners run & cutting losses.', icon: '📈' },
  { title: 'No FOMO Entries for 10 Trades', category: 'Discipline', target: '10', unit: 'Trades', desc: 'Wait strictly for confirmed setup triggers.', icon: '🧘' },
  { title: 'Maintain 85%+ Discipline Score', category: 'Risk Control', target: '85', unit: '%', desc: 'Always use hard Stop Loss on every position.', icon: '🛡️' },
  { title: 'Log Daily Journal Notes', category: 'Psychology', target: '5', unit: 'Days', desc: 'Reflect on emotional state post-trade.', icon: '📝' },
];

// Helper functions
const formatCurrency = (amount: number, currencySymbol: string = '$'): string => {
  if (amount < 0) {
    return `-${currencySymbol}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface DayGoal {
  day: number;
  title: string;
  icon: string;
  description: string;
  target: string;
  category: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  check: (trades: Trade[], goals: Goal[], settings: AppSettings) => boolean;
  xpReward: number;
  isFinal?: boolean;
  tip: string;
}

const THIRTY_ONE_DAY_GOALS: DayGoal[] = [
  {
    day: 1,
    title: 'Start Your Journey',
    icon: '🌱',
    description: 'Create your first trade entry',
    target: '1 trade',
    category: 'beginner',
    xpReward: 10,
    check: (trades) => trades.length >= 1,
    tip: 'Head over to the Trade Logger tab and log your very first trade.'
  },
  {
    day: 2,
    title: 'Set Your First Goal',
    icon: '🎯',
    description: 'Create your first trading goal',
    target: '1 goal',
    category: 'beginner',
    xpReward: 15,
    check: (_, goals) => goals.length >= 1,
    tip: 'Click "Add Goal" below or select one of the Quick Templates to define your target.'
  },
  {
    day: 3,
    title: '3-Day Streak',
    icon: '🔥',
    description: 'Trade for 3 consecutive days',
    target: '3 days',
    category: 'beginner',
    xpReward: 20,
    check: (trades) => {
      try { return new Set(trades.map(t => t.date)).size >= 3; } catch { return false; }
    },
    tip: 'Show up consistently. Logging trades across 3 unique calendar dates unlocks this.'
  },
  {
    day: 4,
    title: 'Risk Manager',
    icon: '⚖️',
    description: 'Set stop loss on your trades',
    target: 'SL on 3 trades',
    category: 'beginner',
    xpReward: 20,
    check: (trades) => {
      try { return trades.filter(t => t.stopLoss > 0).length >= 3; } catch { return false; }
    },
    tip: 'Always define your invalidation point before entering. Ensure stop loss is filled in.'
  },
  {
    day: 5,
    title: '5-Day Warrior',
    icon: '⚔️',
    description: 'Trade for 5 consecutive days',
    target: '5 days',
    category: 'beginner',
    xpReward: 25,
    check: (trades) => {
      try { return new Set(trades.map(t => t.date)).size >= 5; } catch { return false; }
    },
    tip: 'Persistence is key. Reach 5 active trading days to solidify your daily market routine.'
  },
  {
    day: 6,
    title: 'First Win Streak',
    icon: '💪',
    description: 'Achieve 3 consecutive wins',
    target: '3 wins',
    category: 'intermediate',
    xpReward: 30,
    check: (trades) => {
      try {
        let maxStreak = 0;
        let current = 0;
        for (const t of trades) {
          if (t.isWin) { current++; if (current > maxStreak) maxStreak = current; }
          else current = 0;
        }
        return maxStreak >= 3;
      } catch { return false; }
    },
    tip: 'Align with the major trend and wait for high-probability setups to secure 3 wins in a row.'
  },
  {
    day: 7,
    title: 'Week 1 Complete',
    icon: '📊',
    description: 'Complete your first trading week',
    target: '7 days',
    category: 'intermediate',
    xpReward: 35,
    check: (trades) => {
      try { return new Set(trades.map(t => t.date)).size >= 7; } catch { return false; }
    },
    tip: 'Congratulations on completing 7 days! Take time to review your weekly performance metrics.'
  },
  {
    day: 8,
    title: '10 Trades Club',
    icon: '📈',
    description: 'Complete 10 trades',
    target: '10 trades',
    category: 'intermediate',
    xpReward: 30,
    check: (trades) => {
      try { return trades.length >= 10; } catch { return false; }
    },
    tip: 'Experience comes with execution. Hit the 10 trade milestone in your journal.'
  },
  {
    day: 9,
    title: 'Discipline Score 60+',
    icon: '🛡️',
    description: 'Achieve 60%+ discipline score',
    target: '60%',
    category: 'intermediate',
    xpReward: 35,
    check: (trades, _, settings) => {
      try { return calculateDisciplineScore(trades, settings) >= 60; } catch { return false; }
    },
    tip: 'Avoid emotional extremes and always include your Stop Loss to keep discipline high.'
  },
  {
    day: 10,
    title: 'Double Digits',
    icon: '🎯',
    description: 'Trade for 10 consecutive days',
    target: '10 days',
    category: 'intermediate',
    xpReward: 40,
    check: (trades) => {
      try { return new Set(trades.map(t => t.date)).size >= 10; } catch { return false; }
    },
    tip: 'A true habit takes root around day 10. Stay disciplined and keep logging.'
  },
  {
    day: 11,
    title: 'Profitable Week',
    icon: '📈',
    description: 'Have a profitable trading week',
    target: 'Positive P&L',
    category: 'intermediate',
    xpReward: 45,
    check: (trades) => {
      try {
        const dailyPnL = getDailyPnL(trades) || [];
        const last7Days = dailyPnL.slice(-7);
        return last7Days.reduce((s, d) => s + (d.pnl || 0), 0) > 0 && last7Days.length >= 5;
      } catch { return false; }
    },
    tip: 'Keep your losses small so your winning days easily outpace them over a 7-day window.'
  },
  {
    day: 12,
    title: 'Win Streak 5',
    icon: '⚡',
    description: 'Achieve 5 consecutive wins',
    target: '5 wins',
    category: 'advanced',
    xpReward: 50,
    check: (trades) => {
      try {
        let maxStreak = 0;
        let current = 0;
        for (const t of trades) {
          if (t.isWin) { current++; if (current > maxStreak) maxStreak = current; }
          else current = 0;
        }
        return maxStreak >= 5;
      } catch { return false; }
    },
    tip: 'Unlocking a 5-win streak requires immense patience. Avoid forcing sub-par trades.'
  },
  {
    day: 13,
    title: 'Risk Master',
    icon: '🎯',
    description: 'Average R:R of 1.5 or higher',
    target: '1.5 R:R',
    category: 'advanced',
    xpReward: 45,
    check: (trades) => {
      try {
        const stats = getTradeStats(trades);
        return (stats.avgRR || 0) >= 1.5 && trades.length >= 10;
      } catch { return false; }
    },
    tip: 'Set take-profit targets at least 1.5 times the distance of your stop loss.'
  },
  {
    day: 14,
    title: '2 Weeks Strong',
    icon: '💪',
    description: 'Trade for 14 consecutive days',
    target: '14 days',
    category: 'advanced',
    xpReward: 50,
    check: (trades) => {
      try { return new Set(trades.map(t => t.date)).size >= 14; } catch { return false; }
    },
    tip: 'Two full weeks in the market! You are building elite cognitive endurance.'
  },
  {
    day: 15,
    title: 'Halfway Hero',
    icon: '🌟',
    description: 'You\'re halfway through the 31-day challenge!',
    target: '15 days',
    category: 'advanced',
    xpReward: 60,
    check: (trades) => {
      try { return new Set(trades.map(t => t.date)).size >= 15; } catch { return false; }
    },
    tip: '15 days down. Review your best and worst trades so far to refine your edge for the second half.'
  },
  {
    day: 16,
    title: 'Goal Achiever',
    icon: '✅',
    description: 'Complete your first goal',
    target: '1 goal',
    category: 'advanced',
    xpReward: 40,
    check: (_, goals) => {
      try { return goals.filter(g => g.completed).length >= 1; } catch { return false; }
    },
    tip: 'Check off a completed goal in the Trading Goals section below.'
  },
  {
    day: 17,
    title: 'Consistency Builder',
    icon: '📊',
    description: '5 profitable days',
    target: '5 days',
    category: 'advanced',
    xpReward: 45,
    check: (trades) => {
      try {
        const dailyPnL = getDailyPnL(trades) || [];
        return dailyPnL.filter(d => (d.pnl || 0) > 0).length >= 5;
      } catch { return false; }
    },
    tip: 'Focus on ending the day green, no matter how small. Green days compound confidence.'
  },
  {
    day: 18,
    title: '18-Day Momentum',
    icon: '🚀',
    description: 'Trade for 18 consecutive days',
    target: '18 days',
    category: 'advanced',
    xpReward: 55,
    check: (trades) => {
      try { return new Set(trades.map(t => t.date)).size >= 18; } catch { return false; }
    },
    tip: 'Keep the momentum firing. Consistency is what separates pros from amateurs.'
  },
  {
    day: 19,
    title: 'Discipline Master',
    icon: '🛡️',
    description: 'Achieve 80%+ discipline score',
    target: '80%',
    category: 'advanced',
    xpReward: 50,
    check: (trades, _, settings) => {
      try { return calculateDisciplineScore(trades, settings) >= 80; } catch { return false; }
    },
    tip: 'Flawless plan execution. Ensure every single trade follows your predefined rules.'
  },
  {
    day: 20,
    title: '20-Day Trader',
    icon: '💎',
    description: 'Trade for 20 consecutive days',
    target: '20 days',
    category: 'advanced',
    xpReward: 60,
    check: (trades) => {
      try { return new Set(trades.map(t => t.date)).size >= 20; } catch { return false; }
    },
    tip: 'Entering the upper echelon of trading dedication. 20 days of structured focus.'
  },
  {
    day: 21,
    title: '3 Weeks Complete',
    icon: '🏆',
    description: 'Complete 3 weeks of trading',
    target: '21 days',
    category: 'expert',
    xpReward: 70,
    check: (trades) => {
      try { return new Set(trades.map(t => t.date)).size >= 21; } catch { return false; }
    },
    tip: 'Three weeks in the books. By now, managing risk should feel automatic.'
  },
  {
    day: 22,
    title: 'Consistency King',
    icon: '♛',
    description: '10 profitable trading days',
    target: '10 days',
    category: 'expert',
    xpReward: 65,
    check: (trades) => {
      try {
        const dailyPnL = getDailyPnL(trades) || [];
        return dailyPnL.filter(d => (d.pnl || 0) > 0).length >= 10;
      } catch { return false; }
    },
    tip: '10 green days prove you have an established market edge. Protect your capital.'
  },
  {
    day: 23,
    title: 'Goal Master',
    icon: '🏅',
    description: 'Complete 3 goals',
    target: '3 goals',
    category: 'expert',
    xpReward: 60,
    check: (_, goals) => {
      try { return goals.filter(g => g.completed).length >= 3; } catch { return false; }
    },
    tip: 'Complete at least 3 active goals in your tracker below.'
  },
  {
    day: 24,
    title: 'Emotional Stability',
    icon: '🧘',
    description: 'Achieve 70%+ emotional stability',
    target: '70%',
    category: 'expert',
    xpReward: 55,
    check: (trades) => {
      try { return calculateEmotionalScore(trades) >= 70; } catch { return false; }
    },
    tip: 'Keep greed and fear in check. Log trades with "Calm" or "Disciplined" mindsets.'
  },
  {
    day: 25,
    title: '25-Day Champion',
    icon: '👑',
    description: 'Trade for 25 consecutive days',
    target: '25 days',
    category: 'expert',
    xpReward: 80,
    check: (trades) => {
      try { return new Set(trades.map(t => t.date)).size >= 25; } catch { return false; }
    },
    tip: '25 days of steadfast commitment. You are nearing the final summit!'
  },
  {
    day: 26,
    title: 'Profit Machine',
    icon: '🤖',
    description: 'Profit factor of 2 or higher',
    target: '2.0 PF',
    category: 'expert',
    xpReward: 75,
    check: (trades) => {
      try {
        const stats = getTradeStats(trades);
        return (stats.profitFactor || 0) >= 2 && trades.length >= 20;
      } catch { return false; }
    },
    tip: 'A 2.0+ profit factor means your gross profits are double your gross losses. Exceptional edge.'
  },
  {
    day: 27,
    title: 'Risk Pro',
    icon: '⚖️',
    description: 'Average R:R of 2 or higher',
    target: '2.0 R:R',
    category: 'expert',
    xpReward: 70,
    check: (trades) => {
      try {
        const stats = getTradeStats(trades);
        return (stats.avgRR || 0) >= 2 && trades.length >= 15;
      } catch { return false; }
    },
    tip: 'Hold out for 2:1 risk/reward setups. This ensures profitability even with a 40% win rate.'
  },
  {
    day: 28,
    title: 'Final Stretch',
    icon: '🔥',
    description: '28 days of trading consistency',
    target: '28 days',
    category: 'expert',
    xpReward: 90,
    check: (trades) => {
      try { return new Set(trades.map(t => t.date)).size >= 28; } catch { return false; }
    },
    tip: 'Only 3 days remain! Maintain your peak mental state and execute flawlessly.'
  },
  {
    day: 29,
    title: 'Sharpe Champion',
    icon: '📊',
    description: 'Sharpe Ratio above 1.0',
    target: '1.0 Sharpe',
    category: 'expert',
    xpReward: 85,
    check: (trades) => {
      try {
        const stats = getTradeStats(trades);
        return (stats.sharpeRatio || 0) >= 1.0 && trades.length >= 25;
      } catch { return false; }
    },
    tip: 'High Sharpe ratio reflects exceptionally smooth returns with low volatility.'
  },
  {
    day: 30,
    title: 'Almost There!',
    icon: '🎯',
    description: '30 days - one more day to go!',
    target: '30 days',
    category: 'expert',
    xpReward: 95,
    check: (trades) => {
      try { return new Set(trades.map(t => t.date)).size >= 30; } catch { return false; }
    },
    tip: 'You are on the threshold of trading mastery. Stay cool and log your final sessions.'
  },
  {
    day: 31,
    title: '🏆 31-DAY CHAMPION! 🏆',
    icon: '👑',
    description: 'You completed the 31-day challenge!',
    target: '31 days',
    category: 'expert',
    xpReward: 200,
    check: (trades) => {
      try { return new Set(trades.map(t => t.date)).size >= 31; } catch { return false; }
    },
    isFinal: true,
    tip: 'Supreme mastery achieved! You have established a lifelong elite trading framework.'
  }
];

const LEVELS = [
  { level: 1, minXp: 0, title: 'Novice Trader', icon: '🌱', color: '#4a5568', glow: 'rgba(74,85,104,0.3)' },
  { level: 2, minXp: 100, title: 'Apprentice Trader', icon: '📚', color: '#718096', glow: 'rgba(113,128,150,0.3)' },
  { level: 3, minXp: 250, title: 'Rookie Trader', icon: '🔰', color: '#2ecc71', glow: 'rgba(46,204,113,0.3)' },
  { level: 4, minXp: 500, title: 'Intermediate Trader', icon: '⚡', color: '#00d4ff', glow: 'rgba(0,212,255,0.3)' },
  { level: 5, minXp: 800, title: 'Pro Trader', icon: '🎯', color: '#a855f7', glow: 'rgba(168,85,247,0.3)' },
  { level: 6, minXp: 1200, title: 'Elite Trader', icon: '🔥', color: '#ff8800', glow: 'rgba(255,136,0,0.3)' },
  { level: 7, minXp: 1800, title: 'Master Trader', icon: '👑', color: '#ffdd00', glow: 'rgba(255,221,0,0.3)' },
  { level: 8, minXp: 2500, title: 'Grandmaster Trader', icon: '💎', color: '#00ff88', glow: 'rgba(0,255,136,0.3)' },
  { level: 9, minXp: 3500, title: 'Legendary Trader', icon: '🌟', color: '#ff3366', glow: 'rgba(255,51,102,0.3)' },
  { level: 10, minXp: 5000, title: 'Trading God', icon: '⚡', color: '#ffd700', glow: 'rgba(255,215,0,0.4)' },
];

// Confetti component with enhanced particles
const Confetti = ({ active }: { active: boolean }) => {
  if (!active) return null;
  const colors = ['#ff3366', '#ffdd00', '#00ff88', '#00d4ff', '#a855f7', '#ff8800', '#ffd700'];
  const pieces = 60;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {Array.from({ length: pieces }).map((_, i) => {
        const size = 3 + Math.random() * 10;
        const left = Math.random() * 100;
        const delay = Math.random() * 0.8;
        const duration = 1.5 + Math.random() * 3;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const shape = Math.random() > 0.5 ? '50%' : '2px';
        
        return (
          <motion.div
            key={i}
            initial={{ y: -50, x: `${left}vw`, opacity: 1, rotate: 0, scale: 1 }}
            animate={{ 
              y: '110vh', 
              x: `${left + (Math.random() - 0.5) * 30}vw`,
              opacity: 0,
              rotate: Math.random() * 1080,
              scale: Math.random() * 0.5 + 0.3
            }}
            transition={{ duration, delay, ease: 'easeOut' }}
            className="absolute top-0"
            style={{
              width: size,
              height: size,
              borderRadius: shape,
              background: color,
              boxShadow: `0 0 20px ${color}66, 0 0 60px ${color}33`,
            }}
          />
        );
      })}
    </div>
  );
};

// Enhanced Neon Glow Component
const NeonGlow = ({ active, color, intensity = 1 }: { active: boolean; color: string; intensity?: number }) => {
  if (!active) return null;
  return (
    <motion.div
      className="absolute inset-0 rounded-xl pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.3 * intensity, 0], scale: [1, 1.02, 1] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        boxShadow: `0 0 ${30 * intensity}px ${color}, 0 0 ${60 * intensity}px ${color}33`,
        background: `radial-gradient(circle at center, ${color}${Math.round(15 * intensity)}, transparent)`
      }}
    />
  );
};

// Enhanced Day Goal Card Component
const DayGoalCard = ({ goal, isCompleted, isActive, index, isFinal, onClick }: { 
  goal: DayGoal; 
  isCompleted: boolean; 
  isActive: boolean;
  index: number;
  isFinal: boolean;
  onClick: () => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20, y: 10 }}
      animate={{ 
        opacity: 1, 
        x: 0, 
        y: 0,
        scale: isActive ? 1.03 : 1,
        transition: { delay: index * 0.02, duration: 0.3 }
      }}
      whileHover={{ scale: 1.04, y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      className={`relative p-4 rounded-2xl transition-all duration-300 overflow-hidden cursor-pointer border-2 ${
        isCompleted 
          ? 'bg-gradient-to-br from-[rgba(0,255,136,0.08)] to-[rgba(0,212,255,0.05)] border-[rgba(0,255,136,0.3)] shadow-[0_4px_20px_rgba(0,255,136,0.1)]' 
          : isActive 
            ? 'bg-gradient-to-br from-[rgba(0,212,255,0.12)] to-[rgba(168,85,247,0.08)] border-[rgba(0,212,255,0.4)] shadow-[0_4px_25px_rgba(0,212,255,0.15)]' 
            : 'bg-[rgba(18,26,41,0.6)] border-white/5 opacity-60 hover:opacity-100 hover:border-white/20'
      }`}
    >
      <NeonGlow active={isActive || isHovered} color={goal.category === 'expert' ? '#ffd700' : '#00d4ff'} intensity={isActive ? 1.5 : 0.8} />
      
      {isCompleted && (
        <motion.div 
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[#00ff88] via-[#00d4ff] to-[#a855f7]"
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      )}
      
      {isActive && !isCompleted && (
        <motion.div 
          className="absolute inset-0 pointer-events-none"
          animate={{ 
            background: [
              'radial-gradient(circle at 30% 50%, rgba(0,212,255,0.05), transparent 70%)',
              'radial-gradient(circle at 70% 50%, rgba(0,212,255,0.05), transparent 70%)',
              'radial-gradient(circle at 30% 50%, rgba(0,212,255,0.05), transparent 70%)'
            ]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}
      
      <div className="flex items-start gap-3.5 relative z-10">
        <div className="flex-shrink-0">
          <motion.div 
            animate={isActive ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg ${
              isCompleted ? 'bg-gradient-to-br from-[rgba(0,255,136,0.2)] to-[rgba(0,212,255,0.1)] text-[#00ff88] border border-[rgba(0,255,136,0.2)]' 
              : isActive ? 'bg-gradient-to-br from-[rgba(0,212,255,0.25)] to-[rgba(168,85,247,0.15)] text-[#00d4ff] border border-[rgba(0,212,255,0.3)] shadow-[0_0_20px_rgba(0,212,255,0.1)]' 
              : 'bg-[rgba(30,42,58,0.5)] text-gray-400 border border-white/5'
            }`}
          >
            {isCompleted ? <CheckCircle2 size={24} /> : goal.icon}
          </motion.div>
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold ${isCompleted ? 'text-[#00ff88]' : isActive ? 'text-[#00d4ff]' : 'text-gray-400'}`}>
              Day {goal.day}
            </span>
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold tracking-wide uppercase border ${
              goal.category === 'expert' ? 'bg-[rgba(255,215,0,0.15)] text-[#ffd700] border-[rgba(255,215,0,0.3)]' :
              goal.category === 'advanced' ? 'bg-[rgba(168,85,247,0.15)] text-[#a855f7] border-[rgba(168,85,247,0.3)]' :
              goal.category === 'intermediate' ? 'bg-[rgba(0,212,255,0.15)] text-[#00d4ff] border-[rgba(0,212,255,0.3)]' :
              'bg-[rgba(74,85,104,0.2)] text-gray-300 border-white/10'
            }`}>
              {goal.category}
            </span>
            {isFinal && isCompleted && (
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <Crown size={16} className="text-[#ffd700] drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]" />
              </motion.div>
            )}
          </div>
          <div className={`text-sm font-bold truncate mt-1 ${isCompleted ? 'text-white' : isActive ? 'text-white' : 'text-gray-300'}`}>
            {goal.title}
          </div>
          <div className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{goal.description}</div>
          <div className="flex items-center gap-3 mt-2 pt-1.5 border-t border-white/5">
            <span className="text-[10px] text-gray-400 flex items-center gap-1.5 font-medium bg-black/30 px-2 py-0.5 rounded-full">
              🎯 <strong className="text-gray-200">{goal.target}</strong>
            </span>
            <span className="text-[10px] text-[#ffdd00] flex items-center gap-0.5 font-bold bg-[rgba(255,221,0,0.1)] px-2 py-0.5 rounded-full border border-[rgba(255,221,0,0.1)]">
              ⚡ +{goal.xpReward} XP
            </span>
          </div>
        </div>
        <div className="flex items-center justify-center p-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors self-center">
          <ChevronRight size={18} className={isActive && !isCompleted ? 'text-[#00d4ff] animate-pulse' : 'text-gray-400'} />
        </div>
      </div>
    </motion.div>
  );
};

// Enhanced Badge Card Component
const BadgeCard = ({ badge, earned }: { badge: any; earned: boolean }) => {
  return (
    <motion.div 
      whileHover={earned ? { scale: 1.06, y: -4, rotate: [0, 2, -2, 0] } : { scale: 1.02 }}
      className={`p-4 rounded-2xl text-center transition-all relative overflow-hidden border-2 ${
        earned 
          ? 'bg-gradient-to-br from-[rgba(0,255,136,0.08)] to-[rgba(0,212,255,0.05)] border-[rgba(0,255,136,0.3)] shadow-[0_4px_25px_rgba(0,255,136,0.1)] cursor-pointer' 
          : 'bg-[rgba(18,26,41,0.4)] opacity-40 border-white/5'
      }`}
    >
      {earned && (
        <motion.div 
          className="absolute inset-0 pointer-events-none"
          animate={{ 
            background: [
              'radial-gradient(circle at 20% 30%, rgba(0,255,136,0.05), transparent 70%)',
              'radial-gradient(circle at 80% 70%, rgba(0,255,136,0.05), transparent 70%)',
              'radial-gradient(circle at 20% 30%, rgba(0,255,136,0.05), transparent 70%)'
            ]
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      )}
      
      <div className="relative z-10">
        <div className="text-4xl mb-2 select-none filter drop-shadow-lg">{badge.icon}</div>
        <div className={`text-xs font-bold truncate ${earned ? 'text-white' : 'text-gray-500'}`}>{badge.name}</div>
        <div className="text-[9px] text-gray-400 mt-1 leading-snug line-clamp-2">{badge.desc}</div>
        {earned ? (
          <motion.div 
            animate={earned ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#00ff88]/20 to-[#00d4ff]/20 border border-[rgba(0,255,136,0.3)] text-[10px] text-[#00ff88] font-bold shadow-[0_0_15px_rgba(0,255,136,0.1)]"
          >
            <Sparkles size={12} /> EARNED
          </motion.div>
        ) : (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-[10px] text-gray-500 font-bold border border-white/5">
            🔒 LOCKED
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default function Goals({ trades, settings, onQuickAddTrade }: GoalsProps) {
  const [goals, setGoalsState] = useState<Goal[]>(() => {
    try { return getGoals(); } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'Profit', target: '', unit: '', deadline: '', notes: '' });
  const [showConfetti, setShowConfetti] = useState(false);
  const [expandedGoals, setExpandedGoals] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'earned' | 'locked'>('all');
  const [selectedGoalDetail, setSelectedGoalDetail] = useState<DayGoal | null>(null);
  const [activeTab, setActiveTab] = useState<'roadmap' | 'goals' | 'badges'>('roadmap');
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);

  // Safe data with fallbacks
  const stats = useMemo(() => {
    try { return getTradeStats(trades); } catch { 
      return { totalTrades: 0, wins: 0, losses: 0, winRate: 0, totalPnL: 0, avgWin: 0, avgLoss: 0, avgRR: 0, profitFactor: 0, maxDrawdown: 0, bestTrade: 0, worstTrade: 0, avgTrade: 0, expectancy: 0, consecutiveWins: 0, consecutiveLosses: 0, currentStreak: 0, sharpeRatio: 0 };
    }
  }, [trades]);

  const discipline = useMemo(() => {
    try { return calculateDisciplineScore(trades, settings); } catch { return 85; }
  }, [trades, settings]);

  const dailyPnL = useMemo(() => {
    try { return getDailyPnL(trades) || []; } catch { return []; }
  }, [trades]);
  
  const uniqueTradingDays = useMemo(() => {
    try { return new Set(trades.map(t => t.date)).size; } catch { return 0; }
  }, [trades]);
  
  const is31DayChampion = uniqueTradingDays >= 31;

  useEffect(() => {
    if (is31DayChampion) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [is31DayChampion]);

  const completedDayGoals = useMemo(() => {
    try {
      return THIRTY_ONE_DAY_GOALS.filter(g => {
        try { return g.check(trades, goals, settings); } catch { return false; }
      });
    } catch { return []; }
  }, [trades, goals, settings]);

  const allBadgesList = useMemo(() => {
    const completedCount = completedDayGoals.length;
    const wins = trades.filter(t => t.isWin).length;
    const completedGoals = goals.filter(g => g.completed).length;
    const profitableDays = dailyPnL.filter(d => (d.pnl || 0) > 0).length;

    return [
      { name: 'First Trade', icon: '🎯', desc: 'Complete your first trade', earned: trades.length >= 1 },
      { name: '10 Trades Club', icon: '📊', desc: 'Complete 10 trades', earned: trades.length >= 10 },
      { name: '50 Trades Veteran', icon: '🏆', desc: 'Complete 50 trades', earned: trades.length >= 50 },
      { name: 'Week 1 Complete', icon: '📈', desc: 'Complete week 1 roadmap', earned: completedCount >= 7 },
      { name: '2 Weeks Strong', icon: '💪', desc: 'Complete 14 roadmap days', earned: completedCount >= 14 },
      { name: '3 Weeks Master', icon: '🏆', desc: 'Complete 21 roadmap days', earned: completedCount >= 21 },
      { name: '31-Day Champion', icon: '👑', desc: 'Complete all 31 days', earned: completedCount >= 31 },
      { name: '5 Wins Streak', icon: '🔥', desc: 'Achieve 5 winning trades', earned: wins >= 5 },
      { name: 'Goal Achiever', icon: '✅', desc: 'Complete a personal goal', earned: completedGoals >= 1 },
      { name: 'Consistency Pro', icon: '🎯', desc: '5 profitable trading days', earned: profitableDays >= 5 },
      { name: 'Profit Machine', icon: '🤖', desc: 'Profit factor 2.0 or higher', earned: stats.profitFactor >= 2 },
      { name: 'Risk Specialist', icon: '⚖️', desc: 'Average R:R 2.0 or higher', earned: stats.avgRR >= 2 },
      { name: 'Discipline Master', icon: '🛡️', desc: '80%+ discipline score', earned: discipline >= 80 },
      { name: '🏆 Supreme Legend', icon: '🌟', desc: 'Mastered the 31-Day Challenge', earned: is31DayChampion },
    ];
  }, [trades, completedDayGoals, goals, dailyPnL, stats, discipline, is31DayChampion]);

  const earnedBadges = useMemo(() => allBadgesList.filter(b => b.earned), [allBadgesList]);
  const filteredBadges = useMemo(() => {
    if (badgeFilter === 'earned') return allBadgesList.filter(b => b.earned);
    if (badgeFilter === 'locked') return allBadgesList.filter(b => !b.earned);
    return allBadgesList;
  }, [allBadgesList, badgeFilter]);

  const totalXP = useMemo(() => {
    try {
      let xp = 0;
      xp += Math.min(trades.length * 2, 200);
      xp += trades.filter(t => t.isWin).length * 3;
      xp += goals.filter(g => g.completed).length * 50;
      xp += completedDayGoals.reduce((sum, g) => sum + g.xpReward, 0);
      if (discipline >= 70) xp += 100;
      if (discipline >= 90) xp += 50;
      const profitableDays = dailyPnL.filter(d => (d.pnl || 0) > 0).length;
      if (profitableDays >= 10) xp += 50;
      if (profitableDays >= 20) xp += 100;
      if (uniqueTradingDays >= 31) xp += 200;
      return Math.min(xp, 10000);
    } catch { return 0; }
  }, [trades, goals, completedDayGoals, discipline, dailyPnL, uniqueTradingDays]);

  const currentLevel = useMemo(() => {
    try {
      let level = 1;
      for (const l of LEVELS) {
        if (totalXP >= l.minXp) level = l.level;
      }
      return level;
    } catch { return 1; }
  }, [totalXP]);

  const currentLevelData = LEVELS.find(l => l.level === currentLevel) || LEVELS[0];
  const nextLevelData = LEVELS.find(l => l.level === currentLevel + 1);
  const xpProgress = nextLevelData ? ((totalXP - currentLevelData.minXp) / (nextLevelData.minXp - currentLevelData.minXp)) * 100 : 100;

  const thirtyOneDayStats = useMemo(() => {
    try {
      const last31Days = dailyPnL.slice(-31);
      const totalPnl = last31Days.reduce((s, d) => s + (d.pnl || 0), 0);
      const winningDays = last31Days.filter(d => (d.pnl || 0) > 0).length;
      const losingDays = last31Days.filter(d => (d.pnl || 0) < 0).length;
      const totalTrades = last31Days.reduce((s, d) => s + (d.trades || 0), 0);
      const avgDailyPnl = last31Days.length > 0 ? totalPnl / last31Days.length : 0;
      return { totalPnl, winningDays, losingDays, totalTrades, avgDailyPnl, daysTracked: last31Days.length };
    } catch {
      return { totalPnl: 0, winningDays: 0, losingDays: 0, totalTrades: 0, avgDailyPnl: 0, daysTracked: 0 };
    }
  }, [dailyPnL]);

  const goalProgress = useMemo(() => {
    const completed = completedDayGoals.length;
    const total = THIRTY_ONE_DAY_GOALS.length;
    return { completed, total, percentage: (completed / total) * 100 };
  }, [completedDayGoals]);

  const currentGoal = useMemo(() => {
    try {
      for (const g of THIRTY_ONE_DAY_GOALS) {
        if (!g.check(trades, goals, settings)) return g;
      }
      return THIRTY_ONE_DAY_GOALS[THIRTY_ONE_DAY_GOALS.length - 1];
    } catch { return THIRTY_ONE_DAY_GOALS[0]; }
  }, [trades, goals, settings]);

  const categories = ['all', ...new Set(THIRTY_ONE_DAY_GOALS.map(g => g.category))];

  const addGoal = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newGoal: Goal = {
        id: uuidv4(),
        title: form.title,
        category: form.category,
        target: parseFloat(form.target) || 0,
        current: 0,
        unit: form.unit || '%',
        deadline: form.deadline,
        createdAt: new Date().toISOString(),
        completed: false,
        notes: form.notes
      };
      const updated = [newGoal, ...goals];
      setGoalsState(updated);
      saveGoals(updated);
      setForm({ title: '', category: 'Profit', target: '', unit: '', deadline: '', notes: '' });
      setShowForm(false);
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  };

  const applyTemplate = (template: typeof QUICK_TEMPLATES[0]) => {
    setForm({
      title: template.title,
      category: template.category,
      target: template.target,
      unit: template.unit,
      deadline: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      notes: template.desc
    });
    setShowForm(true);
  };

  const updateGoalProgress = (id: string, current: number) => {
    try {
      const updated = goals.map(g => {
        if (g.id === id) {
          const completed = current >= g.target;
          return { ...g, current, completed };
        }
        return g;
      });
      setGoalsState(updated);
      saveGoals(updated);
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const deleteGoal = (id: string) => {
    try {
      const updated = goals.filter(g => g.id !== id);
      setGoalsState(updated);
      saveGoals(updated);
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const toggleComplete = (id: string) => {
    try {
      const updated = goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g);
      setGoalsState(updated);
      saveGoals(updated);
    } catch (error) {
      console.error('Error toggling goal:', error);
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const CS = settings.currencySymbol || '$';

  // Get the current day's goal tip
  const currentDayTip = useMemo(() => {
    const current = THIRTY_ONE_DAY_GOALS.find(g => g.day === uniqueTradingDays + 1);
    return current?.tip || 'Keep logging trades to unlock the next milestone!';
  }, [uniqueTradingDays]);

  return (
    <div className="space-y-6 relative">
      <Confetti active={showConfetti} />

      {/* Detailed Goal Inspection Modal - Premium */}
      <AnimatePresence>
        {selectedGoalDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="glass-card max-w-lg w-full p-8 border-2 border-[rgba(0,212,255,0.3)] shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00d4ff] via-[#a855f7] to-[#ffdd00]" />
              <button 
                onClick={() => setSelectedGoalDetail(null)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-5 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[rgba(0,212,255,0.2)] to-[rgba(168,85,247,0.1)] flex items-center justify-center text-4xl border-2 border-[rgba(0,212,255,0.3)] shadow-[0_0_30px_rgba(0,212,255,0.1)]">
                  {selectedGoalDetail.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#00d4ff] tracking-wider">DAY {selectedGoalDetail.day} ROADMAP</span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                      selectedGoalDetail.category === 'expert' ? 'bg-[rgba(255,215,0,0.15)] text-[#ffd700] border-[rgba(255,215,0,0.3)]' :
                      selectedGoalDetail.category === 'advanced' ? 'bg-[rgba(168,85,247,0.15)] text-[#a855f7] border-[rgba(168,85,247,0.3)]' :
                      selectedGoalDetail.category === 'intermediate' ? 'bg-[rgba(0,212,255,0.15)] text-[#00d4ff] border-[rgba(0,212,255,0.3)]' :
                      'bg-[rgba(74,85,104,0.2)] text-gray-300 border-white/10'
                    }`}>
                      {selectedGoalDetail.category}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mt-1">{selectedGoalDetail.title}</h3>
                </div>
              </div>

              <div className="space-y-5 text-sm text-gray-300">
                <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">🎯 Requirement Overview</h4>
                  <p>{selectedGoalDetail.description}</p>
                  <div className="flex items-center gap-6 mt-3 pt-3 border-t border-white/10 text-xs">
                    <span>Target: <strong className="text-white font-bold">{selectedGoalDetail.target}</strong></span>
                    <span className="text-[#ffdd00] font-bold flex items-center gap-1">
                      <Zap size={14} className="text-[#ffdd00]" /> +{selectedGoalDetail.xpReward} XP
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-[rgba(0,255,136,0.08)] to-[rgba(0,212,255,0.05)] border border-[rgba(0,255,136,0.2)] flex gap-3">
                  <Lightbulb className="text-[#00ff88] flex-shrink-0 mt-0.5" size={22} />
                  <div>
                    <h4 className="text-xs font-bold text-[#00ff88] uppercase tracking-wider mb-1">💡 Pro Trading Tip</h4>
                    <p className="text-xs text-gray-300 leading-relaxed">{selectedGoalDetail.tip}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">Status:</span>
                    {selectedGoalDetail.check(trades, goals, settings) ? (
                      <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#00ff88]/20 to-[#00d4ff]/20 text-[#00ff88] text-xs font-bold flex items-center gap-1.5 border border-[rgba(0,255,136,0.3)]">
                        <CheckCircle2 size={14} /> COMPLETED
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30 flex items-center gap-1.5">
                        <Activity size={14} /> IN PROGRESS
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => setSelectedGoalDetail(null)}
                    className="cyber-button text-xs py-2 px-4"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* XP & Level Card - Premium */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="glass-card p-6 md:p-8 neon-border-animated relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(13,17,23,0.9), rgba(20,30,50,0.8))',
          border: '1px solid rgba(0,255,136,0.15)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(255,221,0,0.05)] via-[rgba(168,85,247,0.03)] to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[rgba(0,255,136,0.03)] rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-6 flex-wrap relative z-10">
          <motion.div 
            animate={currentLevel >= 5 ? { 
              scale: [1, 1.05, 1], 
              rotate: [0, 3, -3, 0],
              transition: { duration: 3, repeat: Infinity }
            } : {}}
            className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#ffdd00] via-[#ffaa00] to-[#ff8800] flex items-center justify-center flex-col shadow-[0_0_40px_rgba(255,221,0,0.25)] border-2 border-white/30 text-black flex-shrink-0 relative"
          >
            <span className="text-3xl font-extrabold tracking-tight">{currentLevel}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-black/80 mt-0.5">LEVEL</span>
            {currentLevel >= 5 && (
              <motion.div 
                className="absolute -top-2 -right-2 text-lg"
                animate={{ scale: [1, 1.3, 1], rotate: [0, 20, -20, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ⭐
              </motion.div>
            )}
          </motion.div>
          
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-[#ffdd00] tracking-tight">{currentLevelData.title}</h2>
              <span className="text-2xl filter drop-shadow">{currentLevelData.icon}</span>
              {is31DayChampion && (
                <motion.span 
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="px-3 py-1 rounded-full bg-gradient-to-r from-[rgba(255,221,0,0.2)] to-[rgba(255,215,0,0.1)] border border-[rgba(255,221,0,0.4)] text-[10px] font-extrabold text-[#ffdd00] tracking-wider shadow-[0_0_20px_rgba(255,221,0,0.2)]"
                >
                  🏆 31-DAY ELITE CHAMPION
                </motion.span>
              )}
            </div>
            
            <p className="text-xs text-gray-300 mt-1">
              Your trading discipline and consistency directly feed your rank. Master your emotions to climb to Trading God status.
            </p>
            
            <div className="progress-bar mt-3.5 h-3 overflow-hidden rounded-full bg-black/60 border border-white/10 shadow-inner">
              <motion.div 
                className="progress-fill h-full bg-gradient-to-r from-[#ffdd00] via-[#00ff88] to-[#00d4ff] shadow-[0_0_15px_rgba(255,221,0,0.3)]" 
                style={{ width: `${Math.min(100, xpProgress)}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, xpProgress)}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            </div>
            
            <div className="flex justify-between text-xs text-gray-400 mt-1.5 font-medium">
              <span className="flex items-center gap-1.5 text-gray-200">
                <Zap size={13} className="text-[#ffdd00] fill-[#ffdd00]" /> 
                <strong className="text-white font-bold">{totalXP.toLocaleString()}</strong> XP Total
              </span>
              <span>{nextLevelData ? `${(nextLevelData.minXp - totalXP).toLocaleString()} XP to ${nextLevelData.title}` : '🌟 MAX RANK ACHIEVED'}</span>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-black/40 p-4 rounded-2xl border border-white/10 flex-shrink-0 w-full md:w-auto justify-around md:justify-start shadow-inner">
            <div className="text-center px-2">
              <motion.div 
                animate={completedDayGoals.length > 0 ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5 }}
                className="text-3xl font-bold text-[#00ff88]"
              >
                {completedDayGoals.length}
              </motion.div>
              <div className="text-[11px] text-gray-400 uppercase font-medium mt-0.5">Roadmap Days</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center px-2">
              <div className="text-3xl font-bold text-[#ffdd00]">{earnedBadges.length}</div>
              <div className="text-[11px] text-gray-400 uppercase font-medium mt-0.5">Earned Badges</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center px-2">
              <div className="text-3xl font-bold text-[#00d4ff]">{goals.filter(g => g.completed).length}</div>
              <div className="text-[11px] text-gray-400 uppercase font-medium mt-0.5">Goals Hit</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Daily Tip Banner - Premium */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 border border-[rgba(0,255,136,0.15)] bg-gradient-to-r from-[rgba(0,255,136,0.05)] to-[rgba(0,212,255,0.05)]"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[rgba(0,255,136,0.2)] to-[rgba(0,212,255,0.1)] flex items-center justify-center text-xl border border-[rgba(0,255,136,0.2)] shadow-[0_0_20px_rgba(0,255,136,0.05)]">
            💡
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#00ff88] uppercase tracking-wider">Daily Wisdom</span>
              <span className="text-[10px] text-gray-500">Day {uniqueTradingDays + 1} of 31</span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{currentDayTip}</p>
          </div>
          <div className="hidden md:block text-2xl opacity-10">✨</div>
        </div>
      </motion.div>

      {/* Tab Navigation - Premium */}
      <div className="flex gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
        {[
          { id: 'roadmap', label: '📅 31-Day Roadmap' },
          { id: 'goals', label: '🎯 Custom Goals' },
          { id: 'badges', label: '🏅 Achievements' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-[rgba(0,255,136,0.15)] to-[rgba(0,212,255,0.1)] text-[#00ff88] border border-[rgba(0,255,136,0.2)] shadow-[0_0_20px_rgba(0,255,136,0.05)]'
                : 'text-gray-400 hover:text-white bg-transparent border border-transparent hover:border-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'roadmap' && (
        <>
          {/* 31-Day Goal Roadmap - Premium */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="glass-card p-6 border border-[rgba(0,212,255,0.2)] shadow-xl"
          >
            <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
              <div>
                <h3 className="text-base font-bold text-[#00d4ff] uppercase tracking-wider flex items-center gap-2.5">
                  <Calendar size={19} className="text-[#00d4ff]" /> 31-Day Goal Roadmap
                  <span className="text-xs text-gray-400 ml-1 font-normal">({goalProgress.completed} of {goalProgress.total} Days Completed)</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Follow this structured 31-day progressive challenge to transform your retail trading into institutional consistency.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-[rgba(0,212,255,0.15)] to-[rgba(168,85,247,0.1)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] font-bold shadow-[0_0_15px_rgba(0,212,255,0.05)]">
                  {Math.round(goalProgress.percentage)}% COMPLETE
                </div>
                <button 
                  onClick={() => setExpandedGoals(!expandedGoals)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-medium border border-transparent hover:border-white/10"
                >
                  {expandedGoals ? (
                    <>Hide Roadmap <ChevronDown size={16} /></>
                  ) : (
                    <>Show Roadmap <ChevronRight size={16} /></>
                  )}
                </button>
              </div>
            </div>

            {/* Progress Bar with Milestone Markers - Premium */}
            <div className="relative progress-bar mb-6 h-6 rounded-full bg-black/60 border border-white/10 overflow-visible px-3 shadow-inner">
              <motion.div 
                className="absolute left-0 top-0 bottom-0 progress-fill bg-gradient-to-r from-[#00d4ff] via-[#a855f7] to-[#ffdd00] rounded-full shadow-[0_0_20px_rgba(0,212,255,0.2)]" 
                style={{ width: `${goalProgress.percentage}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${goalProgress.percentage}%` }}
                transition={{ duration: 1.8, ease: 'easeOut' }}
              />
              
              {/* Milestone markers */}
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none z-10">
                {THIRTY_ONE_DAY_GOALS.map((g, i) => {
                  let isCompleted = false;
                  try { isCompleted = g.check(trades, goals, settings); } catch { isCompleted = false; }
                  const isCurrent = !isCompleted && g === currentGoal;
                  
                  if (i === 0 || (i + 1) % 5 === 0 || i === THIRTY_ONE_DAY_GOALS.length - 1 || isCurrent) {
                    return (
                      <div
                        key={g.day}
                        className={`w-4 h-4 rounded-full border-2 transition-all pointer-events-auto cursor-pointer flex items-center justify-center ${
                          isCompleted
                            ? 'bg-[#00ff88] border-black shadow-[0_0_20px_rgba(0,255,136,0.8)]'
                            : isCurrent
                            ? 'bg-[#00d4ff] border-white shadow-[0_0_20px_rgba(0,212,255,0.9)] animate-pulse' 
                            : 'bg-gray-700 border-black'
                        }`}
                        onClick={() => setSelectedGoalDetail(g)}
                        title={`Day ${g.day}: ${g.title}`}
                      >
                        <span className="absolute -top-7 text-[9px] font-bold text-gray-400 bg-black/80 px-1.5 py-0.5 rounded border border-white/10 hidden md:block">
                          D{g.day}
                        </span>
                      </div>
                    );
                  }
                  return <div key={g.day} className="w-1.5 h-1.5 bg-white/20 rounded-full" />;
                })}
              </div>
            </div>

            {/* Category Filter - Premium */}
            <div className="flex gap-2 mb-4 flex-wrap items-center bg-black/30 p-2 rounded-xl border border-white/5">
              <span className="text-xs font-bold text-gray-400 px-2 flex items-center gap-1">
                <Info size={14} className="text-[#00d4ff]" /> Filter Stage:
              </span>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedCategory === cat
                      ? 'bg-gradient-to-r from-[rgba(0,255,136,0.15)] to-[rgba(0,212,255,0.05)] text-[#00ff88] border border-[rgba(0,255,136,0.3)] shadow-[0_0_10px_rgba(0,255,136,0.1)]'
                      : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  {cat === 'all' ? 'All 31 Days' : getCategoryLabel(cat)}
                </button>
              ))}
            </div>

            <AnimatePresence>
              {expandedGoals && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-hidden"
                >
                  {THIRTY_ONE_DAY_GOALS
                    .filter(g => selectedCategory === 'all' || g.category === selectedCategory)
                    .map((goal, index) => {
                      const isCompleted = goal.check(trades, goals, settings);
                      const isActive = !isCompleted && goal === currentGoal;
                      const isFinal = goal.isFinal || false;
                      
                      return (
                        <DayGoalCard
                          key={goal.day}
                          goal={goal}
                          isCompleted={isCompleted}
                          isActive={isActive}
                          index={index}
                          isFinal={isFinal}
                          onClick={() => setSelectedGoalDetail(goal)}
                        />
                      );
                    })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* 31-Day Stats - Premium */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="glass-card p-6 border border-[rgba(0,212,255,0.15)] shadow-lg"
          >
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-sm font-bold text-[#00d4ff] uppercase tracking-wider flex items-center gap-2">
                <BarChart size={16} /> 31-Day Performance Snapshot
              </h3>
              <span className="text-xs text-gray-400">Based on your logged trade history</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
              {[
                { label: 'Days Tracked', value: `${thirtyOneDayStats.daysTracked} / 31`, color: '#ffffff', icon: <Clock size={14} className="text-[#00d4ff]" /> },
                { label: 'Total P&L', value: `${thirtyOneDayStats.totalPnl >= 0 ? '+' : ''}${formatCurrency(thirtyOneDayStats.totalPnl, CS)}`, color: thirtyOneDayStats.totalPnl >= 0 ? '#00ff88' : '#ff3366', icon: <Coins size={14} className={thirtyOneDayStats.totalPnl >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'} /> },
                { label: 'Winning Days', value: thirtyOneDayStats.winningDays, color: '#00ff88', icon: <TrendingUp size={14} className="text-[#00ff88]" /> },
                { label: 'Losing Days', value: thirtyOneDayStats.losingDays, color: '#ff3366', icon: <TrendingDown size={14} className="text-[#ff3366]" /> },
                { label: 'Avg Daily P&L', value: `${thirtyOneDayStats.avgDailyPnl >= 0 ? '+' : ''}${formatCurrency(thirtyOneDayStats.avgDailyPnl, CS)}`, color: thirtyOneDayStats.avgDailyPnl >= 0 ? '#00ff88' : '#ff3366', icon: <Activity size={14} className="text-[#00d4ff]" /> },
              ].map((item, i) => (
                <motion.div 
                  key={item.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.04, y: -3 }}
                  className="p-4 rounded-xl bg-gradient-to-br from-black/40 to-black/20 border border-white/5 text-center cursor-pointer transition-all shadow-inner hover:border-white/20"
                >
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-wider">{item.icon} {item.label}</div>
                  <div className="text-xl font-extrabold mt-2 tracking-tight" style={{ color: item.color as string }}>{item.value}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}

      {activeTab === 'goals' && (
        <div className="space-y-4">
          {/* Goals Section Header - Premium */}
          <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Target size={20} className="text-[#00ff88]" /> Custom Trading Goals & Objectives
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Set specific targets for win rate, max drawdown, or profit milestones.</p>
            </div>
            <button 
              onClick={() => setShowForm(!showForm)} 
              className="cyber-button flex items-center gap-2 text-xs py-2.5 px-4 shadow-[0_0_20px_rgba(0,255,136,0.05)]"
            >
              <Plus size={16} /> {showForm ? 'Close Form' : 'Add Custom Goal'}
            </button>
          </div>

          {/* Quick Templates Suggestions - Premium */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {QUICK_TEMPLATES.map((tpl) => (
              <motion.div 
                key={tpl.title}
                whileHover={{ scale: 1.03, y: -3, borderColor: 'rgba(0,255,136,0.5)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => applyTemplate(tpl)}
                className="p-4 rounded-xl bg-gradient-to-br from-[rgba(18,26,41,0.8)] to-black/40 border border-white/10 cursor-pointer transition-all flex flex-col justify-between group shadow-lg hover:shadow-[0_0_30px_rgba(0,255,136,0.05)]"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-gray-300 font-bold uppercase border border-white/5">
                      {tpl.icon} {tpl.category}
                    </span>
                    <span className="text-[#00ff88] group-hover:underline font-semibold flex items-center gap-1 text-xs">
                      + Quick Add <ChevronRight size={12} />
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mt-2.5 group-hover:text-[#00ff88] transition-colors">{tpl.title}</h4>
                  <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{tpl.desc}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-white/5 text-[11px] text-gray-400 font-medium flex items-center justify-between">
                  <span>Target: <strong className="text-white">{tpl.target} {tpl.unit}</strong></span>
                  <span className="text-[9px] text-[#ffdd00]">⚡ Quick Setup</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Goal Form - Premium */}
          {showForm && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              onSubmit={addGoal} 
              className="glass-card p-6 space-y-4 border-2 border-[rgba(0,255,136,0.3)] shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00ff88] via-[#00d4ff] to-[#a855f7]" />
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h4 className="text-sm font-bold text-[#00ff88] uppercase tracking-wider flex items-center gap-2">
                  <Plus size={16} /> Create New Trading Objective
                </h4>
                <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-gray-300 uppercase mb-1.5 block">Goal Title</label>
                  <input className="cyber-input" placeholder="e.g. Achieve 65% Win Rate in Forex pairs" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-300 uppercase mb-1.5 block">Category</label>
                  <select className="cyber-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-300 uppercase mb-1.5 block">Target Value</label>
                  <input className="cyber-input" type="number" step="any" placeholder="e.g. 65" value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} required />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-300 uppercase mb-1.5 block">Unit (e.g. %, $, PF, Trades)</label>
                  <input className="cyber-input" placeholder="e.g. %" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-300 uppercase mb-1.5 block">Target Deadline</label>
                  <input className="cyber-input" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
                </div>
                <div className="md:col-span-3">
                  <label className="text-[11px] font-bold text-gray-300 uppercase mb-1.5 block">Personal Strategy / Notes</label>
                  <input className="cyber-input" placeholder="e.g. Focus strictly on 15m timeframe breakouts during NY session." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="cyber-button-secondary py-2 px-4 text-xs">Cancel</button>
                <button type="submit" className="cyber-button py-2 px-6 text-xs shadow-[0_0_20px_rgba(0,255,136,0.1)]">Save Objective</button>
              </div>
            </motion.form>
          )}

          {/* Goals List - Premium */}
          <div className="space-y-3.5">
            {goals.length > 0 ? goals.map((g, i) => (
              <motion.div 
                key={g.id} 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: i * 0.03 }} 
                className={`glass-card p-5 transition-all border-2 ${
                  g.completed 
                    ? 'border-[rgba(0,255,136,0.35)] bg-gradient-to-r from-[rgba(18,26,41,0.9)] to-[rgba(0,255,136,0.05)] shadow-[0_4px_25px_rgba(0,255,136,0.08)]' 
                    : 'border-white/10 hover:border-white/20 bg-gradient-to-r from-[rgba(18,26,41,0.6)] to-black/30'
                }`}
              >
                <div className="flex items-center gap-4 flex-wrap">
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleComplete(g.id)} 
                    title={g.completed ? 'Mark incomplete' : 'Mark complete'}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all shadow-inner ${
                      g.completed 
                        ? 'bg-gradient-to-br from-[rgba(0,255,136,0.25)] to-[rgba(0,212,255,0.1)] text-[#00ff88] border-2 border-[#00ff88]/40 shadow-[0_0_20px_rgba(0,255,136,0.1)]' 
                        : 'bg-black/50 text-gray-500 hover:text-[#00ff88] border-2 border-white/10 hover:border-[#00ff88]/30'
                    }`}
                  >
                    <CheckCircle2 size={20} />
                  </motion.button>
                  
                  <div className="flex-1 min-w-[200px]">
                    <div className={`text-base font-bold ${g.completed ? 'text-[#00ff88] line-through decoration-white/30' : 'text-gray-100'}`}>{g.title}</div>
                    {g.notes && <div className="text-xs text-gray-400 mt-1 italic line-clamp-1 flex items-center gap-1"><Lightbulb size={12} className="text-[#ffdd00]" /> {g.notes}</div>}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[rgba(168,85,247,0.15)] text-[#a855f7] border border-[#a855f7]/30 font-bold uppercase tracking-wider">
                        {g.category}
                      </span>
                      {g.deadline && (
                        <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                          <Calendar size={12} /> Due: {g.deadline}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-500">Created: {new Date(g.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/5 shadow-inner">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-500 uppercase font-bold px-1">Current</span>
                        <input 
                          type="number" 
                          step="any" 
                          className="cyber-input w-24 text-center py-1.5 text-sm font-bold bg-black/60 border-white/10 text-white" 
                          value={g.current} 
                          onChange={e => updateGoalProgress(g.id, parseFloat(e.target.value) || 0)} 
                        />
                      </div>
                      <span className="text-sm text-gray-500 font-bold pt-4">/</span>
                      <div className="flex flex-col pr-2">
                        <span className="text-[9px] text-gray-500 uppercase font-bold">Target</span>
                        <span className="text-sm font-extrabold text-gray-200 pt-1.5">{g.target} {g.unit}</span>
                      </div>
                    </div>

                    <div className="w-20 text-right">
                      <span className="text-[9px] text-gray-500 uppercase font-bold block">Progress</span>
                      <div className="text-lg font-extrabold tracking-tight" style={{ color: g.current >= g.target ? '#00ff88' : '#ffdd00' }}>
                        {g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0}%
                      </div>
                    </div>

                    <button 
                      onClick={() => deleteGoal(g.id)} 
                      title="Delete Goal"
                      className="p-2 text-gray-500 hover:text-[#ff3366] hover:bg-[#ff3366]/10 rounded-xl transition-colors ml-1"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="progress-bar mt-4 h-2 bg-black/50 border border-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    className="progress-fill h-full rounded-full" 
                    style={{ 
                      width: `${Math.min(100, g.target > 0 ? (g.current / g.target) * 100 : 0)}%`, 
                      background: g.completed 
                        ? 'linear-gradient(90deg, #00ff88, #00d4ff)' 
                        : 'linear-gradient(90deg, #00d4ff, #a855f7, #ffdd00)',
                      boxShadow: g.completed ? '0 0 15px rgba(0,255,136,0.3)' : '0 0 10px rgba(0,212,255,0.1)'
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, g.target > 0 ? (g.current / g.target) * 100 : 0)}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </motion.div>
            )) : (
              <div className="glass-card p-16 text-center text-gray-400 text-sm border border-white/5 bg-gradient-to-b from-[rgba(18,26,41,0.6)] to-black/30">
                <Target size={48} className="mx-auto mb-4 text-gray-600 opacity-50" />
                <p className="font-bold text-gray-300 text-lg">No active trading goals set.</p>
                <p className="text-xs text-gray-500 mt-2 mb-4">Select a Quick Template above or click "Add Custom Goal" to start tracking your trading targets.</p>
                <button onClick={() => setShowForm(true)} className="cyber-button text-xs py-2.5 px-6 shadow-[0_0_20px_rgba(0,255,136,0.05)]">Create First Goal</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'badges' && (
        /* Achievement Badges with Filter - Premium */
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 border border-white/10 shadow-xl bg-gradient-to-b from-[rgba(18,26,41,0.8)] to-black/30">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Award size={18} className="text-[#ffdd00]" /> Trading Milestones & Achievement Badges
                <span className="text-xs text-[#00ff88] ml-2 font-bold shadow-[0_0_10px_rgba(0,255,136,0.1)] px-2 py-0.5 rounded-full bg-[rgba(0,255,136,0.05)]">
                  {earnedBadges.length} Earned
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">Collect elite achievements as you maintain consistency and level up your discipline score.</p>
            </div>

            <div className="flex gap-1 bg-black/30 p-1.5 rounded-xl border border-white/5 shadow-inner">
              {(['all', 'earned', 'locked'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setBadgeFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                    badgeFilter === filter
                      ? 'bg-gradient-to-r from-[rgba(0,212,255,0.15)] to-[rgba(168,85,247,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.3)] shadow-[0_0_15px_rgba(0,212,255,0.05)]'
                      : 'text-gray-400 hover:text-white bg-transparent border border-transparent'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {filteredBadges.map((b) => (
              <BadgeCard key={b.name} badge={b} earned={b.earned} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick Stats Summary Footer - Premium */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Goals Active', value: goals.length, icon: <Target size={18} className="text-[#00d4ff]" />, color: '#00d4ff' },
          { label: 'Goals Completed', value: goals.filter(g => g.completed).length, icon: <CheckCircle2 size={18} className="text-[#00ff88]" />, color: '#00ff88' },
          { label: 'Badges Earned', value: earnedBadges.length, icon: <Star size={18} className="text-[#ffdd00]" />, color: '#ffdd00' },
          { label: 'Trading Level', value: currentLevel, icon: <TrendingUp size={18} className="text-[#a855f7]" />, color: '#a855f7' },
        ].map((s, i) => (
          <motion.div 
            key={s.label} 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.05 }} 
            whileHover={{ scale: 1.04, y: -3 }}
            className="glass-card p-5 text-center cursor-pointer transition-all border border-white/5 shadow-inner bg-gradient-to-b from-[rgba(18,26,41,0.6)] to-black/30"
          >
            <div className="flex justify-center mb-2">{s.icon}</div>
            <div className="text-2xl font-extrabold tracking-tight" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}