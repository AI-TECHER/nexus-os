import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trade, AppSettings } from '../types';
import {
  getTradeStats, generateAIInsights, getStrategyPerformance,
  getEmotionStats, calculateDisciplineScore, calculateEmotionalScore, getDailyPnL
} from '../store';
import {
  Brain, Zap, AlertTriangle, TrendingUp, Target, Shield,
  Award, Activity, Eye, Star, Lightbulb
} from 'lucide-react';
import { safeFormatCurrency, getCurrencySymbol, parseCurrencyValue } from '../utils/currency';

interface AIIntelligenceProps {
  trades: Trade[];
  settings: AppSettings;
}

export default function AIIntelligence({ trades, settings }: AIIntelligenceProps) {
  const [activeTab, setActiveTab] = useState<'insights' | 'habits' | 'prediction' | 'rating' | 'dna'>('insights');
  const stats = getTradeStats(trades);
  const insights = generateAIInsights(trades);
  const strategies = getStrategyPerformance(trades);
  const emotions = getEmotionStats(trades);
  const discipline = calculateDisciplineScore(trades, settings);
  const emotional = calculateEmotionalScore(trades);
  const dailyPnL = getDailyPnL(trades);

  // Get currency symbol
  const CS = getCurrencySymbol(settings);

  // Habit detection
  const habits = useMemo(() => {
    const detected: { label: string; type: 'good' | 'bad' | 'neutral'; detail: string }[] = [];
    if (trades.length < 3) return [{ label: 'Insufficient Data', type: 'neutral' as const, detail: 'Add more trades for habit analysis.' }];

    const today = new Date().toISOString().split('T')[0];
    const todayTrades = trades.filter(t => t.date === today);

    if (todayTrades.length > settings.dailyTradeLimit) detected.push({ label: 'Overtrading', type: 'bad', detail: `You exceeded your daily limit ${todayTrades.length}/${settings.dailyTradeLimit} today.` });
    const avgSize = trades.reduce((s, t) => s + t.amount, 0) / trades.length;
    const recentAvg = trades.slice(0, 5).reduce((s, t) => s + t.amount, 0) / Math.min(5, trades.length);
    if (recentAvg > avgSize * 1.5 && trades.length > 5) detected.push({ label: 'Increasing Position Sizes', type: 'bad', detail: 'Recent trades have larger positions than average. Be cautious.' });
    const noSL = trades.slice(0, 10).filter(t => t.stopLoss === 0);
    if (noSL.length >= 3) detected.push({ label: 'Missing Stop Losses', type: 'bad', detail: `${noSL.length}/10 recent trades without stop loss.` });
    const negEmotions = trades.slice(0, 10).filter(t => ['angry', 'frustrated', 'revenge', 'fomo'].includes(t.emotionBefore.toLowerCase()));
    if (negEmotions.length >= 3) detected.push({ label: 'Emotional Trading Pattern', type: 'bad', detail: `${negEmotions.length}/10 recent trades with negative emotions.` });
    if (stats.avgRR >= 2) detected.push({ label: 'Good Risk:Reward', type: 'good', detail: `Average R:R of ${stats.avgRR} shows disciplined target setting.` });
    if (discipline >= 80) detected.push({ label: 'High Discipline', type: 'good', detail: 'Maintaining strong trading discipline.' });
    if (stats.winRate >= 55 && trades.length >= 10) detected.push({ label: 'Consistent Winners', type: 'good', detail: `Win rate of ${stats.winRate}% across ${stats.totalTrades} trades.` });
    const strategies_used = new Set(trades.slice(0, 20).map(t => t.strategy).filter(Boolean));
    if (strategies_used.size <= 2 && strategies_used.size > 0) detected.push({ label: 'Strategy Consistency', type: 'good', detail: 'Sticking to 1-2 strategies shows focus.' });
    if (strategies_used.size > 5) detected.push({ label: 'Strategy Hopping', type: 'bad', detail: `Using ${strategies_used.size} different strategies. Focus on fewer.` });

    return detected.length > 0 ? detected : [{ label: 'No Patterns Detected', type: 'neutral' as const, detail: 'Continue trading to build pattern data.' }];
  }, [trades, settings, stats, discipline]);

  // Trade rating system
  const tradeRatings = useMemo(() => {
    return trades.slice(0, 10).map(t => {
      let score = 50;
      if (t.stopLoss > 0) score += 10;
      if (t.takeProfit > 0) score += 5;
      if (t.riskRewardRatio >= 2) score += 15;
      else if (t.riskRewardRatio >= 1) score += 5;
      if (t.riskPercent <= settings.maxRiskPerTrade) score += 10;
      if (t.strategy) score += 5;
      if (!['angry', 'frustrated', 'revenge', 'fomo', 'greedy'].includes(t.emotionBefore.toLowerCase())) score += 10;
      if (t.mistakeCategory === 'None' || !t.mistakeCategory) score += 10;
      if (t.notes) score += 5;
      if (t.isWin) score += 5; else score -= 5;
      return { trade: t, score: Math.max(0, Math.min(100, score)) };
    });
  }, [trades, settings]);

  // Trading DNA profile
  const dna = useMemo(() => {
    if (trades.length < 5) return null;
    const bestStrat = strategies.length > 0 ? strategies.sort((a, b) => b.pnl - a.pnl)[0] : null;
    const bestEmotion = emotions.length > 0 ? emotions.sort((a, b) => b.avgPnl - a.avgPnl)[0] : null;
    const avgDailyTrades = dailyPnL.length > 0 ? Math.round(trades.length / dailyPnL.length * 10) / 10 : 0;

    return {
      traderType: stats.winRate >= 60 ? 'Sniper' : stats.totalTrades > 100 ? 'Scalper' : avgDailyTrades > 3 ? 'Active' : 'Selective',
      bestStrategy: bestStrat?.strategy || 'Unknown',
      optimalEmotion: bestEmotion?.emotion || 'Unknown',
      riskProfile: stats.avgRR >= 2 ? 'Conservative' : stats.avgRR >= 1 ? 'Moderate' : 'Aggressive',
      avgDailyTrades,
      maturityScore: Math.min(100, Math.round(discipline * 0.4 + emotional * 0.3 + Math.min(100, trades.length) * 0.3)),
      survivalScore: Math.min(100, Math.round(
        (stats.profitFactor >= 1 ? 30 : 0) +
        (discipline >= 60 ? 25 : discipline >= 40 ? 15 : 0) +
        (stats.maxDrawdown < settings.accountBalance * 0.2 ? 25 : stats.maxDrawdown < settings.accountBalance * 0.4 ? 15 : 0) +
        (emotional >= 50 ? 20 : 10)
      )),
    };
  }, [trades, strategies, emotions, stats, discipline, emotional, dailyPnL, settings]);

  // Future prediction
  const prediction = useMemo(() => {
    if (trades.length < 5) return null;
    const avgDailyPnL = dailyPnL.length > 0 ? dailyPnL.reduce((s, d) => s + d.pnl, 0) / dailyPnL.length : 0;
    return {
      weekly: Math.round(avgDailyPnL * 5 * 100) / 100,
      monthly: Math.round(avgDailyPnL * 22 * 100) / 100,
      yearly: Math.round(avgDailyPnL * 252 * 100) / 100,
      riskOfRuin: stats.winRate < 40 && stats.profitFactor < 1 ? 'HIGH' : stats.winRate < 50 ? 'MODERATE' : 'LOW',
      sustainabilityScore: Math.min(100, Math.round(
        (stats.profitFactor >= 1.5 ? 40 : stats.profitFactor >= 1 ? 20 : 0) +
        (discipline >= 70 ? 30 : discipline >= 50 ? 15 : 0) +
        (emotional >= 60 ? 30 : emotional >= 40 ? 15 : 0)
      )),
    };
  }, [trades, dailyPnL, stats, discipline, emotional]);

  // Format currency values for display
  const formatDisplayCurrency = (value: number) => {
    return safeFormatCurrency(value, CS);
  };

  const tabs = [
    { id: 'insights' as const, label: 'AI Insights', icon: <Lightbulb size={14} /> },
    { id: 'habits' as const, label: 'Habit Tracker', icon: <Eye size={14} /> },
    { id: 'prediction' as const, label: 'Predictions', icon: <TrendingUp size={14} /> },
    { id: 'rating' as const, label: 'Trade Rating', icon: <Star size={14} /> },
    { id: 'dna' as const, label: 'Trading DNA', icon: <Zap size={14} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 neon-border-animated">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#a855f7] to-[#00d4ff] flex items-center justify-center">
            <Brain size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#00d4ff]">NEXUS AI Intelligence Engine</h2>
            <p className="text-xs text-gray-400 mt-1">Real-time analysis of your trading patterns, habits, and performance</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-[rgba(0,255,136,0.1)] text-[#00ff88] border border-[rgba(0,255,136,0.3)]' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {activeTab === 'insights' && (
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-4 text-sm text-gray-300 leading-relaxed">
                {insight}
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'habits' && (
          <div className="space-y-3">
            {habits.map((h, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className={`glass-card p-4 border-l-4 ${h.type === 'good' ? 'border-l-[#00ff88]' : h.type === 'bad' ? 'border-l-[#ff3366]' : 'border-l-[#ffdd00]'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {h.type === 'good' ? <Award size={14} className="text-[#00ff88]" /> : h.type === 'bad' ? <AlertTriangle size={14} className="text-[#ff3366]" /> : <Activity size={14} className="text-[#ffdd00]" />}
                  <span className={`text-sm font-bold ${h.type === 'good' ? 'text-[#00ff88]' : h.type === 'bad' ? 'text-[#ff3366]' : 'text-[#ffdd00]'}`}>{h.label}</span>
                </div>
                <p className="text-xs text-gray-400">{h.detail}</p>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'prediction' && (
          <div className="space-y-4">
            {prediction ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Weekly Projection', value: formatDisplayCurrency(prediction.weekly), color: prediction.weekly >= 0 ? '#00ff88' : '#ff3366' },
                    { label: 'Monthly Projection', value: formatDisplayCurrency(prediction.monthly), color: prediction.monthly >= 0 ? '#00ff88' : '#ff3366' },
                    { label: 'Yearly Projection', value: formatDisplayCurrency(prediction.yearly), color: prediction.yearly >= 0 ? '#00ff88' : '#ff3366' },
                  ].map(p => (
                    <div key={p.label} className="glass-card p-5 text-center">
                      <div className="text-[10px] text-gray-500 uppercase mb-2">{p.label}</div>
                      <div className="text-2xl font-bold" style={{ color: p.color }}>{p.value}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-card p-5 text-center">
                    <div className="text-[10px] text-gray-500 uppercase mb-2">Risk of Ruin</div>
                    <div className={`text-xl font-bold ${prediction.riskOfRuin === 'HIGH' ? 'text-[#ff3366]' : prediction.riskOfRuin === 'MODERATE' ? 'text-[#ffdd00]' : 'text-[#00ff88]'}`}>
                      {prediction.riskOfRuin}
                    </div>
                  </div>
                  <div className="glass-card p-5 text-center">
                    <div className="text-[10px] text-gray-500 uppercase mb-2">Sustainability</div>
                    <div className="text-xl font-bold text-[#00d4ff]">{prediction.sustainabilityScore}%</div>
                  </div>
                </div>
                <div className="glass-card p-4 text-xs text-gray-500">
                  ⚠️ Projections are based on current average performance and assume consistent trading behavior. Past performance does not guarantee future results.
                </div>
              </>
            ) : (
              <div className="glass-card p-8 text-center text-gray-500">Need at least 5 trades for predictions.</div>
            )}
          </div>
        )}

        {activeTab === 'rating' && (
          <div className="space-y-3">
            {tradeRatings.length > 0 ? tradeRatings.map(({ trade, score }, i) => {
              const formattedPnl = formatDisplayCurrency(trade.profitLoss);
              return (
                <motion.div key={trade.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="glass-card p-4 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold ${score >= 80 ? 'bg-[rgba(0,255,136,0.15)] text-[#00ff88]' : score >= 60 ? 'bg-[rgba(0,212,255,0.15)] text-[#00d4ff]' : score >= 40 ? 'bg-[rgba(255,221,0,0.15)] text-[#ffdd00]' : 'bg-[rgba(255,51,102,0.15)] text-[#ff3366]'}`}>
                    {score}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200">{trade.asset}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${trade.direction === 'buy' ? 'bg-[rgba(0,255,136,0.1)] text-[#00ff88]' : 'bg-[rgba(255,51,102,0.1)] text-[#ff3366]'}`}>{trade.direction}</span>
                      <span className="text-[10px] text-gray-500">{trade.date}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                      <span>P/L: <span style={{ color: trade.profitLoss >= 0 ? '#00ff88' : '#ff3366' }}>{formattedPnl}</span></span>
                      <span>R:R: {trade.riskRewardRatio}</span>
                      <span>Strategy: {trade.strategy || '—'}</span>
                      <span>Emotion: {trade.emotionBefore}</span>
                    </div>
                  </div>
                  <div className="flex">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} size={12} className={j < Math.round(score / 20) ? 'text-[#ffdd00] fill-[#ffdd00]' : 'text-gray-700'} />
                    ))}
                  </div>
                </motion.div>
              );
            }) : (
              <div className="glass-card p-8 text-center text-gray-500">No trades to rate.</div>
            )}
          </div>
        )}

        {activeTab === 'dna' && (
          <div>
            {dna ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card p-6 neon-border-animated">
                  <h3 className="text-sm font-bold text-[#a855f7] mb-4 flex items-center gap-2"><Zap size={16} /> Trading DNA Profile</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Trader Type', value: dna.traderType, color: '#00ff88' },
                      { label: 'Best Strategy', value: dna.bestStrategy, color: '#00d4ff' },
                      { label: 'Optimal Emotion', value: dna.optimalEmotion, color: '#a855f7' },
                      { label: 'Risk Profile', value: dna.riskProfile, color: '#ffdd00' },
                      { label: 'Avg Daily Trades', value: String(dna.avgDailyTrades), color: '#00d4ff' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{item.label}</span>
                        <span className="text-sm font-bold" style={{ color: item.color }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="glass-card p-5 text-center">
                    <Shield size={20} className="text-[#00ff88] mx-auto mb-2" />
                    <div className="text-[10px] text-gray-500 uppercase">Account Survival</div>
                    <div className="text-3xl font-bold text-[#00ff88] mt-1">{dna.survivalScore}%</div>
                    <div className="progress-bar mt-3"><div className="progress-fill bg-[#00ff88]" style={{ width: `${dna.survivalScore}%` }} /></div>
                  </div>
                  <div className="glass-card p-5 text-center">
                    <Target size={20} className="text-[#a855f7] mx-auto mb-2" />
                    <div className="text-[10px] text-gray-500 uppercase">Trading Maturity</div>
                    <div className="text-3xl font-bold text-[#a855f7] mt-1">{dna.maturityScore}%</div>
                    <div className="progress-bar mt-3"><div className="progress-fill bg-[#a855f7]" style={{ width: `${dna.maturityScore}%` }} /></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card p-8 text-center text-gray-500">Need at least 5 trades for DNA profile.</div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}