// src/pages/OlympTrade.tsx
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trade, AppSettings, OLYMPTRADE_ASSETS } from '../types';
import { saveTrades } from '../store';
import { v4 as uuidv4 } from 'uuid';
import {
  ExternalLink, TrendingUp, Clock, DollarSign, Target, Award, Activity, Zap, BarChart3,
  Play, CheckCircle2, XCircle, RotateCcw, Search, Star,
  Wifi, WifiOff, Globe, Shield, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface OlympTradeProps {
  trades: Trade[];
  setTrades: (t: Trade[]) => void;
  settings: AppSettings;
  getAvailableBalance: () => number;
}

const EXPIRY_PRESETS = ['5 sec', '10 sec', '15 sec', '30 sec', '1 min', '2 min', '3 min', '5 min', '10 min'];

// Helper function to format currency with negative sign BEFORE the currency symbol
const formatCurrency = (amount: number, currencySymbol: string = '$'): string => {
  if (amount < 0) {
    return `-${currencySymbol}${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currencySymbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function OlympTrade({ trades, setTrades, settings, getAvailableBalance }: OlympTradeProps) {
  const [selectedAsset, setSelectedAsset] = useState(OLYMPTRADE_ASSETS[0]);
  const [direction, setDirection] = useState<'UP' | 'DOWN'>('UP');
  const [amount, setAmount] = useState(1);
  const [expiry, setExpiry] = useState('15 sec');
  const [result, setResult] = useState<'' | 'Profit' | 'Loss' | 'Refund'>('');
  const [assetFilter, setAssetFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [connected, setConnected] = useState(false);

  const balance = getAvailableBalance();
  const potentialProfit = amount * (selectedAsset.payout / 100);

  // OlympTrade trades from history
  const olympTrades = useMemo(() =>
    trades.filter(t => t.marketType === 'Fixed Time Trading' &&
      OLYMPTRADE_ASSETS.some(a => t.asset.includes(a.name.split(' ')[0]))
    ), [trades]);

  const stats = useMemo(() => {
    const w = olympTrades.filter(t => t.profitLoss > 0).length;
    const l = olympTrades.filter(t => t.profitLoss < 0).length;
    const pnl = olympTrades.reduce((s, t) => s + t.profitLoss, 0);
    return {
      total: olympTrades.length, wins: w, losses: l,
      winRate: (w + l) > 0 ? Math.round((w / (w + l)) * 1000) / 10 : 0,
      pnl: Math.round(pnl * 100) / 100,
      avgTrade: olympTrades.length > 0 ? Math.round((pnl / olympTrades.length) * 100) / 100 : 0,
    };
  }, [olympTrades]);

  // Daily PnL for chart
  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    olympTrades.forEach(t => {
      const d = t.date;
      map.set(d, (map.get(d) || 0) + t.profitLoss);
    });
    let cum = 0;
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, pnl]) => {
      cum += pnl;
      return { date, pnl: Math.round(pnl * 100) / 100, cum: Math.round(cum * 100) / 100 };
    });
  }, [olympTrades]);

  // Asset performance
  const assetPerf = useMemo(() => {
    const map = new Map<string, { w: number; l: number; pnl: number }>();
    olympTrades.forEach(t => {
      const ex = map.get(t.asset) || { w: 0, l: 0, pnl: 0 };
      if (t.profitLoss > 0) ex.w++;
      else if (t.profitLoss < 0) ex.l++;
      ex.pnl += t.profitLoss;
      map.set(t.asset, ex);
    });
    return [...map.entries()].map(([asset, d]) => ({
      asset, trades: d.w + d.l, winRate: (d.w + d.l) > 0 ? Math.round((d.w / (d.w + d.l)) * 100) : 0,
      pnl: Math.round(d.pnl * 100) / 100,
    })).sort((a, b) => b.pnl - a.pnl);
  }, [olympTrades]);

  // Filtered assets list
  const filteredAssets = OLYMPTRADE_ASSETS.filter(a => {
    if (categoryFilter !== 'All' && a.category !== categoryFilter) return false;
    if (assetFilter && !a.name.toLowerCase().includes(assetFilter.toLowerCase())) return false;
    return true;
  });

  const categories = ['All', ...new Set(OLYMPTRADE_ASSETS.map(a => a.category))];

  // Quick trade save
  const handleQuickTrade = () => {
    if (!result || amount <= 0) return;
    let pnlValue = 0;
    if (result === 'Profit') pnlValue = amount * (selectedAsset.payout / 100);
    else if (result === 'Loss') pnlValue = -amount;

    const newTrade: Trade = {
      id: uuidv4(),
      asset: selectedAsset.name,
      marketType: 'Fixed Time Trading',
      direction: direction === 'UP' ? 'buy' : 'sell',
      entryPrice: 0, exitPrice: 0, stopLoss: 0, takeProfit: 0,
      amount,
      riskPercent: selectedAsset.payout,
      profitLoss: Math.round(pnlValue * 100) / 100,
      profitLossPercent: amount > 0 ? Math.round((pnlValue / amount) * 10000) / 100 : 0,
      duration: expiry,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      strategy: '',
      marketCondition: 'normal',
      confidence: 50,
      emotionBefore: 'Neutral', emotionAfter: 'Neutral',
      mistakeCategory: result,
      notes: `OlympTrade | ${selectedAsset.category} | Payout ${selectedAsset.payout}%`,
      tags: ['olymptrade', selectedAsset.category.toLowerCase()],
      isWin: pnlValue > 0,
      riskRewardRatio: 0,
      createdAt: new Date().toISOString(),
    };

    const all = [newTrade, ...trades];
    saveTrades(all);
    setTrades(all);
    setResult('');
  };

  // Recent OT trades
  const recentTrades = olympTrades.slice(0, 15);

  const CS = settings.currencySymbol || '$';

  // Format stats with proper currency
  const formattedBalance = formatCurrency(balance, CS);
  const formattedPnl = formatCurrency(stats.pnl, CS);
  const formattedAvgTrade = formatCurrency(stats.avgTrade, CS);
  const formattedPayout = `${selectedAsset.payout}%`;

  return (
    <div className="space-y-4">
      {/* Platform Header */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 neon-border-animated">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1b8f5a, #2ecc71)', boxShadow: '0 0 25px rgba(46,204,113,0.3)' }}>
            <Zap size={28} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">OlympTrade</h2>
              <span className="text-[9px] px-2 py-0.5 rounded bg-[rgba(46,204,113,0.2)] text-[#2ecc71] font-bold uppercase tracking-wider">Platform</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Fixed Time Trading · Forex · Crypto · Commodities · Indices</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setConnected(!connected)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${connected ? 'bg-[rgba(0,255,136,0.1)] border-[#00ff88] text-[#00ff88]' : 'bg-[rgba(30,42,58,0.5)] border-[rgba(30,42,58,0.5)] text-gray-500 hover:border-[#2ecc71] hover:text-[#2ecc71]'}`}
            >
              {connected ? <><Wifi size={14} /> Connected</> : <><WifiOff size={14} /> Connect Account</>}
            </button>
            <a href="https://olymptrade.com" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-bold border border-[rgba(46,204,113,0.3)] text-[#2ecc71] hover:bg-[rgba(46,204,113,0.1)] transition-all">
              <Globe size={14} /> Open OlympTrade <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Balance', value: formattedBalance, color: '#00d4ff', icon: <DollarSign size={14} /> },
          { label: 'OT Trades', value: stats.total, color: '#a855f7', icon: <Activity size={14} /> },
          { label: 'OT Win Rate', value: `${stats.winRate}%`, color: stats.winRate >= 55 ? '#00ff88' : stats.winRate >= 45 ? '#ffdd00' : '#ff3366', icon: <Target size={14} /> },
          { label: 'OT P/L', value: formattedPnl, color: stats.pnl >= 0 ? '#00ff88' : '#ff3366', icon: <TrendingUp size={14} /> },
          { label: 'Avg Trade', value: formattedAvgTrade, color: stats.avgTrade >= 0 ? '#00ff88' : '#ff3366', icon: <BarChart3 size={14} /> },
          { label: 'Payout', value: formattedPayout, color: '#2ecc71', icon: <Award size={14} /> },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-3 text-center">
            <span style={{ color: s.color }}>{s.icon}</span>
            <div className="text-lg font-bold mt-1 stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[8px] text-gray-500 uppercase">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Asset Browser */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 lg:col-span-1">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Star size={14} className="text-[#2ecc71]" /> OlympTrade Assets
          </h3>
          {/* Search & Filter */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
              <input className="cyber-input pl-8 text-xs" placeholder="Search assets..." value={assetFilter} onChange={e => setAssetFilter(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-1 mb-3 flex-wrap">
            {categories.map(c => (
              <button key={c} onClick={() => setCategoryFilter(c)}
                className={`px-2 py-1 rounded text-[9px] font-bold transition-all ${categoryFilter === c ? 'bg-[rgba(46,204,113,0.2)] text-[#2ecc71] border border-[#2ecc71]' : 'text-gray-600 hover:text-gray-400 border border-transparent'}`}>
                {c}
              </button>
            ))}
          </div>
          {/* Asset List */}
          <div className="space-y-1 max-h-[350px] overflow-y-auto">
            {filteredAssets.map(a => (
              <button key={a.name} onClick={() => setSelectedAsset(a)}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all ${selectedAsset.name === a.name ? 'bg-[rgba(46,204,113,0.1)] border border-[rgba(46,204,113,0.3)]' : 'hover:bg-[rgba(30,42,58,0.5)] border border-transparent'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${a.otc ? 'bg-[#a855f7]' : 'bg-[#2ecc71]'}`} />
                  <div>
                    <div className="text-xs text-gray-200 font-medium">{a.name}</div>
                    <div className="text-[9px] text-gray-600">{a.category}{a.otc ? ' · OTC' : ''}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-[#2ecc71]">{a.payout}%</div>
                  <div className="text-[8px] text-gray-600">payout</div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Center: Quick Trade + Chart */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-4 lg:col-span-1">
          {/* Selected Asset Info */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-lg font-bold text-white">{selectedAsset.name}</div>
                <div className="text-xs text-gray-500">{selectedAsset.category}{selectedAsset.otc ? ' · OTC Market' : ' · Live Market'}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#2ecc71]">{selectedAsset.payout}%</div>
                <div className="text-[9px] text-gray-500 uppercase">Payout</div>
              </div>
            </div>

            {/* Quick Trade Panel */}
            <div className="space-y-3">
              {/* Direction */}
              <div className="flex gap-2">
                <button onClick={() => setDirection('UP')}
                  className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${direction === 'UP' ? 'bg-[rgba(0,255,136,0.2)] text-[#00ff88] border-2 border-[#00ff88] shadow-[0_0_15px_rgba(0,255,136,0.2)]' : 'bg-[rgba(30,42,58,0.5)] text-gray-500 border-2 border-transparent'}`}>
                  <ArrowUpRight size={18} /> UP
                </button>
                <button onClick={() => setDirection('DOWN')}
                  className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${direction === 'DOWN' ? 'bg-[rgba(255,51,102,0.2)] text-[#ff3366] border-2 border-[#ff3366] shadow-[0_0_15px_rgba(255,51,102,0.2)]' : 'bg-[rgba(30,42,58,0.5)] text-gray-500 border-2 border-transparent'}`}>
                  <ArrowDownRight size={18} /> DOWN
                </button>
              </div>

              {/* Expiry */}
              <div>
                <div className="text-[9px] text-gray-500 uppercase mb-1">Expiry</div>
                <div className="flex gap-1 flex-wrap">
                  {EXPIRY_PRESETS.map(e => (
                    <button key={e} onClick={() => setExpiry(e)}
                      className={`px-2 py-1.5 rounded text-[10px] font-bold transition-all ${expiry === e ? 'bg-[rgba(0,212,255,0.2)] text-[#00d4ff] border border-[#00d4ff]' : 'bg-[rgba(30,42,58,0.5)] text-gray-600 border border-transparent'}`}>
                      {e.replace(' sec', 's').replace(' min', 'm')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[9px] text-gray-500 uppercase mb-1">Amount ({CS})</div>
                  <input type="number" className="cyber-input" value={amount} onChange={e => setAmount(parseFloat(e.target.value) || 0)} min={1} />
                </div>
                <div>
                  <div className="text-[9px] text-gray-500 uppercase mb-1">Result</div>
                  <select className="cyber-select" value={result} onChange={e => setResult(e.target.value as any)}>
                    <option value="">Select...</option>
                    <option value="Profit">✓ Profit</option>
                    <option value="Loss">✗ Loss</option>
                    <option value="Refund">↺ Refund</option>
                  </select>
                </div>
              </div>

              {/* PnL Preview */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[rgba(30,42,58,0.4)]">
                <span className="text-[10px] text-gray-500">Potential P/L</span>
                <span className={`text-sm font-bold ${result === 'Profit' ? 'text-[#00ff88]' : result === 'Loss' ? 'text-[#ff3366]' : 'text-[#ffdd00]'}`}>
                  {result === 'Profit' ? formatCurrency(potentialProfit, CS) : result === 'Loss' ? formatCurrency(-amount, CS) : result === 'Refund' ? `${CS}0.00` : '—'}
                </span>
              </div>

              {/* Save */}
              <button onClick={handleQuickTrade} disabled={!result || amount <= 0}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                style={{
                  background: direction === 'UP' ? 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(46,204,113,0.1))' : 'linear-gradient(135deg, rgba(255,51,102,0.15), rgba(255,136,0,0.1))',
                  border: `2px solid ${direction === 'UP' ? '#2ecc71' : '#ff3366'}`,
                  color: direction === 'UP' ? '#2ecc71' : '#ff3366',
                  opacity: !result || amount <= 0 ? 0.4 : 1,
                }}>
                <Play size={16} /> Save Trade
              </button>
            </div>
          </div>

          {/* Performance Chart */}
          <div className="glass-card p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-[#2ecc71]" /> OlympTrade P/L
            </h3>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={dailyData.slice(-14)}>
                  <defs>
                    <linearGradient id="otGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2ecc71" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2ecc71" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,42,58,0.5)" />
                  <XAxis dataKey="date" tick={{ fill: '#4a5568', fontSize: 9 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fill: '#4a5568', fontSize: 9 }} />
                  <Tooltip 
                    contentStyle={{ background: '#0d1117', border: '1px solid rgba(46,204,113,0.3)', borderRadius: 8, fontSize: 11 }}
                    formatter={(value: number) => formatCurrency(value, CS)}
                  />
                  <Area type="monotone" dataKey="cum" stroke="#2ecc71" fill="url(#otGrad)" strokeWidth={2} name="Cumulative P/L" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-gray-600 text-sm">No OlympTrade data yet</div>
            )}
          </div>
        </motion.div>

        {/* Right: History + Asset Performance */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4 lg:col-span-1">
          {/* Asset Performance */}
          <div className="glass-card p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Award size={14} className="text-[#ffdd00]" /> Asset Performance
            </h3>
            {assetPerf.length > 0 ? (
              <div className="space-y-1 max-h-[180px] overflow-y-auto">
                {assetPerf.slice(0, 8).map(a => (
                  <div key={a.asset} className="flex items-center justify-between p-2 rounded bg-[rgba(30,42,58,0.3)]">
                    <div>
                      <div className="text-xs text-gray-300 font-medium">{a.asset}</div>
                      <div className="text-[9px] text-gray-600">{a.trades} trades · {a.winRate}% win</div>
                    </div>
                    <span className="text-xs font-bold" style={{ color: a.pnl >= 0 ? '#00ff88' : '#ff3366' }}>
                      {formatCurrency(a.pnl, CS)}
                    </span>
                  </div>
                ))}
              </div>
            ) : <div className="text-center text-gray-600 py-4 text-sm">No data yet</div>}
          </div>

          {/* Recent OT Trades */}
          <div className="glass-card p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock size={14} className="text-[#a855f7]" /> Recent Trades
            </h3>
            {recentTrades.length > 0 ? (
              <div className="space-y-1 max-h-[250px] overflow-y-auto">
                {recentTrades.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded bg-[rgba(22,27,34,0.6)]">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold ${t.direction === 'buy' ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                        {t.direction === 'buy' ? '▲' : '▼'}
                      </span>
                      <div>
                        <div className="text-xs text-gray-300">{t.asset}</div>
                        <div className="text-[8px] text-gray-600">{t.date} · {t.duration}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.profitLoss > 0 && <CheckCircle2 size={11} className="text-[#00ff88]" />}
                      {t.profitLoss < 0 && <XCircle size={11} className="text-[#ff3366]" />}
                      {t.profitLoss === 0 && <RotateCcw size={11} className="text-[#ffdd00]" />}
                      <span className="text-xs font-bold" style={{ color: t.profitLoss >= 0 ? '#00ff88' : '#ff3366' }}>
                        {formatCurrency(t.profitLoss, CS)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="text-center text-gray-600 py-4 text-sm">No OlympTrade trades yet</div>}
          </div>
        </motion.div>
      </div>

      {/* Open Platform Link */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Shield size={16} className="text-[#2ecc71]" />
            <div>
              <div className="text-xs text-gray-300">Trade on OlympTrade, log results here for AI analysis</div>
              <div className="text-[10px] text-gray-600">All trades logged are analyzed by the AI discipline engine, recovery system, and psychology tracker</div>
            </div>
          </div>
          <a href="https://olymptrade.com" target="_blank" rel="noopener noreferrer"
            className="cyber-button flex items-center gap-2" style={{ borderColor: 'rgba(46,204,113,0.4)', color: '#2ecc71' }}>
            <Globe size={14} /> Open OlympTrade Platform <ExternalLink size={12} />
          </a>
        </div>
      </motion.div>
    </div>
  );
}