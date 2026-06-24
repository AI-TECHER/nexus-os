import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trade, RecoveryState, AppSettings } from '../types';
import { getTradeStats, calculateEmotionalScore, shouldActivateRecovery } from '../store';
import {
  ShieldAlert, Play, Square, Clock, TrendingUp, Heart, Brain,
  CheckCircle2, AlertTriangle, Shield, Activity, Target
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface RecoveryModeProps {
  trades: Trade[];
  recovery: RecoveryState;
  setRecovery: (r: RecoveryState) => void;
  settings: AppSettings;
}

export default function RecoveryMode({ trades, recovery, setRecovery, settings }: RecoveryModeProps) {
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const stats = getTradeStats(trades);
  const emotional = calculateEmotionalScore(trades);
  const shouldActivate = shouldActivateRecovery(trades, settings);

  // Consecutive losses
  let consLosses = 0;
  for (const t of trades) { if (!t.isWin) consLosses++; else break; }

  // Cooldown timer
  useEffect(() => {
    if (!recovery.lastCooldownStart) return;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - new Date(recovery.lastCooldownStart).getTime()) / 60000;
      const remaining = Math.max(0, recovery.cooldownMinutes - elapsed);
      setCooldownRemaining(Math.ceil(remaining));
    }, 1000);
    return () => clearInterval(interval);
  }, [recovery.lastCooldownStart, recovery.cooldownMinutes]);

  const activateRecovery = (reason: string) => {
    setRecovery({
      ...recovery,
      active: true,
      activatedAt: new Date().toISOString(),
      reason,
      consecutiveLosses: consLosses,
      drawdownPercent: stats.maxDrawdown > 0 && settings.accountBalance > 0
        ? (stats.maxDrawdown / settings.accountBalance) * 100
        : 0,
      dailyTradeLimit: Math.max(1, Math.floor(settings.dailyTradeLimit / 2)),
      cooldownMinutes: settings.cooldownAfterLoss * 2,
      lastCooldownStart: new Date().toISOString(),
      emotionalScore: emotional,
      recoveryProgress: 0,
      safeTradesCompleted: 0,
      safeTradesRequired: Math.max(5, consLosses * 3),
    });
  };

  const deactivateRecovery = () => {
    setRecovery({
      ...recovery,
      active: false,
      activatedAt: '',
      reason: '',
      consecutiveLosses: 0,
      recoveryProgress: 100,
    });
  };

  const startCooldown = () => {
    setRecovery({
      ...recovery,
      lastCooldownStart: new Date().toISOString(),
    });
  };

  // Recovery progress from recent trades during recovery
  const recentSafeTrades = recovery.active
    ? trades.filter(t => new Date(t.createdAt) >= new Date(recovery.activatedAt))
    : [];
  const safeWins = recentSafeTrades.filter(t => t.isWin && t.riskPercent <= settings.maxRiskPerTrade).length;

  // Recovery chart
  const recoveryChartData = recentSafeTrades.reverse().map((t, i) => ({
    trade: i + 1,
    pnl: t.profitLoss,
    cumPnl: recentSafeTrades.slice(0, i + 1).reduce((s, tr) => s + tr.profitLoss, 0),
  }));

  const confidenceLevel = Math.min(100, Math.round(
    (emotional * 0.3) +
    (Math.min(100, stats.winRate) * 0.3) +
    ((safeWins / Math.max(1, recovery.safeTradesRequired)) * 100 * 0.4)
  ));

  const safeScore = Math.min(100, Math.round(
    (recovery.active ? (safeWins / Math.max(1, recovery.safeTradesRequired)) * 100 : 0) * 0.5 +
    emotional * 0.3 +
    (100 - Math.min(100, consLosses * 20)) * 0.2
  ));

  return (
    <div className="space-y-4">
      {/* Recovery Status Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`glass-card p-6 ${recovery.active ? 'border-[rgba(255,51,102,0.3)]' : 'border-[rgba(0,255,136,0.15)]'}`}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${recovery.active ? 'bg-[rgba(255,51,102,0.15)]' : 'bg-[rgba(0,255,136,0.1)]'}`}>
              <ShieldAlert size={32} className={recovery.active ? 'text-[#ff3366] animate-pulse-neon' : 'text-[#00ff88]'} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${recovery.active ? 'text-[#ff3366]' : 'text-[#00ff88]'}`}>
                Recovery Mode {recovery.active ? 'ACTIVE' : 'INACTIVE'}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {recovery.active
                  ? `Activated: ${recovery.reason} · Since ${new Date(recovery.activatedAt).toLocaleDateString()}`
                  : 'System monitors your trading behavior for recovery triggers.'}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {!recovery.active ? (
              <>
                <button onClick={() => activateRecovery('Manual activation')} className="cyber-button-danger cyber-button flex items-center gap-2">
                  <Play size={14} /> Activate Recovery
                </button>
                {shouldActivate.activate && (
                  <button onClick={() => activateRecovery(shouldActivate.reason)} className="cyber-button flex items-center gap-2">
                    <AlertTriangle size={14} /> AI Recommends Activation
                  </button>
                )}
              </>
            ) : (
              <button onClick={deactivateRecovery} className="cyber-button flex items-center gap-2">
                <Square size={14} /> Deactivate
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* AI Recommendation */}
      {shouldActivate.activate && !recovery.active && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="warning-banner flex items-center gap-3">
          <AlertTriangle className="text-[#ff3366] flex-shrink-0" size={20} />
          <div>
            <div className="text-sm font-bold text-[#ff3366]">AI Recovery Recommendation</div>
            <div className="text-xs text-gray-400">{shouldActivate.reason}. Recovery Mode activation is strongly recommended.</div>
          </div>
        </motion.div>
      )}

      {/* Recovery Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Recovery %', value: `${recovery.active ? Math.round((safeWins / Math.max(1, recovery.safeTradesRequired)) * 100) : 0}%`, color: '#00ff88', icon: <TrendingUp size={16} /> },
          { label: 'Emotional Score', value: `${emotional}%`, color: emotional >= 60 ? '#00d4ff' : '#ff3366', icon: <Heart size={16} /> },
          { label: 'AI Confidence', value: `${confidenceLevel}%`, color: confidenceLevel >= 60 ? '#00ff88' : '#ffdd00', icon: <Brain size={16} /> },
          { label: 'Safe Score', value: `${safeScore}%`, color: safeScore >= 60 ? '#00ff88' : '#ff3366', icon: <Shield size={16} /> },
          { label: 'Cons. Losses', value: `${consLosses}`, color: consLosses >= 3 ? '#ff3366' : '#ffdd00', icon: <Activity size={16} /> },
          { label: 'Safe Trades', value: `${safeWins}/${recovery.safeTradesRequired}`, color: '#a855f7', icon: <Target size={16} /> },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-4 text-center">
            <span style={{ color: card.color }}>{card.icon}</span>
            <div className="text-lg font-bold mt-2 stat-value" style={{ color: card.color }}>{card.value}</div>
            <div className="text-[9px] text-gray-500 uppercase mt-1">{card.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recovery Progress Chart */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-[#00ff88]" /> Recovery Progress
          </h3>
          {recoveryChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={recoveryChartData}>
                <defs>
                  <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,42,58,0.5)" />
                <XAxis dataKey="trade" tick={{ fill: '#4a5568', fontSize: 10 }} />
                <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="cumPnl" stroke="#a855f7" fill="url(#recGrad)" strokeWidth={2} name="Recovery P/L" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-600 text-sm">
              {recovery.active ? 'Start safe trading to see recovery progress' : 'Activate Recovery Mode to track progress'}
            </div>
          )}
        </motion.div>

        {/* Cooldown Timer */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock size={14} className="text-[#ffdd00]" /> Cooldown Timer
          </h3>
          <div className="text-center py-6">
            {cooldownRemaining > 0 ? (
              <>
                <div className="text-5xl font-bold text-[#ffdd00] mb-2 stat-value">{cooldownRemaining}</div>
                <div className="text-sm text-gray-400">minutes remaining</div>
                <div className="mt-4 progress-bar">
                  <div className="progress-fill bg-[#ffdd00]" style={{ width: `${(1 - cooldownRemaining / recovery.cooldownMinutes) * 100}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-3">Take a break. Step away from charts. Review your plan.</p>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-[#00ff88] mb-2">Ready</div>
                <div className="text-sm text-gray-400 mb-4">No active cooldown</div>
                <button onClick={startCooldown} className="cyber-button flex items-center gap-2 mx-auto">
                  <Clock size={14} /> Start {recovery.active ? recovery.cooldownMinutes : settings.cooldownAfterLoss}min Cooldown
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recovery Roadmap */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Target size={14} className="text-[#00d4ff]" /> Recovery Roadmap
        </h3>
        <div className="space-y-3">
          {[
            { step: 1, title: 'Acknowledge & Accept', desc: 'Accept the loss streak. Stop blaming the market.', done: recovery.active },
            { step: 2, title: 'Activate Cooldown', desc: 'Take a mandatory break from trading.', done: recovery.active && cooldownRemaining === 0 && recovery.lastCooldownStart !== '' },
            { step: 3, title: 'Review & Journal', desc: 'Review each losing trade. Document lessons learned.', done: safeWins >= 1 },
            { step: 4, title: 'Reduce Risk', desc: `Trade with max ${recovery.active ? recovery.dailyTradeLimit : 2} trades/day and half normal position size.`, done: safeWins >= 3 },
            { step: 5, title: 'Safe Trading Phase', desc: `Complete ${recovery.safeTradesRequired} disciplined trades with proper risk management.`, done: safeWins >= recovery.safeTradesRequired },
            { step: 6, title: 'Rebuild Confidence', desc: 'Gradually increase position sizes back to normal.', done: safeWins >= recovery.safeTradesRequired && emotional >= 60 },
            { step: 7, title: 'Full Recovery', desc: 'Return to normal trading with improved discipline.', done: !recovery.active && safeWins >= recovery.safeTradesRequired },
          ].map(item => (
            <div key={item.step} className={`flex items-start gap-3 p-3 rounded-lg ${item.done ? 'bg-[rgba(0,255,136,0.05)]' : 'bg-[rgba(30,42,58,0.3)]'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-[rgba(0,255,136,0.2)]' : 'bg-[rgba(30,42,58,0.5)]'}`}>
                {item.done ? <CheckCircle2 size={16} className="text-[#00ff88]" /> : <span className="text-xs text-gray-500">{item.step}</span>}
              </div>
              <div>
                <div className={`text-sm font-medium ${item.done ? 'text-[#00ff88]' : 'text-gray-300'}`}>{item.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* AI Recovery Advice */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Brain size={14} className="text-[#a855f7]" /> AI Recovery Coaching
        </h3>
        <div className="space-y-2">
          {[
            consLosses >= 3 && '🔴 You have had multiple consecutive losses. This is a clear signal to pause and reset.',
            emotional < 40 && '⚠️ Your emotional stability score is low. Consider journaling or meditation before trading.',
            stats.currentStreak < -2 && '🧘 Breaking a losing streak requires patience, not revenge. Wait for your best setup.',
            recovery.active && safeWins < recovery.safeTradesRequired && `📊 You need ${recovery.safeTradesRequired - safeWins} more safe trades before full recovery.`,
            recovery.active && '💡 Use half your normal position size during recovery.',
            recovery.active && '🎯 Only trade your highest-conviction setups during recovery.',
            '📝 Always set a stop loss before entering a trade.',
            stats.avgRR < 1.5 && stats.totalTrades > 3 && '⚠️ Improve your risk-reward ratio. Aim for at least 1:2.',
            '🧠 Trading is a marathon, not a sprint. Consistency beats intensity.',
            emotional >= 70 && '✅ Your emotional state is stable. Good foundation for disciplined trading.',
          ].filter(Boolean).map((advice, i) => (
            <div key={i} className="text-xs text-gray-300 p-2 rounded-lg bg-[rgba(30,42,58,0.3)] leading-relaxed">{advice}</div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
