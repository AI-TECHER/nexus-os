import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PageType, Trade, RecoveryState, AppSettings, AIWarning } from './types';
import {
  getTrades, getSettings, getRecovery, saveRecovery, getWarnings, saveWarnings,
  shouldActivateRecovery, analyzeForWarnings, saveTrades
} from './store';

import SplashScreen from './components/SplashScreen';
import AuthScreen, { getSession } from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import FloatingAssistant from './components/FloatingAssistant';
import WarningModal from './components/WarningModal';

import Dashboard from './pages/Dashboard';
import TradeEntry from './pages/TradeEntry';
import Analytics from './pages/Analytics';
import Graphs from './pages/Graphs';
import RecoveryMode from './pages/RecoveryMode';
import AIIntelligence from './pages/AIIntelligence';
import VoiceAssistant from './pages/VoiceAssistant';
import Psychology from './pages/Psychology';
import RiskManagement from './pages/RiskManagement';
import TradingCalendar from './pages/TradingCalendar';
import Reports from './pages/Reports';
import Goals from './pages/Goals';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Help from './pages/Help';
import OlympTradePage from './pages/OlympTrade';
import AccountAnalysis from './pages/AccountAnalysis';

// Utility function to parse currency values to numbers
const parseCurrencyValue = (value: any): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    let cleaned = value.replace(/[^0-9.\-]/g, '');
    if (cleaned === '' || cleaned === '-' || cleaned === '.') return 0;
    const num = parseFloat(cleaned);
    if (isNaN(num)) return 0;
    return num;
  }
  return 0;
};

// Function to fix existing trade data
const fixExistingTrades = () => {
  try {
    const trades = getTrades();
    let fixed = false;
    
    const fixedTrades = trades.map(t => {
      let modified = false;
      const newTrade = { ...t };
      
      if (typeof t.profitLoss === 'string') {
        newTrade.profitLoss = parseCurrencyValue(t.profitLoss);
        modified = true;
      }
      if (typeof t.amount === 'string') {
        newTrade.amount = parseCurrencyValue(t.amount);
        modified = true;
      }
      if (typeof t.entryPrice === 'string') {
        newTrade.entryPrice = parseCurrencyValue(t.entryPrice);
        modified = true;
      }
      if (typeof t.exitPrice === 'string') {
        newTrade.exitPrice = parseCurrencyValue(t.exitPrice);
        modified = true;
      }
      if (typeof t.stopLoss === 'string') {
        newTrade.stopLoss = parseCurrencyValue(t.stopLoss);
        modified = true;
      }
      if (typeof t.takeProfit === 'string') {
        newTrade.takeProfit = parseCurrencyValue(t.takeProfit);
        modified = true;
      }
      if (typeof t.riskPercent === 'string') {
        newTrade.riskPercent = parseCurrencyValue(t.riskPercent);
        modified = true;
      }
      
      if (modified) {
        newTrade.isWin = newTrade.profitLoss > 0;
        fixed = true;
      }
      
      return newTrade;
    });
    
    if (fixed) {
      console.log('🔧 Fixed existing trade data');
      saveTrades(fixedTrades);
      return fixedTrades;
    }
    
    return trades;
  } catch (error) {
    console.error('Error fixing trades:', error);
    return getTrades();
  }
};

// Function to fix Fixed Time Trade data
const fixFixedTimeTrades = () => {
  try {
    const ftTrades = JSON.parse(localStorage.getItem('nexus_fixed_time_trades') || '[]');
    let fixed = false;
    
    const fixedTrades = ftTrades.map((t: any) => {
      let modified = false;
      const newTrade = { ...t };
      
      if (typeof t.tradePnl === 'string') {
        newTrade.tradePnl = parseCurrencyValue(t.tradePnl);
        modified = true;
      }
      if (typeof t.tradeAmount === 'string') {
        newTrade.tradeAmount = parseCurrencyValue(t.tradeAmount);
        modified = true;
      }
      if (typeof t.payoutPercent === 'string') {
        newTrade.payoutPercent = parseCurrencyValue(t.payoutPercent);
        modified = true;
      }
      
      if (modified) {
        fixed = true;
      }
      
      return newTrade;
    });
    
    if (fixed) {
      console.log('🔧 Fixed existing fixed-time trade data');
      localStorage.setItem('nexus_fixed_time_trades', JSON.stringify(fixedTrades));
    }
  } catch (error) {
    console.error('Error fixing fixed-time trades:', error);
  }
};

// Function to fix Psychology entries
const fixPsychologyEntries = () => {
  try {
    const entries = JSON.parse(localStorage.getItem('nexus_psychology') || '[]');
    let fixed = false;
    
    const fixedEntries = entries.map((e: any) => {
      let modified = false;
      const newEntry = { ...e };
      
      ['emotionalStability', 'disciplineScore', 'confidenceLevel', 'stressLevel', 'fearGreedBalance', 'patienceLevel'].forEach(key => {
        if (typeof e[key] === 'string') {
          newEntry[key] = parseCurrencyValue(e[key]);
          modified = true;
        }
      });
      
      if (modified) {
        fixed = true;
      }
      
      return newEntry;
    });
    
    if (fixed) {
      console.log('🔧 Fixed existing psychology entries');
      localStorage.setItem('nexus_psychology', JSON.stringify(fixedEntries));
    }
  } catch (error) {
    console.error('Error fixing psychology entries:', error);
  }
};

// Function to fix Recovery state
const fixRecoveryState = () => {
  try {
    const recovery = JSON.parse(localStorage.getItem('nexus_recovery') || 'null');
    if (recovery) {
      let modified = false;
      
      ['drawdownPercent', 'recoveryProgress', 'safeTradesCompleted', 'safeTradesRequired', 'cooldownMinutes', 'consecutiveLosses'].forEach(key => {
        if (typeof recovery[key] === 'string') {
          recovery[key] = parseCurrencyValue(recovery[key]);
          modified = true;
        }
      });
      
      if (modified) {
        console.log('🔧 Fixed existing recovery state');
        localStorage.setItem('nexus_recovery', JSON.stringify(recovery));
      }
    }
  } catch (error) {
    console.error('Error fixing recovery state:', error);
  }
};

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [authed, setAuthed] = useState(() => !!getSession());
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [trades, setTrades] = useState<Trade[]>(() => {
    const fixedTrades = fixExistingTrades();
    fixFixedTimeTrades();
    fixPsychologyEntries();
    fixRecoveryState();
    return fixedTrades;
  });
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [recovery, setRecoveryState] = useState<RecoveryState>(getRecovery());
  const [warnings, setWarningsState] = useState<AIWarning[]>(getWarnings());
  const [showWarnings, setShowWarnings] = useState(false);
  const [dataVersion, setDataVersion] = useState(0); // Force re-render when data changes
  const [accountAnalysisKey, setAccountAnalysisKey] = useState(0); // Force Account Analysis refresh

  // Function to refresh app data without reloading
  const refreshAppData = useCallback(() => {
    // Get fresh data from localStorage
    const freshTrades = getTrades();
    const freshSettings = getSettings();
    const freshRecovery = getRecovery();
    const freshWarnings = getWarnings();
    
    // Update all state with fresh data
    setTrades(freshTrades);
    setSettings(freshSettings);
    setRecoveryState(freshRecovery);
    setWarningsState(freshWarnings);
    
    // Increment version to force re-render of all components
    setDataVersion(prev => prev + 1);
    setAccountAnalysisKey(prev => prev + 1); // Force Account Analysis to reload
    
    console.log('🔄 App data refreshed without reload');
  }, []);

  // Auto-check for recovery activation
  useEffect(() => {
    if (settings.recoveryAutoActivate && !recovery.active && trades.length > 0) {
      const check = shouldActivateRecovery(trades, settings);
      if (check.activate) {
        const newRecovery: RecoveryState = {
          ...recovery,
          active: true,
          activatedAt: new Date().toISOString(),
          reason: check.reason,
          dailyTradeLimit: Math.max(1, Math.floor(settings.dailyTradeLimit / 2)),
          cooldownMinutes: settings.cooldownAfterLoss * 2,
          lastCooldownStart: new Date().toISOString(),
          safeTradesRequired: 10,
          safeTradesCompleted: 0,
          recoveryProgress: 0,
        };
        setRecoveryState(newRecovery);
        saveRecovery(newRecovery);
      }
    }
  }, [trades, settings, recovery]);

  // Run warning analysis when trades change
  useEffect(() => {
    if (trades.length > 0) {
      const newWarnings = analyzeForWarnings(trades, settings);
      if (newWarnings.length > 0) {
        const existing = getWarnings();
        const merged = [...newWarnings, ...existing].slice(0, 50);
        setWarningsState(merged);
        saveWarnings(merged);
      }
    }
  }, [trades, settings]);

  const handleSetRecovery = useCallback((r: RecoveryState) => {
    setRecoveryState(r);
    saveRecovery(r);
  }, []);

  const handleNewWarnings = useCallback((newWarnings: AIWarning[]) => {
    const existing = getWarnings();
    const merged = [...newWarnings, ...existing].slice(0, 50);
    setWarningsState(merged);
    saveWarnings(merged);
    if (newWarnings.some(w => w.severity === 'critical' || w.severity === 'high')) {
      setShowWarnings(true);
    }
  }, []);

  const dismissWarning = useCallback((id: string) => {
    const updated = warnings.map(w => w.id === id ? { ...w, dismissed: true } : w);
    setWarningsState(updated);
    saveWarnings(updated);
  }, [warnings]);

  const dismissAllWarnings = useCallback(() => {
    const updated = warnings.map(w => ({ ...w, dismissed: true }));
    setWarningsState(updated);
    saveWarnings(updated);
  }, [warnings]);

  const getAvailableBalance = useCallback(() => {
    const regularPnL = trades.reduce((sum, t) => {
      const pnl = typeof t.profitLoss === 'number' ? t.profitLoss : parseCurrencyValue(t.profitLoss);
      return sum + pnl;
    }, 0);
    
    const fixedTimePnL = (() => {
      try {
        const ftTrades = JSON.parse(localStorage.getItem('nexus_fixed_time_trades') || '[]');
        return ftTrades
          .filter((t: { status: string }) => t.status === 'WON' || t.status === 'LOST' || t.status === 'REFUND')
          .reduce((sum: number, t: { tradePnl: number }) => {
            const pnl = typeof t.tradePnl === 'number' ? t.tradePnl : parseCurrencyValue(t.tradePnl);
            return sum + (pnl || 0);
          }, 0);
      } catch { return 0; }
    })();
    
    return settings.accountBalance + regularPnL + fixedTimePnL;
  }, [trades, settings.accountBalance]);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard key={`dashboard-${dataVersion}`} trades={trades} recovery={recovery} settings={settings} />;
      case 'trade-entry':
        return (
          <TradeEntry
            key={`trade-entry-${dataVersion}`}
            trades={trades}
            setTrades={setTrades}
            settings={settings}
            recovery={recovery}
            onWarnings={handleNewWarnings}
            getAvailableBalance={getAvailableBalance}
          />
        );
      case 'olymptrade':
        return (
          <OlympTradePage
            key={`olymptrade-${dataVersion}`}
            trades={trades}
            setTrades={setTrades}
            settings={settings}
            getAvailableBalance={getAvailableBalance}
          />
        );
      case 'analytics':
        return <Analytics key={`analytics-${dataVersion}`} trades={trades} settings={settings} />;
      case 'graphs':
        return <Graphs key={`graphs-${dataVersion}`} trades={trades} />;
      case 'recovery':
        return <RecoveryMode key={`recovery-${dataVersion}`} trades={trades} recovery={recovery} setRecovery={handleSetRecovery} settings={settings} />;
      case 'ai-intelligence':
        return <AIIntelligence key={`ai-${dataVersion}`} trades={trades} settings={settings} />;
      case 'voice-assistant':
        return <VoiceAssistant key={`voice-${dataVersion}`} trades={trades} settings={settings} onNavigate={setCurrentPage} />;
      case 'psychology':
        return <Psychology key={`psych-${dataVersion}`} trades={trades} settings={settings} />;
      case 'risk-management':
        return <RiskManagement key={`risk-${dataVersion}`} trades={trades} settings={settings} />;
      case 'calendar':
        return <TradingCalendar key={`calendar-${dataVersion}`} trades={trades} />;
      case 'reports':
        return <Reports key={`reports-${dataVersion}`} trades={trades} settings={settings} />;
      case 'goals':
        return <Goals key={`goals-${dataVersion}`} trades={trades} settings={settings} />;
      case 'settings':
        return (
          <Settings 
            key={`settings-${dataVersion}`}
            settings={settings} 
            setSettings={setSettings} 
            onDataCleared={refreshAppData}
          />
        );
      case 'profile':
        return <Profile key={`profile-${dataVersion}`} />;
      case 'help':
        return <Help key={`help-${dataVersion}`} />;
      case 'account-analysis':
        return <AccountAnalysis key={`account-analysis-${accountAnalysisKey}`} />;
      default:
        return <Dashboard key={`dashboard-${dataVersion}`} trades={trades} recovery={recovery} settings={settings} />;
    }
  };

  const pageTitle: Record<PageType, string> = {
    'dashboard': 'Dashboard',
    'trade-entry': 'Trade Terminal',
    'olymptrade': 'OlympTrade Platform',
    'analytics': 'Analytics',
    'graphs': 'Graphs & Charts',
    'recovery': 'Recovery Mode',
    'ai-intelligence': 'AI Intelligence',
    'voice-assistant': 'Voice Assistant',
    'psychology': 'Psychology Tracker',
    'risk-management': 'Risk Management',
    'calendar': 'Trading Calendar',
    'reports': 'Reports',
    'goals': 'Goals & Discipline',
    'settings': 'Settings',
    'profile': 'User Profile',
    'help': 'Help & About',
    'account-analysis': 'Account Analysis',
  };

  if (!authed) {
    return <AuthScreen onLogin={() => setAuthed(true)} />;
  }

  return (
    <>
      {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}

      <AnimatePresence>
        {splashDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex min-h-screen bg-dark-bg"
          >
            <Sidebar
              currentPage={currentPage}
              onNavigate={(page) => {
                console.log('🔄 Sidebar navigation to:', page);
                setCurrentPage(page);
              }}
              recoveryActive={recovery.active}
            />

            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
              <TopBar
                key={`topbar-${dataVersion}`}
                trades={trades}
                warnings={warnings}
                recovery={recovery}
                settings={settings}
                onShowWarnings={() => setShowWarnings(true)}
              />

              <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4"
                >
                  <h1 className="text-lg font-bold text-gray-200">
                    {pageTitle[currentPage] || currentPage}
                  </h1>
                  <div className="h-px bg-gradient-to-r from-[rgba(0,255,136,0.3)] via-[rgba(0,212,255,0.2)] to-transparent mt-2" />
                </motion.div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentPage + dataVersion}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderPage()}
                  </motion.div>
                </AnimatePresence>
              </main>
            </div>

            <FloatingAssistant
              key={`floating-${dataVersion}`}
              trades={trades}
              settings={settings}
              recovery={recovery}
            />

            <WarningModal
              warnings={warnings}
              onDismiss={dismissWarning}
              onDismissAll={dismissAllWarnings}
              isOpen={showWarnings}
              onClose={() => setShowWarnings(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}