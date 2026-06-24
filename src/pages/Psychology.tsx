import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trade, PsychologyEntry, AppSettings } from '../types';
import { getPsychologyEntries, savePsychologyEntries, calculateDisciplineScore, calculateEmotionalScore, getEmotionStats } from '../store';
import { HeartPulse, Save, Brain, Shield, Activity, Smile, Frown, Meh, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

interface PsychologyProps {
  trades: Trade[];
  settings: AppSettings;
}

export default function Psychology({ trades, settings }: PsychologyProps) {
  const [entries, setEntries] = useState<PsychologyEntry[]>(getPsychologyEntries());
  const discipline = calculateDisciplineScore(trades, settings);
  const emotional = calculateEmotionalScore(trades);
  const emotionStats = getEmotionStats(trades);

  const today = new Date().toISOString().split('T')[0];
  const todayEntry = entries.find(e => e.date === today);

  const [form, setForm] = useState<Omit<PsychologyEntry, 'date'>>({
    emotionalStability: todayEntry?.emotionalStability ?? 50,
    disciplineScore: todayEntry?.disciplineScore ?? discipline,
    confidenceLevel: todayEntry?.confidenceLevel ?? 50,
    stressLevel: todayEntry?.stressLevel ?? 30,
    fearGreedBalance: todayEntry?.fearGreedBalance ?? 50,
    patienceLevel: todayEntry?.patienceLevel ?? 50,
    notes: todayEntry?.notes ?? '',
  });

  const saveEntry = () => {
    const newEntry: PsychologyEntry = { ...form, date: today };
    const updated = entries.filter(e => e.date !== today);
    updated.unshift(newEntry);
    setEntries(updated);
    savePsychologyEntries(updated);
  };

  // Chart data from entries
  const chartData = entries.slice().reverse().slice(-30).map(e => ({
    date: e.date,
    emotional: e.emotionalStability,
    discipline: e.disciplineScore,
    confidence: e.confidenceLevel,
    stress: e.stressLevel,
  }));

  const radarData = [
    { subject: 'Emotional', value: form.emotionalStability },
    { subject: 'Discipline', value: form.disciplineScore },
    { subject: 'Confidence', value: form.confidenceLevel },
    { subject: 'Patience', value: form.patienceLevel },
    { subject: 'Calm', value: 100 - form.stressLevel },
    { subject: 'Balance', value: Math.abs(50 - form.fearGreedBalance) < 20 ? 80 : 40 },
  ];

  // Emotional summary
  const getEmoji = (score: number) => score >= 70 ? <Smile size={20} className="text-[#00ff88]" /> : score >= 40 ? <Meh size={20} className="text-[#ffdd00]" /> : <Frown size={20} className="text-[#ff3366]" />;

  const overallScore = Math.round(
    (form.emotionalStability * 0.25) +
    (form.disciplineScore * 0.25) +
    (form.confidenceLevel * 0.15) +
    ((100 - form.stressLevel) * 0.15) +
    (form.patienceLevel * 0.1) +
    ((Math.abs(50 - form.fearGreedBalance) < 20 ? 80 : 40) * 0.1)
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff3366] to-[#a855f7] flex items-center justify-center">
          <HeartPulse size={28} className="text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-[#a855f7]">Psychology & Discipline Tracker</h2>
          <p className="text-xs text-gray-400 mt-1">Monitor your mental state and trading psychology daily</p>
        </div>
        <div className="text-center">
          {getEmoji(overallScore)}
          <div className="text-lg font-bold mt-1" style={{ color: overallScore >= 70 ? '#00ff88' : overallScore >= 40 ? '#ffdd00' : '#ff3366' }}>
            {overallScore}%
          </div>
          <div className="text-[9px] text-gray-500">OVERALL</div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Entry Form */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Brain size={14} className="text-[#a855f7]" /> Daily Psychology Check-in
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Emotional Stability', key: 'emotionalStability' as const, icon: <HeartPulse size={14} />, color: '#a855f7' },
              { label: 'Discipline Score', key: 'disciplineScore' as const, icon: <Shield size={14} />, color: '#00ff88' },
              { label: 'Confidence Level', key: 'confidenceLevel' as const, icon: <TrendingUp size={14} />, color: '#00d4ff' },
              { label: 'Stress Level', key: 'stressLevel' as const, icon: <Activity size={14} />, color: '#ff3366', invert: true },
              { label: 'Fear/Greed Balance', key: 'fearGreedBalance' as const, icon: <Brain size={14} />, color: '#ffdd00' },
              { label: 'Patience Level', key: 'patienceLevel' as const, icon: <Smile size={14} />, color: '#00ff88' },
            ].map(item => (
              <div key={item.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400 flex items-center gap-1.5">{item.icon} {item.label}</span>
                  <span className="text-xs font-bold" style={{ color: item.color }}>{form[item.key]}%</span>
                </div>
                <input type="range" min="0" max="100" value={form[item.key]}
                  onChange={e => setForm({ ...form, [item.key]: parseInt(e.target.value) })}
                  className="w-full" />
                {'invert' in item && (
                  <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
                    <span>Low</span><span>High</span>
                  </div>
                )}
              </div>
            ))}

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Notes</label>
              <textarea className="cyber-input" placeholder="How are you feeling today? Any trading thoughts?" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>

            <button onClick={saveEntry} className="cyber-button flex items-center gap-2 w-full justify-center">
              <Save size={14} /> Save Daily Check-in
            </button>
          </div>
        </motion.div>

        {/* Psychology Radar */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Brain size={14} className="text-[#00d4ff]" /> Psychology Radar
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(30,42,58,0.7)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#8899aa', fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#4a5568', fontSize: 9 }} />
              <Radar name="Current" dataKey="value" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Trend Charts */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Psychology Trends</h3>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,42,58,0.5)" />
              <XAxis dataKey="date" tick={{ fill: '#4a5568', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="emotional" stroke="#a855f7" strokeWidth={2} name="Emotional" dot={false} />
              <Line type="monotone" dataKey="discipline" stroke="#00ff88" strokeWidth={2} name="Discipline" dot={false} />
              <Line type="monotone" dataKey="confidence" stroke="#00d4ff" strokeWidth={2} name="Confidence" dot={false} />
              <Line type="monotone" dataKey="stress" stroke="#ff3366" strokeWidth={1.5} strokeDasharray="4 4" name="Stress" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-gray-600 text-sm">
            Complete daily check-ins to see trends over time
          </div>
        )}
      </motion.div>

      {/* Emotion Trading Impact */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          Emotion Impact on Trading Performance
        </h3>
        {emotionStats.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {emotionStats.sort((a, b) => b.count - a.count).slice(0, 8).map(e => (
              <div key={e.emotion} className="p-3 rounded-lg bg-[rgba(30,42,58,0.3)] text-center">
                <div className="text-sm font-medium text-gray-300 capitalize">{e.emotion}</div>
                <div className="text-lg font-bold mt-1" style={{ color: e.avgPnl >= 0 ? '#00ff88' : '#ff3366' }}>
                  ${e.avgPnl.toFixed(0)}
                </div>
                <div className="text-[10px] text-gray-500">{e.count} trades · {e.winRate}% win</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-600 py-8 text-sm">Log trades with emotions to see impact analysis</div>
        )}
      </motion.div>

      {/* AI Psychology Report */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Brain size={14} className="text-[#a855f7]" /> AI Psychology Report
        </h3>
        <div className="space-y-2">
          {[
            overallScore >= 70 && '✅ Your psychological state is strong. You are in a good position to trade with confidence.',
            overallScore < 40 && '⚠️ Your psychological state needs attention. Consider taking a break from trading.',
            form.stressLevel > 70 && '🔴 High stress levels detected. Avoid trading when stressed — it leads to impulsive decisions.',
            form.stressLevel <= 30 && '✅ Low stress levels — optimal condition for clear-headed trading.',
            form.fearGreedBalance > 70 && '⚠️ Greed tendency detected. Be careful of oversized positions and unrealistic targets.',
            form.fearGreedBalance < 30 && '⚠️ Fear tendency detected. You may be cutting winners too early or avoiding valid setups.',
            Math.abs(50 - form.fearGreedBalance) < 15 && '✅ Well-balanced fear/greed level. This is optimal for rational trading.',
            form.patienceLevel < 30 && '🧘 Low patience detected. Wait for high-probability setups instead of forcing trades.',
            form.confidenceLevel > 85 && '⚠️ Very high confidence — watch for overconfidence bias. It often precedes big losses.',
            form.confidenceLevel < 30 && '💪 Low confidence is normal after losses. Focus on small, disciplined trades to rebuild.',
            `📊 Discipline Score from Trades: ${discipline}% | Emotional Score: ${emotional}%`,
          ].filter(Boolean).map((text, i) => (
            <div key={i} className="text-xs text-gray-300 p-2 rounded-lg bg-[rgba(30,42,58,0.3)] leading-relaxed">{text}</div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
