import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trade } from '../types';
import { getDailyPnL, getTradeStats } from '../store';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { LineChart as LineIcon, BarChart3, TrendingDown, Activity, Brain, Shield, Clock, Target } from 'lucide-react';

interface GraphsProps {
  trades: Trade[];
}

type GraphTab = 'growth' | 'pnl' | 'drawdown' | 'consistency' | 'emotional' | 'discipline' | 'frequency' | 'riskExposure';

export default function Graphs({ trades }: GraphsProps) {
  const [tab, setTab] = useState<GraphTab>('growth');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('all');

  const dailyPnL = getDailyPnL(trades);
  const stats = getTradeStats(trades);

  // Filter by date range
  const now = new Date();
  const filteredDaily = dailyPnL.filter(d => {
    if (dateRange === 'all') return true;
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 86400000);
    return new Date(d.date) >= cutoff;
  });

  // Drawdown data
  let peak = 0;
  const drawdownData = filteredDaily.map(d => {
    if (d.cumPnl > peak) peak = d.cumPnl;
    const dd = peak > 0 ? ((peak - d.cumPnl) / peak) * 100 : 0;
    return { ...d, drawdown: -Math.round(dd * 100) / 100 };
  });

  // Emotional trading data
  const emotionByDate = new Map<string, { calm: number; emotional: number; total: number }>();
  for (const t of trades) {
    const ex = emotionByDate.get(t.date) || { calm: 0, emotional: 0, total: 0 };
    const isNeg = ['angry', 'frustrated', 'fearful', 'greedy', 'anxious', 'revenge', 'fomo'].includes(t.emotionBefore.toLowerCase());
    if (isNeg) ex.emotional++; else ex.calm++;
    ex.total++;
    emotionByDate.set(t.date, ex);
  }
  const emotionData = [...emotionByDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, data]) => ({
    date,
    emotional: Math.round((data.emotional / data.total) * 100),
    calm: Math.round((data.calm / data.total) * 100),
  }));

  // Discipline data (trades with mistakes vs clean)
  const disciplineByDate = new Map<string, { clean: number; mistake: number }>();
  for (const t of trades) {
    const ex = disciplineByDate.get(t.date) || { clean: 0, mistake: 0 };
    if (t.mistakeCategory && t.mistakeCategory !== 'None') ex.mistake++; else ex.clean++;
    disciplineByDate.set(t.date, ex);
  }
  const disciplineData = [...disciplineByDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, data]) => ({
    date, clean: data.clean, mistake: data.mistake, total: data.clean + data.mistake,
    rate: Math.round((data.clean / (data.clean + data.mistake)) * 100),
  }));

  // Frequency data
  const freqData = filteredDaily.map(d => ({ date: d.date, trades: d.trades }));

  // Risk exposure
  const riskByDate = new Map<string, number[]>();
  for (const t of trades) {
    const arr = riskByDate.get(t.date) || [];
    arr.push(t.riskPercent);
    riskByDate.set(t.date, arr);
  }
  const riskData = [...riskByDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, risks]) => ({
    date, avgRisk: Math.round((risks.reduce((s, r) => s + r, 0) / risks.length) * 100) / 100,
    maxRisk: Math.max(...risks),
  }));

  const tabs: { id: GraphTab; label: string; icon: React.ReactNode }[] = [
    { id: 'growth', label: 'Account Growth', icon: <LineIcon size={14} /> },
    { id: 'pnl', label: 'Daily P/L', icon: <BarChart3 size={14} /> },
    { id: 'drawdown', label: 'Drawdown', icon: <TrendingDown size={14} /> },
    { id: 'consistency', label: 'Consistency', icon: <Target size={14} /> },
    { id: 'emotional', label: 'Emotional', icon: <Brain size={14} /> },
    { id: 'discipline', label: 'Discipline', icon: <Shield size={14} /> },
    { id: 'frequency', label: 'Frequency', icon: <Clock size={14} /> },
    { id: 'riskExposure', label: 'Risk Exposure', icon: <Activity size={14} /> },
  ];

  if (trades.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <LineIcon size={48} className="text-gray-700 mx-auto mb-4" />
          <div className="text-gray-500 text-lg">No graph data</div>
          <div className="text-gray-600 text-sm mt-2">Enter trades to generate graphs</div>
        </div>
      </div>
    );
  }

  const renderGraph = () => {
    const tooltipStyle = { background: '#0d1117', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 8, fontSize: 12 };

    switch (tab) {
      case 'growth':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={filteredDaily}>
              <defs>
                <linearGradient id="gGrowth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,42,58,0.5)" />
              <XAxis dataKey="date" tick={{ fill: '#4a5568', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="cumPnl" stroke="#00ff88" fill="url(#gGrowth)" strokeWidth={2} name="Cumulative P/L" />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'pnl':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={filteredDaily}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,42,58,0.5)" />
              <XAxis dataKey="date" tick={{ fill: '#4a5568', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="pnl" name="P/L" radius={[4, 4, 0, 0]}>
                {filteredDaily.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#00ff88' : '#ff3366'} opacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'drawdown':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={drawdownData}>
              <defs>
                <linearGradient id="gDD" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff3366" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff3366" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,42,58,0.5)" />
              <XAxis dataKey="date" tick={{ fill: '#4a5568', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="drawdown" stroke="#ff3366" fill="url(#gDD)" strokeWidth={2} name="Drawdown %" />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'consistency':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={filteredDaily}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,42,58,0.5)" />
              <XAxis dataKey="date" tick={{ fill: '#4a5568', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="pnl" stroke="#00d4ff" strokeWidth={2} dot={{ fill: '#00d4ff', r: 3 }} name="Daily P/L" />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'emotional':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={emotionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,42,58,0.5)" />
              <XAxis dataKey="date" tick={{ fill: '#4a5568', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="calm" stackId="a" fill="#00ff88" opacity={0.7} name="Calm %" />
              <Bar dataKey="emotional" stackId="a" fill="#ff3366" opacity={0.7} name="Emotional %" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'discipline':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={disciplineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,42,58,0.5)" />
              <XAxis dataKey="date" tick={{ fill: '#4a5568', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="rate" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', r: 3 }} name="Discipline Rate %" />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'frequency':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={freqData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,42,58,0.5)" />
              <XAxis dataKey="date" tick={{ fill: '#4a5568', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="trades" fill="#00d4ff" opacity={0.8} radius={[4, 4, 0, 0]} name="Trades" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'riskExposure':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={riskData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,42,58,0.5)" />
              <XAxis dataKey="date" tick={{ fill: '#4a5568', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="avgRisk" stroke="#ffdd00" strokeWidth={2} name="Avg Risk %" />
              <Line type="monotone" dataKey="maxRisk" stroke="#ff3366" strokeWidth={1.5} strokeDasharray="5 5" name="Max Risk %" />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${tab === t.id ? 'bg-[rgba(0,255,136,0.1)] text-[#00ff88] border border-[rgba(0,255,136,0.3)]' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-2">
        {(['7d', '30d', '90d', 'all'] as const).map(r => (
          <button
            key={r}
            onClick={() => setDateRange(r)}
            className={`px-3 py-1 rounded text-xs ${dateRange === r ? 'bg-[rgba(0,255,136,0.15)] text-[#00ff88]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {r === 'all' ? 'All Time' : r.toUpperCase()}
          </button>
        ))}
        <div className="flex-1" />
        <div className="text-xs text-gray-500">
          {filteredDaily.length} data points · Max DD: ${stats.maxDrawdown}
        </div>
      </div>

      {/* Graph */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4"
      >
        {renderGraph()}
      </motion.div>
    </div>
  );
}
