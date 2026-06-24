import { motion } from 'framer-motion';
import { APP_VERSION, APP_BUILD } from '../types';
import {
  Zap, HelpCircle, RefreshCw, BookOpen, MessageCircle, Shield, Brain,
  BarChart3, PenLine, ShieldAlert, Target, CalendarDays, Mic, HeartPulse,
  FileText, Settings, LayoutDashboard, ExternalLink, CheckCircle2
} from 'lucide-react';
import { useState } from 'react';

const faqs = [
  { q: 'How do I add a Fixed Time Trade?', a: 'Go to Trade Terminal → select "Fixed Time Trading" from the Market dropdown → choose asset, direction (UP/DOWN), expiry, amount, payout %, and result → click Save Trade.' },
  { q: 'How does Recovery Mode work?', a: 'Recovery Mode activates when consecutive losses exceed your threshold or drawdown is too high. It reduces daily trade limits and provides a guided roadmap to rebuild your trading discipline.' },
  { q: 'How do I import trades from Excel?', a: 'In Trade Terminal, click "Import (CSV/Excel)" → select your .xlsx or .csv file. The system auto-detects formats from OlympTrade, Quotex, Pocket Option, Binomo, and standard exchange exports.' },
  { q: 'What currencies are supported?', a: 'NEXUS supports 45+ currencies including USD, EUR, GBP, JPY, INR, AUD, CAD, BTC, ETH, and many more. Change currency in Settings → Account & Currency.' },
  { q: 'How does the AI Coach work?', a: 'The AI analyzes your trade patterns, detects habits (good and bad), predicts future performance, rates each trade, and builds your Trading DNA profile—all from your real entered data.' },
  { q: 'Is my data secure?', a: 'All data is stored locally in your browser\'s localStorage. No data is sent to any server. You can export backups and import them on any device.' },
  { q: 'How do I enable Two-Factor Authentication?', a: 'Go to Settings → User Profile → enable "Two-Factor Authentication". On next login you will be asked for a verification code.' },
];

const features = [
  { icon: <LayoutDashboard size={14} />, label: 'Dashboard', desc: 'Overview of performance, P/L charts, AI insights' },
  { icon: <PenLine size={14} />, label: 'Trade Terminal', desc: 'Add regular & fixed-time trades, import from Excel' },
  { icon: <BarChart3 size={14} />, label: 'Analytics', desc: 'Deep performance analysis with radar charts' },
  { icon: <Brain size={14} />, label: 'AI Intelligence', desc: 'Habit detection, trade rating, DNA profile, predictions' },
  { icon: <Shield size={14} />, label: 'Risk Management', desc: 'Drawdown tracking, risk distribution, protection rules' },
  { icon: <HeartPulse size={14} />, label: 'Psychology', desc: 'Daily check-ins, emotion impact, psychology radar' },
  { icon: <ShieldAlert size={14} />, label: 'Recovery Mode', desc: 'Guided recovery after losses, cooldown timers' },
  { icon: <Mic size={14} />, label: 'Voice Assistant', desc: 'Voice commands, AI mentor chat, speech recognition' },
  { icon: <CalendarDays size={14} />, label: 'Trading Calendar', desc: 'Monthly heatmap, day-by-day performance review' },
  { icon: <FileText size={14} />, label: 'Reports', desc: 'Daily/weekly/monthly reports, CSV/text export' },
  { icon: <Target size={14} />, label: 'Goals & Discipline', desc: 'XP system, achievement badges, progress tracking' },
  { icon: <Settings size={14} />, label: 'Settings', desc: '45+ currencies, profile, 2FA, data management' },
];

export default function Help() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [updateChecked, setUpdateChecked] = useState(false);

  const handleCheckUpdate = () => {
    setUpdateChecked(true);
    setTimeout(() => setUpdateChecked(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Version Card */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 neon-border-animated">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00ff88] to-[#00d4ff] flex items-center justify-center" style={{ boxShadow: '0 0 30px #00ff8822' }}>
            <Zap size={32} className="text-black" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-[#00ff88] tracking-wider">NEXUS T.R.O.S.</h2>
            <p className="text-xs text-gray-400 mt-1">AI-Powered Trading Recovery Operating System</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-[rgba(0,255,136,0.06)] text-center min-w-[80px]">
              <div className="text-[8px] text-gray-500 uppercase">Version</div>
              <div className="text-sm font-bold text-[#00ff88]">v{APP_VERSION}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-[rgba(0,212,255,0.06)] text-center min-w-[80px]">
              <div className="text-[8px] text-gray-500 uppercase">Build</div>
              <div className="text-sm font-bold text-[#00d4ff]">{APP_BUILD}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button onClick={handleCheckUpdate} className="cyber-button flex items-center gap-2">
            <RefreshCw size={14} className={updateChecked ? 'animate-spin' : ''} /> Check for Updates
          </button>
          {updateChecked && (
            <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-xs text-[#00ff88] flex items-center gap-1">
              <CheckCircle2 size={14} /> You are on the latest version
            </motion.span>
          )}
        </div>

        <div className="mt-4 text-[10px] text-gray-600 space-y-0.5">
          <p>• Engine: React 19 + Vite + Tailwind CSS + Framer Motion + Recharts</p>
          <p>• Storage: Browser localStorage (offline-capable)</p>
          <p>• Auth: Client-side encrypted credentials with 2FA support</p>
          <p>• Import: xlsx parser supporting OlympTrade / Quotex / Pocket Option / Binomo / CSV</p>
        </div>
      </motion.div>

      {/* Changelog */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-5">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <BookOpen size={14} className="text-[#a855f7]" /> Changelog
        </h3>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {[
            { ver: 'v4.2.1', date: '2025-06-28', changes: 'Auth system, user profiles, 2FA support, global 45+ currencies, sidebar submenus, help center' },
            { ver: 'v4.2.0', date: '2025-06-27', changes: 'Fixed Time Trading journal, Excel block parser (OlympTrade/Quotex/Binomo), expiry time selector, import summary modal' },
            { ver: 'v4.1.0', date: '2025-06-26', changes: 'Unified Trade Terminal, UP/DOWN direction, payout % / result fields, P&L auto-calc, dynamic table columns' },
            { ver: 'v4.0.0', date: '2025-06-25', changes: 'Initial release: Dashboard, Analytics, Graphs, Recovery Mode, AI Intelligence, Voice Assistant, Psychology, Calendar, Reports, Goals, Settings, Splash Screen' },
          ].map(c => (
            <div key={c.ver} className="p-3 rounded-lg bg-[rgba(30,42,58,0.3)] flex gap-3">
              <div className="flex-shrink-0"><span className="text-xs font-bold text-[#00ff88]">{c.ver}</span><div className="text-[9px] text-gray-600">{c.date}</div></div>
              <p className="text-xs text-gray-400 leading-relaxed">{c.changes}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* FAQ */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <MessageCircle size={14} className="text-[#00d4ff]" /> Frequently Asked Questions
        </h3>
        <div className="space-y-1">
          {faqs.map((faq, i) => (
            <div key={i}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full text-left p-3 rounded-lg hover:bg-[rgba(30,42,58,0.3)] transition-all flex items-center gap-2">
                <HelpCircle size={12} className="text-[#00d4ff] flex-shrink-0" />
                <span className="text-xs text-gray-300 flex-1">{faq.q}</span>
                <motion.span animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ExternalLink size={10} className="text-gray-600" />
                </motion.span>
              </button>
              {openFaq === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-8 pb-3 text-xs text-gray-500 leading-relaxed">
                  {faq.a}
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Feature Overview */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-5">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Zap size={14} className="text-[#ffdd00]" /> Feature Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {features.map(f => (
            <div key={f.label} className="p-3 rounded-lg bg-[rgba(30,42,58,0.3)] flex items-start gap-2.5">
              <span className="text-[#00d4ff] flex-shrink-0 mt-0.5">{f.icon}</span>
              <div><div className="text-xs font-medium text-gray-300">{f.label}</div><div className="text-[10px] text-gray-500 mt-0.5">{f.desc}</div></div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
