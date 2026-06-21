import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings as SettingsIcon, Save, RotateCcw, Shield, Bell, Zap, Database,
  User, Globe, LogOut, RefreshCw, CheckCircle2, Info, Smartphone, Lock,
  DollarSign, Wallet, TrendingUp, TrendingDown, ArrowUpDown,
  Download, AlertTriangle, Sparkles, DownloadCloud
} from 'lucide-react';

// Types
interface AppSettings {
  currency: string;
  currencySymbol: string;
  accountBalance: number;
  dailyTradeLimit: number;
  dailyLossLimit: number;
  maxRiskPerTrade: number;
  cooldownAfterLoss: number;
  consecutiveLossThreshold: number;
  drawdownThreshold: number;
  recoveryAutoActivate: boolean;
  voiceEnabled: boolean;
  soundEnabled: boolean;
}

interface UserProfile {
  displayName: string;
  email: string;
  country: string;
  timezone: string;
  twoFactorEnabled: boolean;
  createdAt: string;
}

interface SettingsProps {
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  onDataCleared?: () => void;
}

// Constants
const APP_VERSION = '4.3.0';
const APP_BUILD = '2025.07.15';

const WORLD_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
];

const defaultSettings: AppSettings = {
  currency: 'USD',
  currencySymbol: '$',
  accountBalance: 10000,
  dailyTradeLimit: 20,
  dailyLossLimit: 10,
  maxRiskPerTrade: 1,
  cooldownAfterLoss: 30,
  consecutiveLossThreshold: 3,
  drawdownThreshold: 10,
  recoveryAutoActivate: false,
  voiceEnabled: false,
  soundEnabled: true,
};

const ACCOUNT_TYPES = [
  { id: 'investment', label: 'Investment Account', icon: <TrendingUp size={14} />, color: '#2ecc71' },
  { id: 'withdrawal', label: 'Withdrawal Account', icon: <TrendingDown size={14} />, color: '#e74c3c' },
  { id: 'usd', label: 'USD Account', icon: <DollarSign size={14} />, color: '#3498db' },
  { id: 'usdt', label: 'USDT Account', icon: <Wallet size={14} />, color: '#9b59b6' },
  { id: 'forex', label: 'Forex Account', icon: <Globe size={14} />, color: '#f39c12' },
];

const CHANGELOG = [
  { version: 'v4.3.0', date: '2025-07-15', changes: ['🔄 Fixed update check', '📊 Enhanced Account Analysis', '🎨 UI improvements'] },
  { version: 'v4.2.1', date: '2025-06-28', changes: ['Auth system with user profiles', 'Two-Factor Authentication', '45+ world currencies'] },
  { version: 'v4.2.0', date: '2025-06-27', changes: ['Fixed Time Trading journal', 'Excel block parser', 'Import summary modal'] },
  { version: 'v4.1.0', date: '2025-06-26', changes: ['Unified Trade Terminal', 'UP/DOWN direction toggle', 'Auto P&L calculation'] },
  { version: 'v4.0.0', date: '2025-06-25', changes: ['Initial release: Dashboard, Analytics, Recovery Mode, AI Intelligence'] },
];

// Helper functions
const getSession = (): UserProfile | null => {
  try {
    const s = localStorage.getItem('nexus_session');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
};

const clearSession = () => {
  localStorage.removeItem('nexus_session');
};

const saveSettings = (s: AppSettings) => {
  localStorage.setItem('nexus_settings', JSON.stringify(s));
};

const getActualVersion = (): string => {
  const savedVersion = localStorage.getItem('nexus_app_version');
  return savedVersion || APP_VERSION;
};

const getLatestVersion = (): string => {
  const latest = CHANGELOG[0];
  return latest ? latest.version.replace('v', '') : APP_VERSION;
};

const getLatestChanges = (): string[] => {
  const latest = CHANGELOG[0];
  return latest ? latest.changes : ['Bug fixes and improvements'];
};

export default function Settings({ settings, setSettings, onDataCleared }: SettingsProps) {
  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<'account' | 'trading' | 'recovery' | 'profile' | 'version' | 'data'>('account');
  const [clearSuccess, setClearSuccess] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<{ available: boolean; version: string; build: string; changes: string[] } | null>(null);
  const [updateChecked, setUpdateChecked] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const user = getSession();
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    country: user?.country || '',
    timezone: user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    twoFactorEnabled: user?.twoFactorEnabled || false,
  });

  const [accountBalances, setAccountBalances] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('nexus_account_balances');
    if (saved) {
      try { return JSON.parse(saved); } catch { return {}; }
    }
    const defaults: Record<string, number> = {};
    ACCOUNT_TYPES.forEach(acc => { defaults[acc.id] = 0; });
    defaults.investment = settings.accountBalance || 10000;
    return defaults;
  });

  useEffect(() => {
    const latestVersion = getLatestVersion();
    const currentVersion = getActualVersion();
    if (currentVersion !== latestVersion) {
      setUpdateAvailable({
        available: true,
        version: latestVersion,
        build: APP_BUILD,
        changes: getLatestChanges(),
      });
    } else {
      setUpdateAvailable(null);
    }
  }, []);

  const handleSave = () => {
    const match = WORLD_CURRENCIES.find(c => c.code === form.currency);
    if (match) form.currencySymbol = match.symbol;
    setSettings(form);
    saveSettings(form);
    localStorage.setItem('nexus_account_balances', JSON.stringify(accountBalances));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setForm({ ...defaultSettings });
    const defaults: Record<string, number> = {};
    ACCOUNT_TYPES.forEach(acc => { defaults[acc.id] = 0; });
    defaults.investment = defaultSettings.accountBalance || 10000;
    setAccountBalances(defaults);
  };

  const handleBalanceChange = (accountId: string, value: number) => {
    setAccountBalances(prev => ({
      ...prev,
      [accountId]: value
    }));
  };

  const getTotalBalance = () => {
    return Object.values(accountBalances).reduce((sum, val) => sum + val, 0);
  };

  const handleClearData = () => {
    if (confirm('⚠️ Are you sure you want to clear ALL trading data? This cannot be undone.')) {
      const session = localStorage.getItem('nexus_session');
      const users = localStorage.getItem('nexus_users');
      const dataKeys = [
        'nexus_trades', 'nexus_goals', 'nexus_recovery', 'nexus_psychology',
        'nexus_settings', 'nexus_daily_logs', 'nexus_fixed_time_trades',
        'nexus_account_balances', 'nexus_warnings', 'nexus_deposits',
        'nexus_withdrawals', 'account_analysis_transactions'
      ];
      dataKeys.forEach(key => localStorage.removeItem(key));
      if (session) localStorage.setItem('nexus_session', session);
      if (users) localStorage.setItem('nexus_users', users);
      const defaults: Record<string, number> = {};
      ACCOUNT_TYPES.forEach(acc => { defaults[acc.id] = 0; });
      defaults.investment = 10000;
      setAccountBalances(defaults);
      setForm({ ...defaultSettings });
      setSettings(defaultSettings);
      setClearSuccess(true);
      setTimeout(() => setClearSuccess(false), 3000);
      if (onDataCleared) onDataCleared();
      alert('✅ All trading data has been cleared successfully.');
    }
  };

  const handleExportAll = () => {
    const keys = ['nexus_trades', 'nexus_goals', 'nexus_recovery', 'nexus_psychology', 'nexus_settings', 'nexus_daily_logs', 'nexus_fixed_time_trades', 'nexus_account_balances', 'account_analysis_transactions'];
    const data: Record<string, string | null> = { exportDate: new Date().toISOString(), version: getActualVersion(), build: APP_BUILD };
    keys.forEach(k => data[k] = localStorage.getItem(k));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `nexus_backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportAll = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          const session = localStorage.getItem('nexus_session');
          const users = localStorage.getItem('nexus_users');
          const keys = ['nexus_trades', 'nexus_goals', 'nexus_recovery', 'nexus_psychology', 'nexus_settings', 'nexus_daily_logs', 'nexus_fixed_time_trades', 'nexus_account_balances', 'account_analysis_transactions'];
          keys.forEach(k => localStorage.removeItem(k));
          Object.keys(data).forEach(key => {
            if (key.startsWith('nexus_') && data[key]) {
              localStorage.setItem(key, data[key]);
            }
            if (key === 'account_analysis_transactions' && data[key]) {
              localStorage.setItem(key, data[key]);
            }
          });
          if (session) localStorage.setItem('nexus_session', session);
          if (users) localStorage.setItem('nexus_users', users);
          if (onDataCleared) onDataCleared();
          alert('✅ Data imported successfully!');
        } catch { alert('Invalid backup file'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleLogout = () => {
    clearSession();
    window.location.reload();
  };

  const handleProfileSave = () => {
    if (user) {
      const updated: UserProfile = { ...user, displayName: profileForm.displayName, country: profileForm.country, timezone: profileForm.timezone, twoFactorEnabled: profileForm.twoFactorEnabled };
      localStorage.setItem('nexus_session', JSON.stringify(updated));
      if (profileForm.twoFactorEnabled) {
        localStorage.setItem('nexus_2fa_' + user.email, 'enabled');
      } else {
        localStorage.removeItem('nexus_2fa_' + user.email);
      }
    }
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateChecked(false);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const latestVersion = getLatestVersion();
      const currentVersion = getActualVersion();
      const isAvailable = latestVersion !== currentVersion;
      if (isAvailable) {
        const changes = getLatestChanges();
        setUpdateAvailable({
          available: true,
          version: latestVersion,
          build: APP_BUILD,
          changes: changes,
        });
        if (confirm(`🔄 Update Available!\n\nCurrent: v${currentVersion}\nLatest: v${latestVersion}\n\nWhat's New:\n${changes.map(c => `  • ${c}`).join('\n')}\n\nView full changelog?`)) {
          setShowChangelog(true);
        }
      } else {
        const changelogEntry = CHANGELOG.find(c => c.version === `v${currentVersion}`);
        const changes = changelogEntry?.changes || ['Bug fixes and improvements'];
        alert(`✅ Latest version!\n\nNEXUS T.R.O.S. v${currentVersion}\nBuild: ${APP_BUILD}\n\n${changes.map(c => `  • ${c}`).join('\n')}`);
      }
      setUpdateChecked(true);
    } catch (error) {
      console.error('Update check error:', error);
      alert(`NEXUS T.R.O.S. v${getActualVersion()}\nBuild: ${APP_BUILD}\n\n✅ You are running the latest version.`);
      setUpdateChecked(true);
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleApplyUpdate = () => {
    const latestVersion = getLatestVersion();
    if (confirm(`🔄 Apply Update to v${latestVersion}?\n\nThis will refresh the app with the latest version.`)) {
      localStorage.setItem('nexus_app_version', latestVersion);
      localStorage.setItem('nexus_app_build', APP_BUILD);
      setUpdateAvailable(null);
      window.location.reload();
    }
  };

  const sections = [
    { id: 'account' as const, label: 'Account Settings', icon: <DollarSign size={14} /> },
    { id: 'trading' as const, label: 'Trading Limits', icon: <Shield size={14} /> },
    { id: 'recovery' as const, label: 'Recovery & Alerts', icon: <Bell size={14} /> },
    { id: 'profile' as const, label: 'User Profile', icon: <User size={14} /> },
    { id: 'version' as const, label: 'Version & Updates', icon: <Info size={14} /> },
    { id: 'data' as const, label: 'Data Management', icon: <Database size={14} /> },
  ];

  const displayVersion = getActualVersion();

  return (
    <div className="flex gap-6 max-w-5xl">
      {/* Sidebar */}
      <div className="w-48 flex-shrink-0 space-y-1">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${activeSection === s.id ? 'bg-[rgba(0,255,136,0.1)] text-[#00ff88] border border-[rgba(0,255,136,0.2)]' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
            {s.icon} {s.label}
          </button>
        ))}
        <div className="border-t border-[rgba(30,42,58,0.5)] my-3" />
        <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium text-[#ff3366] hover:bg-[rgba(255,51,102,0.1)] transition-all">
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
            <SettingsIcon size={24} className="text-gray-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-300">Settings</h2>
            <p className="text-xs text-gray-500 mt-1">Configure your trading system</p>
          </div>
          <div className="flex-1" />
          {user && <div className="text-right"><div className="text-xs text-[#00ff88]">{user.displayName}</div><div className="text-[10px] text-gray-500">{user.email}</div></div>}
        </motion.div>

        {saved && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.3)] text-[#00ff88] text-sm flex items-center gap-2"><Save size={14} /> Settings saved!</motion.div>}
        {profileSaved && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.3)] text-[#00ff88] text-sm flex items-center gap-2"><CheckCircle2 size={14} /> Profile updated!</motion.div>}
        {clearSuccess && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.3)] text-[#00ff88] text-sm flex items-center gap-2"><CheckCircle2 size={14} /> All trading data cleared successfully!</motion.div>}

        {/* Update Available Banner */}
        {updateAvailable?.available && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-lg bg-[rgba(255,221,0,0.1)] border-2 border-[rgba(255,221,0,0.3)] flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[rgba(255,221,0,0.2)] flex items-center justify-center animate-pulse">
                <DownloadCloud size={20} className="text-[#ffdd00]" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#ffdd00]">🔄 Update Available!</div>
                <div className="text-xs text-gray-400">Version {updateAvailable.version} is now available. Build: {updateAvailable.build}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowChangelog(true)} className="px-3 py-1.5 rounded-lg bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] text-xs font-bold hover:bg-[rgba(0,212,255,0.2)] transition-all">View Changes</button>
              <button onClick={handleApplyUpdate} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#ffdd00] to-[#ff8800] text-black text-xs font-bold hover:opacity-90 transition-all shadow-[0_0_20px_rgba(255,221,0,0.2)]">Update Now</button>
            </div>
          </motion.div>
        )}

        {/* Changelog Modal */}
        <AnimatePresence>
          {showChangelog && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowChangelog(false)}>
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="glass-card p-6 w-[520px] max-h-[80vh] overflow-y-auto neon-border-animated" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[#00d4ff] flex items-center gap-2"><Sparkles size={20} /> Changelog</h3>
                  <button onClick={() => setShowChangelog(false)} className="p-1 hover:bg-[rgba(30,42,58,0.5)] rounded-lg transition-all text-gray-400 hover:text-white">✕</button>
                </div>
                <div className="space-y-4">
                  {CHANGELOG.map((entry, index) => {
                    const isCurrent = entry.version === `v${displayVersion}`;
                    return (
                      <div key={index} className={`border-b border-[rgba(30,42,58,0.3)] pb-3 last:border-0 ${isCurrent ? 'bg-[rgba(0,255,136,0.03)] p-3 rounded-lg' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${isCurrent ? 'text-[#00ff88]' : 'text-gray-300'}`}>{entry.version}</span>
                            {isCurrent && <span className="text-[8px] px-2 py-0.5 rounded bg-[rgba(0,255,136,0.1)] text-[#00ff88] border border-[rgba(0,255,136,0.2)]">Current</span>}
                          </div>
                          <span className="text-[10px] text-gray-500">{entry.date}</span>
                        </div>
                        <ul className="mt-2 space-y-1">
                          {entry.changes.map((change, ci) => (
                            <li key={ci} className="text-xs text-gray-400 flex items-start gap-2"><span className="text-[#00d4ff]">•</span>{change}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => setShowChangelog(false)} className="w-full mt-4 py-2.5 rounded-lg bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold hover:opacity-90 transition-all shadow-[0_0_30px_rgba(0,255,136,0.15)]">Close</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Account Settings */}
        {activeSection === 'account' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"><Wallet size={14} className="text-[#00d4ff]" /> Account & Currency</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Currency</label>
                <select className="cyber-select" value={form.currency} onChange={e => { const match = WORLD_CURRENCIES.find(c => c.code === e.target.value); setForm({ ...form, currency: e.target.value, currencySymbol: match?.symbol || '$' }); }}>
                  {WORLD_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
                </select>
                <p className="text-[10px] text-gray-600 mt-1">Symbol: <span className="text-[#00d4ff] font-bold">{WORLD_CURRENCIES.find(c => c.code === form.currency)?.symbol || '$'}</span></p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Total Balance</label>
                <div className="cyber-input text-xl font-bold text-[#00ff88] flex items-center gap-2"><Wallet size={20} /> {form.currencySymbol}{getTotalBalance().toLocaleString()}</div>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><ArrowUpDown size={12} /> Account Balances</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ACCOUNT_TYPES.map(acc => (
                  <div key={acc.id} className="p-3 rounded-lg bg-[rgba(30,42,58,0.3)] border border-[rgba(255,255,255,0.05)]">
                    <div className="flex items-center gap-2 mb-2">
                      <span style={{ color: acc.color }}>{acc.icon}</span>
                      <span className="text-xs text-gray-300">{acc.label}</span>
                    </div>
                    <input className="cyber-input" type="number" min="0" step="100" value={accountBalances[acc.id] || 0} onChange={e => handleBalanceChange(acc.id, parseFloat(e.target.value) || 0)} style={{ borderColor: acc.color + '40' }} />
                    <div className="text-[10px] text-gray-500 mt-1">{form.currencySymbol}{(accountBalances[acc.id] || 0).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={handleReset} className="cyber-button flex items-center gap-2 text-gray-400"><RotateCcw size={14} /> Reset Defaults</button>
              <button onClick={handleSave} className="cyber-button flex items-center gap-2"><Save size={14} /> Save</button>
            </div>
          </motion.div>
        )}

        {/* Trading Limits */}
        {activeSection === 'trading' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"><Shield size={14} className="text-[#00ff88]" /> Trading Limits</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Daily Trade Limit</label>
                <input className="cyber-input" type="number" min="1" max="100" value={form.dailyTradeLimit} onChange={e => setForm({ ...form, dailyTradeLimit: parseInt(e.target.value) || 20 })} />
                <p className="text-[10px] text-gray-600 mt-1">Max trades per day (default: 20)</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Daily Loss Limit</label>
                <input className="cyber-input" type="number" min="1" max="50" value={form.dailyLossLimit} onChange={e => setForm({ ...form, dailyLossLimit: parseInt(e.target.value) || 10 })} />
                <p className="text-[10px] text-gray-600 mt-1">Max losing trades per day (default: 10)</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Max Risk Per Trade (%)</label>
                <input className="cyber-input" type="number" min="0.1" max="100" step="0.1" value={form.maxRiskPerTrade} onChange={e => setForm({ ...form, maxRiskPerTrade: parseFloat(e.target.value) || 1 })} />
                <p className="text-[10px] text-gray-600 mt-1">Risk per trade (default: 1%)</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Cooldown After Loss (min)</label>
                <input className="cyber-input" type="number" min="1" max="480" value={form.cooldownAfterLoss} onChange={e => setForm({ ...form, cooldownAfterLoss: parseInt(e.target.value) || 30 })} />
                <p className="text-[10px] text-gray-600 mt-1">Break after losing trades (default: 30)</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleSave} className="cyber-button flex items-center gap-2"><Save size={14} /> Save</button>
            </div>
          </motion.div>
        )}

        {/* Recovery & Alerts */}
        {activeSection === 'recovery' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"><Bell size={14} className="text-[#ff3366]" /> Recovery & Protection</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Consecutive Loss Threshold</label>
                <input className="cyber-input" type="number" min="2" max="20" value={form.consecutiveLossThreshold} onChange={e => setForm({ ...form, consecutiveLossThreshold: parseInt(e.target.value) || 3 })} />
                <p className="text-[10px] text-gray-600 mt-1">Losses before recovery (default: 3)</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Drawdown Threshold (%)</label>
                <input className="cyber-input" type="number" min="1" max="80" value={form.drawdownThreshold} onChange={e => setForm({ ...form, drawdownThreshold: parseFloat(e.target.value) || 10 })} />
                <p className="text-[10px] text-gray-600 mt-1">Drawdown before recovery (default: 10%)</p>
              </div>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.recoveryAutoActivate} onChange={e => setForm({ ...form, recoveryAutoActivate: e.target.checked })} className="w-4 h-4 rounded accent-[#00ff88]" />
                <span className="text-xs text-gray-400">Auto-activate Recovery Mode when thresholds exceeded</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.voiceEnabled} onChange={e => setForm({ ...form, voiceEnabled: e.target.checked })} className="w-4 h-4 rounded accent-[#00ff88]" />
                <span className="text-xs text-gray-400">Enable voice feedback from AI assistant</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.soundEnabled} onChange={e => setForm({ ...form, soundEnabled: e.target.checked })} className="w-4 h-4 rounded accent-[#00ff88]" />
                <span className="text-xs text-gray-400">Enable sound notifications</span>
              </label>
            </div>
            <div className="flex justify-end">
              <button onClick={handleSave} className="cyber-button flex items-center gap-2"><Save size={14} /> Save</button>
            </div>
          </motion.div>
        )}

        {/* User Profile */}
        {activeSection === 'profile' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"><User size={14} className="text-[#a855f7]" /> User Profile</h3>
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-[rgba(30,42,58,0.3)]">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#00ff88] to-[#00d4ff] flex items-center justify-center text-black text-xl font-bold">{(user.displayName || 'U')[0].toUpperCase()}</div>
                  <div><div className="text-sm font-bold text-gray-200">{user.displayName}</div><div className="text-xs text-gray-500">{user.email}</div><div className="text-[10px] text-gray-600">Member since {new Date(user.createdAt).toLocaleDateString()}</div></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-xs text-gray-500 mb-1 block">Display Name</label><input className="cyber-input" value={profileForm.displayName} onChange={e => setProfileForm({ ...profileForm, displayName: e.target.value })} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Email (read-only)</label><input className="cyber-input" value={profileForm.email} disabled style={{ opacity: 0.5 }} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Country</label><input className="cyber-input" placeholder="e.g. India" value={profileForm.country} onChange={e => setProfileForm({ ...profileForm, country: e.target.value })} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Timezone</label><input className="cyber-input" value={profileForm.timezone} onChange={e => setProfileForm({ ...profileForm, timezone: e.target.value })} /></div>
                </div>
                <div className="space-y-3 p-4 rounded-lg bg-[rgba(30,42,58,0.3)]">
                  <h4 className="text-xs font-bold text-gray-400 flex items-center gap-2"><Lock size={12} /> Security</h4>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={profileForm.twoFactorEnabled} onChange={e => setProfileForm({ ...profileForm, twoFactorEnabled: e.target.checked })} className="w-4 h-4 rounded accent-[#00ff88]" />
                    <Smartphone size={14} className="text-gray-500" />
                    <span className="text-xs text-gray-400">Enable Two-Factor Authentication (2FA)</span>
                  </label>
                  <p className="text-[10px] text-gray-600">When enabled, you'll need to enter a verification code on each login.</p>
                </div>
                <div className="flex justify-end">
                  <button onClick={handleProfileSave} className="cyber-button flex items-center gap-2"><Save size={14} /> Update Profile</button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">Not signed in.</div>
            )}
          </motion.div>
        )}

        {/* Version & Updates */}
        {activeSection === 'version' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"><Info size={14} className="text-[#00d4ff]" /> Version & Updates</h3>
            <div className="p-5 rounded-lg bg-[rgba(30,42,58,0.3)] space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00ff88] to-[#00d4ff] flex items-center justify-center shadow-[0_0_30px_rgba(0,255,136,0.15)]"><Zap size={28} className="text-black" /></div>
                <div>
                  <div className="text-lg font-bold text-[#00ff88]">NEXUS T.R.O.S.</div>
                  <div className="text-xs text-gray-400">AI Trading Recovery Operating System</div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="p-3 rounded-lg bg-[rgba(0,255,136,0.05)] text-center">
                  <div className="text-[9px] text-gray-500">VERSION</div>
                  <div className="text-sm font-bold text-[#00ff88]">v{displayVersion}</div>
                </div>
                <div className="p-3 rounded-lg bg-[rgba(0,212,255,0.05)] text-center">
                  <div className="text-[9px] text-gray-500">BUILD</div>
                  <div className="text-sm font-bold text-[#00d4ff]">{APP_BUILD}</div>
                </div>
                <div className="p-3 rounded-lg bg-[rgba(168,85,247,0.05)] text-center">
                  <div className="text-[9px] text-gray-500">ENGINE</div>
                  <div className="text-sm font-bold text-[#a855f7]">React 19</div>
                </div>
                <div className="p-3 rounded-lg bg-[rgba(255,221,0,0.05)] text-center">
                  <div className="text-[9px] text-gray-500">STATUS</div>
                  <div className={`text-sm font-bold ${updateAvailable?.available ? 'text-[#ffdd00]' : 'text-[#00ff88]'}`}>
                    {updateAvailable?.available ? '⚠️ Update Available' : '✓ Latest'}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleCheckUpdate} disabled={checkingUpdate} className="cyber-button flex items-center gap-2"><RefreshCw size={14} className={checkingUpdate ? 'animate-spin' : ''} /> {checkingUpdate ? 'Checking...' : 'Check for Updates'}</button>
              <button onClick={() => setShowChangelog(true)} className="cyber-button-primary flex items-center gap-2"><Sparkles size={14} /> View Changelog</button>
              {updateAvailable?.available && <button onClick={handleApplyUpdate} className="cyber-button-success flex items-center gap-2 animate-pulse"><Download size={14} /> Update Now</button>}
            </div>
            {updateChecked && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className={`p-3 rounded-lg ${updateAvailable?.available ? 'bg-[rgba(255,221,0,0.1)] border border-[rgba(255,221,0,0.2)]' : 'bg-[rgba(0,255,136,0.05)] border border-[rgba(0,255,136,0.1)]'}`}>
                <div className="flex items-center gap-2">
                  {updateAvailable?.available ? (
                    <><AlertTriangle size={14} className="text-[#ffdd00]" /><span className="text-xs text-[#ffdd00]">New version {updateAvailable.version} available! Build: {updateAvailable.build}</span></>
                  ) : (
                    <><CheckCircle2 size={14} className="text-[#00ff88]" /><span className="text-xs text-[#00ff88]">You are running the latest version of NEXUS T.R.O.S.</span></>
                  )}
                </div>
                {updateAvailable?.available && updateAvailable.changes.length > 0 && (
                  <div className="mt-2 text-[10px] text-gray-400">
                    <span className="font-bold">What's new:</span>
                    <ul className="mt-1 space-y-0.5">
                      {updateAvailable.changes.slice(0, 3).map((change, i) => (
                        <li key={i} className="flex items-start gap-1"><span className="text-[#00d4ff]">•</span> {change}</li>
                      ))}
                      {updateAvailable.changes.length > 3 && <li className="text-[#00d4ff]">+ {updateAvailable.changes.length - 3} more changes...</li>}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Data Management */}
        {activeSection === 'data' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"><Database size={14} className="text-[#a855f7]" /> Data Management</h3>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleExportAll} className="cyber-button flex items-center gap-2"><Database size={14} /> Export All Data</button>
              <button onClick={handleImportAll} className="cyber-button flex items-center gap-2"><Database size={14} /> Import Backup</button>
              <button onClick={handleClearData} className="cyber-button cyber-button-danger flex items-center gap-2"><RotateCcw size={14} /> Clear Trading Data</button>
            </div>
            <p className="text-[10px] text-gray-600">All data stored locally in browser. Export regularly to prevent data loss. Account credentials are preserved when clearing trading data.</p>
          </motion.div>
        )}
      </div>

      <style>{`
        .glass-card {
          background: rgba(10,25,30,0.6);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          border: 1px solid rgba(0,255,200,0.15);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .cyber-button {
          padding: 8px 20px;
          background: rgba(0,255,200,0.1);
          border: 1px solid rgba(0,255,200,0.3);
          border-radius: 40px;
          color: #00ffc3;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cyber-button:hover {
          background: rgba(0,255,200,0.2);
        }
        .cyber-button-danger {
          border-color: rgba(255,51,102,0.3);
          color: #ff3366;
        }
        .cyber-button-danger:hover {
          background: rgba(255,51,102,0.15);
        }
        .cyber-button-success {
          border-color: rgba(0,255,136,0.3);
          color: #00ff88;
        }
        .cyber-button-success:hover {
          background: rgba(0,255,136,0.15);
        }
        .cyber-button-primary {
          border-color: rgba(0,212,255,0.3);
          color: #00d4ff;
        }
        .cyber-button-primary:hover {
          background: rgba(0,212,255,0.15);
        }
        .cyber-input {
          width: 100%;
          padding: 8px 12px;
          background: rgba(0,20,25,0.7);
          border: 1px solid rgba(0,255,200,0.2);
          border-radius: 12px;
          color: #c8e6ff;
          outline: none;
        }
        .cyber-input:focus {
          border-color: #00ffc3;
          box-shadow: 0 0 20px rgba(0,255,200,0.1);
        }
        .cyber-select {
          width: 100%;
          padding: 8px 12px;
          background: rgba(0,20,25,0.7);
          border: 1px solid rgba(0,255,200,0.2);
          border-radius: 12px;
          color: #c8e6ff;
          outline: none;
        }
        .cyber-select:focus {
          border-color: #00ffc3;
        }
        .neon-border-animated {
          position: relative;
          overflow: hidden;
        }
        .neon-border-animated::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 26px;
          padding: 2px;
          background: conic-gradient(from 0deg, #00ff88, #00d4ff, #a855f7, #ffdd00, #00ff88);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: rotate-border 6s linear infinite;
        }
        @keyframes rotate-border {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}