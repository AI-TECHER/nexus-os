import { Trade, Goal, RecoveryState, PsychologyEntry, AIWarning, AppSettings, DailyLog, FixedTimeTrade, FixedTimeStatus } from './types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEYS = {
  trades: 'nexus_trades',
  goals: 'nexus_goals',
  recovery: 'nexus_recovery',
  psychology: 'nexus_psychology',
  warnings: 'nexus_warnings',
  settings: 'nexus_settings',
  dailyLogs: 'nexus_daily_logs',
  fixedTimeTrades: 'nexus_fixed_time_trades',
  deposits: 'nexus_deposits',
  withdrawals: 'nexus_withdrawals',
};

function load<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data));
}

export const defaultSettings: AppSettings = {
  dailyTradeLimit: 20,
  dailyLossLimit: 10,
  maxRiskPerTrade: 10,
  cooldownAfterLoss: 30,
  accountBalance: 10000,
  currency: 'USD',
  currencySymbol: '$',
  recoveryAutoActivate: true,
  consecutiveLossThreshold: 3,
  drawdownThreshold: 10,
  soundEnabled: true,
  voiceEnabled: true,
};

const defaultRecovery: RecoveryState = {
  active: false,
  activatedAt: '',
  reason: '',
  consecutiveLosses: 0,
  drawdownPercent: 0,
  dailyTradeLimit: 2,
  cooldownMinutes: 60,
  lastCooldownStart: '',
  emotionalScore: 70,
  recoveryProgress: 0,
  safeTradesCompleted: 0,
  safeTradesRequired: 10,
};

// ============================================================================
// CURRENCY HELPERS - ADD THIS
// ============================================================================

/**
 * Formats a number as currency with the negative sign BEFORE the currency symbol.
 * Example: -123.45 -> "-$123.45"
 */
export function formatCurrency(amount: number, currencySymbol: string = '$'): string {
  if (amount < 0) {
    return `-${currencySymbol}${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currencySymbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Parses a value to a number, handling strings with currency symbols.
 * Handles: "$ -124,186.55", "$-124,186.55", "-124186.55", etc.
 */
export function parseCurrencyValue(value: any): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove ALL non-numeric characters except the negative sign and decimal point
    let cleaned = value.replace(/[^0-9.\-]/g, '');
    if (cleaned === '' || cleaned === '-' || cleaned === '.') return 0;
    const num = parseFloat(cleaned);
    if (isNaN(num)) return 0;
    return num;
  }
  return 0;
}

/**
 * Safely formats any value as currency
 */
export function safeFormatCurrency(value: any, currencySymbol: string = '$'): string {
  const num = parseCurrencyValue(value);
  return formatCurrency(num, currencySymbol);
}

// ============================================================================
// DEPOSIT FUNCTIONS
// ============================================================================

export interface Deposit {
  id: string;
  date: string;
  amount: number;
  currency: string;
  note: string;
  createdAt: string;
}

export function getDeposits(): Deposit[] {
  return load<Deposit[]>(STORAGE_KEYS.deposits, []);
}

export function saveDeposits(deposits: Deposit[]) {
  save(STORAGE_KEYS.deposits, deposits);
}

export function addDeposit(amount: number, currency: string = 'USD', note: string = ''): Deposit {
  const deposits = getDeposits();
  const newDeposit: Deposit = {
    id: uuidv4(),
    date: new Date().toISOString().split('T')[0],
    amount,
    currency,
    note: note || 'Manual deposit',
    createdAt: new Date().toISOString(),
  };
  deposits.unshift(newDeposit);
  saveDeposits(deposits);
  return newDeposit;
}

export function deleteDeposit(id: string) {
  const deposits = getDeposits().filter(d => d.id !== id);
  saveDeposits(deposits);
}

export function getTotalDeposits(): number {
  const deposits = getDeposits();
  return deposits.reduce((sum, d) => sum + d.amount, 0);
}

// ============================================================================
// WITHDRAWAL FUNCTIONS
// ============================================================================

export interface Withdrawal {
  id: string;
  date: string;
  amount: number;
  currency: string;
  note: string;
  createdAt: string;
}

export function getWithdrawals(): Withdrawal[] {
  return load<Withdrawal[]>(STORAGE_KEYS.withdrawals, []);
}

export function saveWithdrawals(withdrawals: Withdrawal[]) {
  save(STORAGE_KEYS.withdrawals, withdrawals);
}

export function addWithdrawal(amount: number, currency: string = 'USD', note: string = ''): Withdrawal {
  const withdrawals = getWithdrawals();
  const newWithdrawal: Withdrawal = {
    id: uuidv4(),
    date: new Date().toISOString().split('T')[0],
    amount,
    currency,
    note: note || 'Manual withdrawal',
    createdAt: new Date().toISOString(),
  };
  withdrawals.unshift(newWithdrawal);
  saveWithdrawals(withdrawals);
  return newWithdrawal;
}

export function deleteWithdrawal(id: string) {
  const withdrawals = getWithdrawals().filter(w => w.id !== id);
  saveWithdrawals(withdrawals);
}

export function getTotalWithdrawals(): number {
  const withdrawals = getWithdrawals();
  return withdrawals.reduce((sum, w) => sum + w.amount, 0);
}

// ============================================================================
// TRADE FUNCTIONS
// ============================================================================

export function getTrades(): Trade[] {
  return load<Trade[]>(STORAGE_KEYS.trades, []);
}

export function saveTrades(trades: Trade[]) {
  save(STORAGE_KEYS.trades, trades);
}

export function addTrade(trade: Omit<Trade, 'id' | 'createdAt' | 'profitLoss' | 'profitLossPercent' | 'isWin' | 'riskRewardRatio'>): { trade: Trade; warnings: AIWarning[] } {
  const trades = getTrades();
  const settings = getSettings();

  const profitLoss = trade.direction === 'buy'
    ? (trade.exitPrice - trade.entryPrice) * trade.amount
    : (trade.entryPrice - trade.exitPrice) * trade.amount;

  const profitLossPercent = trade.entryPrice > 0
    ? ((trade.exitPrice - trade.entryPrice) / trade.entryPrice) * 100 * (trade.direction === 'buy' ? 1 : -1)
    : 0;

  const isWin = profitLoss > 0;
  const riskDistance = Math.abs(trade.entryPrice - trade.stopLoss);
  const rewardDistance = Math.abs(trade.takeProfit - trade.entryPrice);
  const riskRewardRatio = riskDistance > 0 ? rewardDistance / riskDistance : 0;

  const newTrade: Trade = {
    ...trade,
    id: uuidv4(),
    profitLoss: Math.round(profitLoss * 100) / 100,
    profitLossPercent: Math.round(profitLossPercent * 100) / 100,
    isWin,
    riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
    createdAt: new Date().toISOString(),
  };

  trades.unshift(newTrade);
  saveTrades(trades);

  const warnings = analyzeForWarnings(trades, settings);
  return { trade: newTrade, warnings };
}

export function updateTrade(id: string, updates: Partial<Trade>) {
  const trades = getTrades();
  const idx = trades.findIndex(t => t.id === id);
  if (idx !== -1) {
    trades[idx] = { ...trades[idx], ...updates };
    if (updates.entryPrice !== undefined || updates.exitPrice !== undefined || updates.amount !== undefined || updates.direction !== undefined) {
      const t = trades[idx];
      t.profitLoss = t.direction === 'buy'
        ? (t.exitPrice - t.entryPrice) * t.amount
        : (t.entryPrice - t.exitPrice) * t.amount;
      t.profitLoss = Math.round(t.profitLoss * 100) / 100;
      t.profitLossPercent = t.entryPrice > 0
        ? Math.round(((t.exitPrice - t.entryPrice) / t.entryPrice) * 100 * (t.direction === 'buy' ? 1 : -1) * 100) / 100
        : 0;
      t.isWin = t.profitLoss > 0;
      const riskD = Math.abs(t.entryPrice - t.stopLoss);
      const rewD = Math.abs(t.takeProfit - t.entryPrice);
      t.riskRewardRatio = riskD > 0 ? Math.round((rewD / riskD) * 100) / 100 : 0;
    }
    saveTrades(trades);
  }
}

export function deleteTrade(id: string) {
  const trades = getTrades().filter(t => t.id !== id);
  saveTrades(trades);
}

// ============================================================================
// SETTINGS FUNCTIONS
// ============================================================================

export function getSettings(): AppSettings {
  return load<AppSettings>(STORAGE_KEYS.settings, defaultSettings);
}

export function saveSettings(settings: AppSettings) {
  save(STORAGE_KEYS.settings, settings);
}

// ============================================================================
// RECOVERY FUNCTIONS
// ============================================================================

export function getRecovery(): RecoveryState {
  return load<RecoveryState>(STORAGE_KEYS.recovery, defaultRecovery);
}

export function saveRecovery(recovery: RecoveryState) {
  save(STORAGE_KEYS.recovery, recovery);
}

// ============================================================================
// GOALS FUNCTIONS
// ============================================================================

export function getGoals(): Goal[] {
  return load<Goal[]>(STORAGE_KEYS.goals, []);
}

export function saveGoals(goals: Goal[]) {
  save(STORAGE_KEYS.goals, goals);
}

// ============================================================================
// PSYCHOLOGY FUNCTIONS
// ============================================================================

export function getPsychologyEntries(): PsychologyEntry[] {
  return load<PsychologyEntry[]>(STORAGE_KEYS.psychology, []);
}

export function savePsychologyEntries(entries: PsychologyEntry[]) {
  save(STORAGE_KEYS.psychology, entries);
}

// ============================================================================
// WARNINGS FUNCTIONS
// ============================================================================

export function getWarnings(): AIWarning[] {
  return load<AIWarning[]>(STORAGE_KEYS.warnings, []);
}

export function saveWarnings(warnings: AIWarning[]) {
  save(STORAGE_KEYS.warnings, warnings);
}

// ============================================================================
// DAILY LOGS FUNCTIONS
// ============================================================================

export function getDailyLogs(): DailyLog[] {
  return load<DailyLog[]>(STORAGE_KEYS.dailyLogs, []);
}

export function saveDailyLogs(logs: DailyLog[]) {
  save(STORAGE_KEYS.dailyLogs, logs);
}

// ============================================================================
// ANALYTICS ENGINE - FIXED
// ============================================================================

export function getTradeStats(trades: Trade[]) {
  if (trades.length === 0) return {
    totalTrades: 0, wins: 0, losses: 0, winRate: 0, totalPnL: 0,
    avgWin: 0, avgLoss: 0, avgRR: 0, profitFactor: 0, maxDrawdown: 0,
    bestTrade: 0, worstTrade: 0, avgTrade: 0, expectancy: 0,
    consecutiveWins: 0, consecutiveLosses: 0, currentStreak: 0,
    sharpeRatio: 0, avgHoldTime: '', totalFees: 0,
  };

  const wins = trades.filter(t => t.isWin);
  const losses = trades.filter(t => !t.isWin);
  
  // Ensure we're working with numbers by parsing any string values
  const totalPnL = trades.reduce((s, t) => {
    const pnl = typeof t.profitLoss === 'number' ? t.profitLoss : parseCurrencyValue(t.profitLoss);
    return s + pnl;
  }, 0);
  
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => {
    const pnl = typeof t.profitLoss === 'number' ? t.profitLoss : parseCurrencyValue(t.profitLoss);
    return s + pnl;
  }, 0) / wins.length : 0;
  
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => {
    const pnl = typeof t.profitLoss === 'number' ? t.profitLoss : parseCurrencyValue(t.profitLoss);
    return s + pnl;
  }, 0) / losses.length) : 0;
  
  const avgRR = trades.reduce((s, t) => s + (t.riskRewardRatio || 0), 0) / trades.length;
  
  const grossWins = wins.reduce((s, t) => {
    const pnl = typeof t.profitLoss === 'number' ? t.profitLoss : parseCurrencyValue(t.profitLoss);
    return s + pnl;
  }, 0);
  
  const grossLosses = Math.abs(losses.reduce((s, t) => {
    const pnl = typeof t.profitLoss === 'number' ? t.profitLoss : parseCurrencyValue(t.profitLoss);
    return s + pnl;
  }, 0));
  
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;
  
  // Get all PnL values as numbers
  const pnls = trades.map(t => typeof t.profitLoss === 'number' ? t.profitLoss : parseCurrencyValue(t.profitLoss));
  const bestTrade = pnls.length > 0 ? Math.max(...pnls) : 0;
  const worstTrade = pnls.length > 0 ? Math.min(...pnls) : 0;
  const avgTrade = totalPnL / trades.length;
  const winRate = (wins.length / trades.length) * 100;
  const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;

  let maxDrawdown = 0;
  let peak = 0;
  let cumPnL = 0;
  const sortedTrades = [...trades].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (const t of sortedTrades) {
    const pnl = typeof t.profitLoss === 'number' ? t.profitLoss : parseCurrencyValue(t.profitLoss);
    cumPnL += pnl;
    if (cumPnL > peak) peak = cumPnL;
    const dd = peak - cumPnL;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  let maxConsWins = 0, maxConsLosses = 0, curWins = 0, curLosses = 0;
  let currentStreak = 0;
  for (const t of sortedTrades) {
    if (t.isWin) { curWins++; curLosses = 0; } else { curLosses++; curWins = 0; }
    maxConsWins = Math.max(maxConsWins, curWins);
    maxConsLosses = Math.max(maxConsLosses, curLosses);
  }
  if (sortedTrades.length > 0) {
    const last = sortedTrades[sortedTrades.length - 1];
    currentStreak = last.isWin ? curWins : -curLosses;
  }

  const mean = pnls.reduce((s, p) => s + p, 0) / pnls.length;
  const variance = pnls.reduce((s, p) => s + (p - mean) ** 2, 0) / pnls.length;
  const stddev = Math.sqrt(variance);
  const sharpeRatio = stddev > 0 ? mean / stddev : 0;

  return {
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: Math.round(winRate * 10) / 10,
    totalPnL: Math.round(totalPnL * 100) / 100, // Return as NUMBER
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    avgRR: Math.round(avgRR * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    bestTrade: Math.round(bestTrade * 100) / 100,
    worstTrade: Math.round(worstTrade * 100) / 100,
    avgTrade: Math.round(avgTrade * 100) / 100,
    expectancy: Math.round(expectancy * 100) / 100,
    consecutiveWins: maxConsWins,
    consecutiveLosses: maxConsLosses,
    currentStreak,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    avgHoldTime: '',
    totalFees: 0,
  };
}

export function getDailyPnL(trades: Trade[]): { date: string; pnl: number; trades: number; cumPnl: number }[] {
  const map = new Map<string, { pnl: number; trades: number }>();
  for (const t of trades) {
    const d = t.date;
    const existing = map.get(d) || { pnl: 0, trades: 0 };
    const pnl = typeof t.profitLoss === 'number' ? t.profitLoss : parseCurrencyValue(t.profitLoss);
    existing.pnl += pnl;
    existing.trades++;
    map.set(d, existing);
  }
  const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let cumPnl = 0;
  return sorted.map(([date, data]) => {
    cumPnl += data.pnl;
    return { date, pnl: Math.round(data.pnl * 100) / 100, trades: data.trades, cumPnl: Math.round(cumPnl * 100) / 100 };
  });
}

export function getStrategyPerformance(trades: Trade[]): { strategy: string; trades: number; winRate: number; pnl: number; avgRR: number }[] {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    const s = t.strategy || 'Unknown';
    const arr = map.get(s) || [];
    arr.push(t);
    map.set(s, arr);
  }
  return [...map.entries()].map(([strategy, st]) => ({
    strategy,
    trades: st.length,
    winRate: Math.round((st.filter(t => t.isWin).length / st.length) * 1000) / 10,
    pnl: Math.round(st.reduce((s, t) => {
      const pnl = typeof t.profitLoss === 'number' ? t.profitLoss : parseCurrencyValue(t.profitLoss);
      return s + pnl;
    }, 0) * 100) / 100,
    avgRR: Math.round((st.reduce((s, t) => s + t.riskRewardRatio, 0) / st.length) * 100) / 100,
  }));
}

export function getEmotionStats(trades: Trade[]): { emotion: string; count: number; winRate: number; avgPnl: number }[] {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    const e = t.emotionBefore || 'Unknown';
    const arr = map.get(e) || [];
    arr.push(t);
    map.set(e, arr);
  }
  return [...map.entries()].map(([emotion, et]) => ({
    emotion,
    count: et.length,
    winRate: Math.round((et.filter(t => t.isWin).length / et.length) * 1000) / 10,
    avgPnl: Math.round((et.reduce((s, t) => {
      const pnl = typeof t.profitLoss === 'number' ? t.profitLoss : parseCurrencyValue(t.profitLoss);
      return s + pnl;
    }, 0) / et.length) * 100) / 100,
  }));
}

// ============================================================================
// AI WARNING SYSTEM - FIXED
// ============================================================================

export function analyzeForWarnings(trades: Trade[], settings: AppSettings): AIWarning[] {
  const warnings: AIWarning[] = [];
  const today = new Date().toISOString().split('T')[0];
  const todayTrades = trades.filter(t => t.date === today);
  const recentTrades = trades.slice(0, 10);

  if (todayTrades.length >= settings.dailyTradeLimit) {
    warnings.push({
      id: uuidv4(), type: 'overtrading',
      message: `Daily trade limit reached (${todayTrades.length}/${settings.dailyTradeLimit}). Stop trading for today.`,
      severity: 'critical', timestamp: new Date().toISOString(), dismissed: false,
    });
  } else if (todayTrades.length >= settings.dailyTradeLimit - 1) {
    warnings.push({
      id: uuidv4(), type: 'overtrading',
      message: `Approaching daily trade limit (${todayTrades.length}/${settings.dailyTradeLimit}). Trade carefully.`,
      severity: 'high', timestamp: new Date().toISOString(), dismissed: false,
    });
  }

  let consLosses = 0;
  for (const t of recentTrades) {
    if (!t.isWin) consLosses++;
    else break;
  }
  if (consLosses >= settings.consecutiveLossThreshold) {
    warnings.push({
      id: uuidv4(), type: 'loss_streak',
      message: `${consLosses} consecutive losses detected. Recovery Mode recommended.`,
      severity: 'critical', timestamp: new Date().toISOString(), dismissed: false,
    });
  }

  const todayLosses = todayTrades.filter(t => !t.isWin).length;
  if (todayLosses >= settings.dailyLossLimit) {
    warnings.push({
      id: uuidv4(), type: 'risk',
      message: `Daily loss limit reached (${todayLosses} losses today). Stop trading immediately.`,
      severity: 'critical', timestamp: new Date().toISOString(), dismissed: false,
    });
  }

  const emotionalTrades = todayTrades.filter(t =>
    ['angry', 'frustrated', 'fearful', 'greedy', 'anxious', 'revenge'].includes(t.emotionBefore.toLowerCase())
  );
  if (emotionalTrades.length >= 2) {
    warnings.push({
      id: uuidv4(), type: 'emotional',
      message: `High emotional activity detected. ${emotionalTrades.length} emotional trades today.`,
      severity: 'high', timestamp: new Date().toISOString(), dismissed: false,
    });
  }

  if (recentTrades.length >= 3) {
    const last3 = recentTrades.slice(0, 3);
    const allLosses = last3.every(t => !t.isWin);
    const increasingSize = last3.length >= 2 && last3[0].amount > last3[1].amount * 1.5;
    if (allLosses && increasingSize) {
      warnings.push({
        id: uuidv4(), type: 'revenge',
        message: 'Revenge trading pattern detected! Increasing position sizes after losses.',
        severity: 'critical', timestamp: new Date().toISOString(), dismissed: false,
      });
    }
  }

  const highRiskTrades = todayTrades.filter(t => {
    if (t.marketType === 'Fixed Time Trading') {
      const actualRiskPercent = (t.amount / settings.accountBalance) * 100;
      return actualRiskPercent > settings.maxRiskPerTrade;
    }
    return t.riskPercent > settings.maxRiskPerTrade;
  });
  
  if (highRiskTrades.length > 0) {
    warnings.push({
      id: uuidv4(), type: 'risk',
      message: `${highRiskTrades.length} trades exceed max risk per trade (${settings.maxRiskPerTrade}%).`,
      severity: 'high', timestamp: new Date().toISOString(), dismissed: false,
    });
  }

  const totalPnL = trades.reduce((s, t) => {
    const pnl = typeof t.profitLoss === 'number' ? t.profitLoss : parseCurrencyValue(t.profitLoss);
    return s + pnl;
  }, 0);
  
  if (totalPnL < 0 && settings.accountBalance > 0) {
    const ddPercent = (Math.abs(totalPnL) / settings.accountBalance) * 100;
    if (ddPercent >= settings.drawdownThreshold) {
      warnings.push({
        id: uuidv4(), type: 'risk',
        message: `Account drawdown at ${ddPercent.toFixed(1)}%. Capital protection required.`,
        severity: 'critical', timestamp: new Date().toISOString(), dismissed: false,
      });
    }
  }

  return warnings;
}

export function generateAIInsights(trades: Trade[]): string[] {
  const insights: string[] = [];
  if (trades.length === 0) return ['Enter your first trade to receive AI-powered insights.'];

  const stats = getTradeStats(trades);
  const stratPerf = getStrategyPerformance(trades);
  const emotionStats = getEmotionStats(trades);
  const today = new Date().toISOString().split('T')[0];
  const todayTrades = trades.filter(t => t.date === today);

  if (stats.winRate >= 60) insights.push(`✅ Strong win rate of ${stats.winRate}%. Maintain your current approach.`);
  else if (stats.winRate >= 45) insights.push(`📊 Win rate at ${stats.winRate}%. Focus on improving entry timing and trade selection.`);
  else if (stats.winRate > 0) insights.push(`⚠️ Low win rate (${stats.winRate}%). Review your strategy and consider paper trading.`);

  if (stats.profitFactor >= 2) insights.push(`🏆 Excellent profit factor of ${stats.profitFactor}. Your winners significantly outperform losers.`);
  else if (stats.profitFactor >= 1.5) insights.push(`👍 Good profit factor (${stats.profitFactor}). Keep managing risk well.`);
  else if (stats.profitFactor < 1 && stats.totalTrades > 3) insights.push(`🔴 Profit factor below 1.0. You're losing more than winning. Review risk management.`);

  if (stats.avgRR < 1 && stats.totalTrades > 5) insights.push(`⚠️ Average R:R ratio is ${stats.avgRR}. Aim for at least 1:2 risk-reward.`);
  else if (stats.avgRR >= 2) insights.push(`✅ Great R:R ratio of ${stats.avgRR}. Your trade planning is solid.`);

  if (stratPerf.length > 1) {
    const best = stratPerf.sort((a, b) => b.pnl - a.pnl)[0];
    const worst = stratPerf.sort((a, b) => a.pnl - b.pnl)[0];
    if (best && best.pnl > 0) insights.push(`🎯 Best strategy: "${best.strategy}" with ${best.winRate}% win rate and $${best.pnl} profit.`);
    if (worst && worst.pnl < 0) insights.push(`🔻 Weakest strategy: "${worst.strategy}" losing $${Math.abs(worst.pnl)}. Consider reviewing or dropping it.`);
  }

  const negEmotions = emotionStats.filter(e => ['angry', 'frustrated', 'fearful', 'greedy', 'anxious', 'revenge'].includes(e.emotion.toLowerCase()));
  if (negEmotions.length > 0) {
    const worstEmotion = negEmotions.sort((a, b) => a.avgPnl - b.avgPnl)[0];
    if (worstEmotion && worstEmotion.avgPnl < 0) {
      insights.push(`🧠 Trading while "${worstEmotion.emotion}" costs you avg $${Math.abs(worstEmotion.avgPnl)}/trade. Avoid this emotional state.`);
    }
  }

  if (stats.currentStreak <= -3) insights.push(`🔴 Currently on a ${Math.abs(stats.currentStreak)}-loss streak. Consider taking a break.`);
  if (stats.currentStreak >= 3) insights.push(`🟢 On a ${stats.currentStreak}-win streak! Stay disciplined, don't get overconfident.`);

  if (todayTrades.length >= 4) insights.push(`⚠️ ${todayTrades.length} trades today. Quality over quantity — focus on A+ setups only.`);

  if (stats.maxDrawdown > 0) insights.push(`📉 Maximum drawdown: $${stats.maxDrawdown}. Ensure this stays within risk tolerance.`);
  if (stats.expectancy > 0) insights.push(`📈 Positive expectancy of $${stats.expectancy}/trade. Your edge is mathematically sound.`);
  else if (stats.expectancy < 0 && stats.totalTrades > 5) insights.push(`🔴 Negative expectancy ($${stats.expectancy}/trade). You need to improve win rate or R:R ratio.`);

  if (stats.sharpeRatio > 1) insights.push(`📊 Sharpe Ratio: ${stats.sharpeRatio}. Good risk-adjusted returns.`);
  else if (stats.sharpeRatio < 0 && stats.totalTrades > 5) insights.push(`📊 Negative Sharpe Ratio indicates poor risk-adjusted performance.`);

  return insights;
}

export function calculateDisciplineScore(trades: Trade[], settings: AppSettings): number {
  if (trades.length === 0) return 100;
  let score = 100;
  const today = new Date().toISOString().split('T')[0];
  const todayTrades = trades.filter(t => t.date === today);
  const recentTrades = trades.slice(0, 20);

  if (todayTrades.length > settings.dailyTradeLimit) score -= 15;
  else if (todayTrades.length > settings.dailyTradeLimit - 1) score -= 5;

  const highRisk = recentTrades.filter(t => {
    if (t.marketType === 'Fixed Time Trading') {
      const actualRiskPercent = (t.amount / settings.accountBalance) * 100;
      return actualRiskPercent > settings.maxRiskPerTrade;
    }
    return t.riskPercent > settings.maxRiskPerTrade;
  });
  score -= highRisk.length * 3;

  const emotionalTrades = recentTrades.filter(t =>
    ['angry', 'frustrated', 'fearful', 'greedy', 'anxious', 'revenge'].includes(t.emotionBefore.toLowerCase())
  );
  score -= emotionalTrades.length * 4;

  const noSL = recentTrades.filter(t => t.stopLoss === 0 && t.marketType !== 'Fixed Time Trading');
  score -= noSL.length * 5;

  const strategies = new Set(recentTrades.map(t => t.strategy).filter(Boolean));
  if (strategies.size <= 3 && strategies.size > 0) score += 5;

  const lowRR = recentTrades.filter(t => t.riskRewardRatio < 1 && t.riskRewardRatio > 0);
  score -= lowRR.length * 2;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculateEmotionalScore(trades: Trade[]): number {
  if (trades.length === 0) return 75;
  const recent = trades.slice(0, 10);
  let score = 75;

  const calm = recent.filter(t => ['calm', 'confident', 'focused', 'disciplined', 'patient'].includes(t.emotionBefore.toLowerCase()));
  const negative = recent.filter(t => ['angry', 'frustrated', 'fearful', 'greedy', 'anxious', 'revenge', 'fomo'].includes(t.emotionBefore.toLowerCase()));

  score += calm.length * 3;
  score -= negative.length * 5;

  let consLosses = 0;
  for (const t of recent) { if (!t.isWin) consLosses++; else break; }
  score -= consLosses * 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function shouldActivateRecovery(trades: Trade[], settings: AppSettings): { activate: boolean; reason: string } {
  const recent = trades.slice(0, 10);
  let consLosses = 0;
  for (const t of recent) { if (!t.isWin) consLosses++; else break; }

  if (consLosses >= settings.consecutiveLossThreshold) {
    return { activate: true, reason: `${consLosses} consecutive losses detected` };
  }

  const totalPnL = trades.reduce((s, t) => {
    const pnl = typeof t.profitLoss === 'number' ? t.profitLoss : parseCurrencyValue(t.profitLoss);
    return s + pnl;
  }, 0);
  
  if (totalPnL < 0 && settings.accountBalance > 0) {
    const ddPercent = (Math.abs(totalPnL) / settings.accountBalance) * 100;
    if (ddPercent >= settings.drawdownThreshold) {
      return { activate: true, reason: `Drawdown at ${ddPercent.toFixed(1)}%` };
    }
  }

  const emotionalScore = calculateEmotionalScore(trades);
  if (emotionalScore < 30) {
    return { activate: true, reason: 'Emotional instability detected' };
  }

  return { activate: false, reason: '' };
}

export function exportTradesCSV(trades: Trade[]): string {
  const headers = ['Date', 'Time', 'Asset', 'Direction', 'Entry', 'Exit', 'P/L', 'Strategy', 'Emotion Before', 'Notes'];
  const rows = trades.map(t => [t.date, t.time, t.asset, t.direction, t.entryPrice, t.exitPrice, t.profitLoss, t.strategy, t.emotionBefore, `"${t.notes}"`]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function importTradesCSV(csv: string): Trade[] {
  const lines = csv.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const trades: Trade[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 6) continue;
    trades.push({
      id: uuidv4(),
      date: cols[0]?.trim() || new Date().toISOString().split('T')[0],
      time: cols[1]?.trim() || '00:00',
      asset: cols[2]?.trim() || 'Unknown',
      direction: (cols[3]?.trim().toLowerCase() === 'sell' ? 'sell' : 'buy'),
      entryPrice: parseFloat(cols[4]) || 0,
      exitPrice: parseFloat(cols[5]) || 0,
      profitLoss: parseFloat(cols[6]) || 0,
      profitLossPercent: 0,
      stopLoss: 0,
      takeProfit: 0,
      amount: 1,
      riskPercent: 1,
      duration: '',
      strategy: cols[7]?.trim() || '',
      marketType: 'forex',
      marketCondition: 'normal',
      confidence: 50,
      emotionBefore: cols[8]?.trim() || 'neutral',
      emotionAfter: 'neutral',
      mistakeCategory: '',
      notes: cols[9]?.trim().replace(/"/g, '') || '',
      tags: [],
      isWin: (parseFloat(cols[6]) || 0) > 0,
      riskRewardRatio: 0,
      createdAt: new Date().toISOString(),
    });
  }
  return trades;
}

// ============================================================================
// EXCEL/CSV IMPORT ENGINE
// ============================================================================

function normalize(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).replace(/−/g, '-').replace(/₹/g, 'INR ').trim();
}

function parseMoney(v: unknown): number {
  if (v === null || v === undefined) return 0;
  let s = normalize(v).toUpperCase();
  let neg = false;
  if (s.startsWith('-') || s.includes('-')) { neg = true; s = s.replace(/-/g, ''); }
  if (s.startsWith('+')) s = s.replace(/\+/g, '');
  s = s.replace(/INR/g, '').replace(/₹/g, '').replace(/\$/g, '').replace(/,/g, '').trim();
  let mult = 1;
  if (s.includes('K')) { mult = 1000; s = s.replace(/K/g, ''); }
  if (s.includes('M')) { mult = 1000000; s = s.replace(/M/g, ''); }
  const num = parseFloat(s);
  if (isNaN(num)) return 0;
  return neg ? -num * mult : num * mult;
}

function detectCurrency(amountStr: string, pnlStr: string): string {
  const combined = (amountStr + ' ' + pnlStr).toUpperCase();
  if (combined.includes('$')) return 'USD';
  if (combined.includes('₹') || combined.includes('INR')) return 'INR';
  return 'UNKNOWN';
}

function parseDate(v: unknown): string {
  if (!v) return new Date().toISOString().split('T')[0];
  const s = String(v).trim();
  const longMatch = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (longMatch) {
    try {
      const d = new Date(`${longMatch[1]} ${longMatch[2]}, ${longMatch[3]}`);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch {}
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) return `${slashMatch[3]}-${slashMatch[1].padStart(2, '0')}-${slashMatch[2].padStart(2, '0')}`;
  const dotMatch = s.match(/^(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})$/);
  if (dotMatch) return `${dotMatch[3]}-${dotMatch[2].padStart(2, '0')}-${dotMatch[1].padStart(2, '0')}`;
  return new Date().toISOString().split('T')[0];
}

function isDateHeader(s: string): boolean {
  return /^[A-Za-z]+\s+\d{1,2},?\s+\d{4}$/.test(s.trim());
}

function isAssetName(s: string): boolean {
  const keywords = ['Index', 'Crypto', 'Europe', 'Asia', 'Gold', 'Bitcoin', 'EUR', 'USD', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'Dow Jones', 'CAC 40', 'NASDAQ', 'Apple', 'Amazon', 'Ethereum', 'Silver', 'Oil', 'BTC', 'ETH', 'LTC', 'XRP', 'BNB', 'DOGE', 'AAPL', 'GOOGL', 'AMZN', 'TSLA', 'META', 'MSFT', 'NVDA', 'OTC'];
  if (/^[A-Z]{3}\/[A-Z]{3}/.test(s)) return true;
  return keywords.some(kw => s.includes(kw));
}

function hasCurrency(s: string): boolean {
  return /[$₹]/.test(s) || /INR/i.test(s);
}

function resultFromPnl(pnl: string): 'Profit' | 'Loss' | 'Refund' {
  const cleaned = normalize(pnl);
  if (cleaned.startsWith('-')) return 'Loss';
  if (cleaned.startsWith('+')) return 'Profit';
  const val = parseMoney(cleaned);
  if (val > 0) return 'Profit';
  if (val < 0) return 'Loss';
  return 'Refund';
}

export function parseExcelBlocks(rows: any[][]): Trade[] {
  const lines: string[] = [];
  for (const row of rows) {
    if (!Array.isArray(row)) {
      if (row !== null && row !== undefined) lines.push(String(row).trim());
      continue;
    }
    for (const cell of row) {
      if (cell !== null && cell !== undefined && String(cell).trim() !== '') {
        lines.push(String(cell).trim());
      }
    }
  }

  const trades: Trade[] = [];
  let currentDate = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('> metadata') || line.startsWith('|') || line === 'A' || line === ':-') {
      i++; continue;
    }
    if (isDateHeader(line)) {
      currentDate = line;
      i++; continue;
    }
    if (isAssetName(line)) {
      const asset = line;
      let j = i + 1;
      while (j < lines.length && ['•', '●', '◦', '*', '-', '–'].includes(lines[j])) j++;
      if (j + 3 >= lines.length) { i++; continue; }

      const multiplierStr = lines[j];
      const durationStr = lines[j + 1];
      const amountStr = lines[j + 2];
      const pnlStr = lines[j + 3];

      if (isNaN(parseFloat(multiplierStr))) { i++; continue; }
      if (!/sec|min/i.test(durationStr)) { i++; continue; }
      if (!hasCurrency(amountStr) && !hasCurrency(pnlStr)) { i++; continue; }

      const amountValue = Math.abs(parseMoney(amountStr));
      const pnlValue = parseMoney(pnlStr);
      const result = resultFromPnl(pnlStr);
      const currency = detectCurrency(amountStr, pnlStr);
      const tradeDate = parseDate(currentDate);

      trades.push({
        id: uuidv4(),
        date: tradeDate,
        time: '00:00',
        asset,
        direction: 'buy',
        entryPrice: 0,
        exitPrice: 0,
        stopLoss: 0,
        takeProfit: 0,
        amount: Math.round(amountValue * 100) / 100,
        riskPercent: 1.5,
        profitLoss: Math.round(pnlValue * 100) / 100,
        profitLossPercent: amountValue > 0 ? Math.round((pnlValue / amountValue) * 10000) / 100 : 0,
        duration: durationStr,
        strategy: '',
        marketType: 'Fixed Time Trading',
        marketCondition: 'normal',
        confidence: 50,
        emotionBefore: 'Neutral',
        emotionAfter: 'Neutral',
        mistakeCategory: result,
        notes: `Currency: ${currency}`,
        tags: ['imported', currency.toLowerCase()],
        isWin: pnlValue > 0,
        riskRewardRatio: 0,
        createdAt: new Date().toISOString(),
      });
      i = j + 4;
      continue;
    }
    i++;
  }
  return trades;
}

export function processImportedData(data: any[], accountBalance?: number): Trade[] {
  if (data.length > 0 && typeof data[0] === 'object' && !Array.isArray(data[0])) {
    const firstRow = data[0];
    const keys = Object.keys(firstRow).map(k => k.toLowerCase());
    const hasStandardCols = keys.some(k =>
      ['asset', 'symbol', 'pair', 'date', 'direction', 'type', 'side', 'amount', 'pnl', 'profit', 'result', 'duration'].includes(k)
    );
    if (hasStandardCols) {
      return data.map(item => {
        const get = (...names: string[]): string => {
          for (const n of names) {
            for (const k of Object.keys(item)) {
              if (k.toLowerCase() === n.toLowerCase() || k.toLowerCase().replace(/[_ ]/g, '') === n.toLowerCase().replace(/[_ ]/g, '')) {
                const v = item[k];
                if (v !== null && v !== undefined && String(v).trim() !== '' && String(v) !== 'nan') return String(v).trim();
              }
            }
          }
          return '';
        };

        const amountRaw = get('Amount', 'amount', 'Quantity', 'quantity', 'Volume', 'volume', 'Size', 'size', 'Investment', 'investment', 'Stake', 'stake', 'trade_amount');
        const pnlRaw = get('PnL', 'pnl', 'Profit', 'profit', 'Loss', 'loss', 'Net', 'net', 'PL', 'pl', 'trade_pnl', 'P/L', 'Outcome', 'outcome', 'RealizedPnl', 'realized_pnl');
        const resultRaw = get('Result', 'result', 'Status', 'status', 'Outcome', 'outcome');
        const dirRaw = get('Direction', 'direction', 'Type', 'type', 'Side', 'side', 'Option', 'option', 'TransactionType', 'transaction_type');
        const assetRaw = get('Asset', 'asset', 'Symbol', 'symbol', 'Pair', 'pair', 'Market', 'market', 'Instrument', 'instrument', 'Underlying', 'underlying');
        const dateRaw = get('Date', 'date', 'Time', 'time', 'Timestamp', 'timestamp', 'DateTime', 'datetime', 'TradeDate', 'trade_date', 'ExecutionTime', 'execution_time');
        const durationRaw = get('Duration', 'duration', 'Expiry', 'expiry', 'Timeframe', 'timeframe', 'Period', 'period');
        const strategyRaw = get('Strategy', 'strategy');
        const riskModeRaw = get('RiskMode', 'risk_mode', 'Risk Mode');
        const entryRaw = get('Entry', 'EntryPrice', 'Entry Price', 'entry_price');
        const exitRaw = get('Exit', 'ExitPrice', 'Exit Price', 'exit_price');
        const slRaw = get('SL', 'StopLoss', 'Stop Loss', 'stop_loss');
        const tpRaw = get('TP', 'TakeProfit', 'Take Profit', 'take_profit');

        const amountValue = parseMoney(amountRaw);
        const pnlValue = parseMoney(pnlRaw);
        const entryPrice = parseFloat(entryRaw) || 0;
        const exitPrice = parseFloat(exitRaw) || 0;
        const sl = parseFloat(slRaw) || 0;
        const tp = parseFloat(tpRaw) || 0;

        let direction: 'buy' | 'sell' = 'buy';
        const dirUp = dirRaw.toUpperCase();
        if (['PUT', 'DOWN', 'SELL', 'SHORT'].some(d => dirUp.includes(d))) direction = 'sell';

        let result = resultRaw.toUpperCase();
        if (!result || result === 'NAN') {
          if (pnlValue > 0) result = 'Profit';
          else if (pnlValue < 0) result = 'Loss';
          else result = 'Refund';
        } else {
          if (result.includes('PROFIT') || result.includes('WIN')) result = 'Profit';
          else if (result.includes('LOSS') || result.includes('LOSE')) result = 'Loss';
          else result = 'Refund';
        }

        const isFT = durationRaw.toLowerCase().includes('sec') || durationRaw.toLowerCase().includes('min') || riskModeRaw !== '' || (entryPrice === 0 && exitPrice === 0 && amountValue > 0);
        const currency = detectCurrency(amountRaw, pnlRaw);
        
        let calculatedRiskPercent = 1.5;
        if (isFT && accountBalance && accountBalance > 0) {
          calculatedRiskPercent = (Math.abs(amountValue) / accountBalance) * 100;
          calculatedRiskPercent = Math.min(calculatedRiskPercent, 100);
          calculatedRiskPercent = Math.round(calculatedRiskPercent * 100) / 100;
        } else if (!isFT) {
          calculatedRiskPercent = parseFloat(get('Risk', 'risk', 'Risk %', 'risk_percent')) || 1;
        }

        return {
          id: uuidv4(),
          date: parseDate(dateRaw),
          time: '00:00',
          asset: assetRaw || 'Unknown',
          direction,
          entryPrice: isFT ? 0 : entryPrice,
          exitPrice: isFT ? 0 : exitPrice,
          stopLoss: isFT ? 0 : sl,
          takeProfit: isFT ? 0 : tp,
          amount: Math.round(Math.abs(amountValue) * 100) / 100,
          riskPercent: calculatedRiskPercent,
          profitLoss: Math.round(pnlValue * 100) / 100,
          profitLossPercent: amountValue > 0 ? Math.round((pnlValue / Math.abs(amountValue)) * 10000) / 100 : 0,
          duration: durationRaw,
          strategy: strategyRaw,
          marketType: isFT ? 'Fixed Time Trading' : (get('MarketType', 'market_type') || 'Forex'),
          marketCondition: get('Condition', 'condition', 'MarketCondition', 'market_condition') || 'normal',
          confidence: parseInt(get('Confidence', 'confidence')) || 50,
          emotionBefore: get('Emotion', 'emotion', 'EmotionBefore', 'emotion_before') || 'Neutral',
          emotionAfter: get('EmotionAfter', 'emotion_after') || 'Neutral',
          mistakeCategory: isFT ? result : (get('Mistake', 'mistake') || 'None'),
          notes: `Imported | ${currency}${riskModeRaw ? ' | Mode: ' + riskModeRaw : ''}`,
          tags: ['imported', currency.toLowerCase()],
          isWin: pnlValue > 0,
          riskRewardRatio: 0,
          createdAt: new Date().toISOString(),
        };
      }).filter(t => t.amount > 0 || t.profitLoss !== 0);
    }
  }
  return [];
}

/**
 * Master import function - DUPLICATES ARE NO LONGER SKIPPED
 */
export function importExcelFile(
  rawRows: any[][], 
  jsonData: any[],
  accountBalance?: number
): { 
  trades: Trade[]; 
  stats: { 
    total: number; 
    imported: number; 
    duplicates: number; 
    totalPnl: number; 
    wins: number; 
    losses: number; 
    refunds: number; 
    currency: string 
  } 
} {
  let parsed = parseExcelBlocks(rawRows);
  if (parsed.length === 0 && jsonData.length > 0) {
    parsed = processImportedData(jsonData, accountBalance);
  }

  const wins = parsed.filter(t => t.profitLoss > 0).length;
  const losses = parsed.filter(t => t.profitLoss < 0).length;
  const refunds = parsed.filter(t => t.profitLoss === 0).length;
  const totalPnl = parsed.reduce((s, t) => s + t.profitLoss, 0);

  const currency = parsed.length > 0 
    ? (parsed[0].notes.includes('USD') ? 'USD' : parsed[0].notes.includes('INR') ? 'INR' : 'UNKNOWN') 
    : 'UNKNOWN';

  return {
    trades: parsed,
    stats: {
      total: parsed.length,
      imported: parsed.length,
      duplicates: 0,
      totalPnl: Math.round(totalPnl * 100) / 100,
      wins,
      losses,
      refunds,
      currency,
    },
  };
}

// ============================================================================
// FIXED TIME TRADING STORE FUNCTIONS
// ============================================================================

export function getFixedTimeTrades(): FixedTimeTrade[] {
  return load<FixedTimeTrade[]>(STORAGE_KEYS.fixedTimeTrades, []);
}

export function saveFixedTimeTrades(trades: FixedTimeTrade[]) {
  save(STORAGE_KEYS.fixedTimeTrades, trades);
}

export function createFixedTimeTrade(
  data: Omit<FixedTimeTrade, 'id' | 'createdAt' | 'tradePnl' | 'result' | 'expiryTime' | 'expiryPrice'>
): FixedTimeTrade {
  const entryTime = new Date(data.entryTime);
  const expiryTime = new Date(entryTime.getTime() + data.duration * 1000);
  
  return {
    ...data,
    id: uuidv4(),
    tradePnl: 0,
    result: null,
    expiryPrice: null,
    expiryTime: expiryTime.toISOString(),
    createdAt: new Date().toISOString(),
  };
}

export function addFixedTimeTrade(trade: FixedTimeTrade): FixedTimeTrade {
  const trades = getFixedTimeTrades();
  trades.unshift(trade);
  saveFixedTimeTrades(trades);
  return trade;
}

export function updateFixedTimeTrade(id: string, updates: Partial<FixedTimeTrade>) {
  const trades = getFixedTimeTrades();
  const idx = trades.findIndex(t => t.id === id);
  if (idx !== -1) {
    trades[idx] = { ...trades[idx], ...updates };
    saveFixedTimeTrades(trades);
  }
}

export function completeFixedTimeTrade(
  id: string, 
  result: 'WON' | 'LOST' | 'REFUND',
  expiryPrice?: number
): FixedTimeTrade | null {
  const trades = getFixedTimeTrades();
  const idx = trades.findIndex(t => t.id === id);
  if (idx === -1) return null;

  const trade = trades[idx];
  let pnl = 0;
  
  if (result === 'WON') {
    pnl = trade.tradeAmount * (trade.payoutPercent / 100);
  } else if (result === 'LOST') {
    pnl = -trade.tradeAmount;
  }

  trades[idx] = {
    ...trade,
    status: result as FixedTimeStatus,
    result: result as FixedTimeStatus,
    tradePnl: Math.round(pnl * 100) / 100,
    expiryPrice: expiryPrice ?? null,
  };

  saveFixedTimeTrades(trades);
  return trades[idx];
}

export function deleteFixedTimeTrade(id: string) {
  const trades = getFixedTimeTrades().filter(t => t.id !== id);
  saveFixedTimeTrades(trades);
}

export function getActiveFixedTimeTrades(): FixedTimeTrade[] {
  return getFixedTimeTrades().filter(t => 
    t.status === 'ACTIVE' || t.status === 'PENDING_RESULT' || t.status === 'EXPIRED'
  );
}

export function getFixedTimeTradeStats(trades: FixedTimeTrade[]) {
  const completed = trades.filter(t => t.status === 'WON' || t.status === 'LOST' || t.status === 'REFUND');
  if (completed.length === 0) {
    return {
      totalTrades: 0, wins: 0, losses: 0, refunds: 0, winRate: 0,
      totalPnl: 0, totalProfit: 0, totalLoss: 0, avgPayout: 0,
      profitFactor: 0, bestTrade: 0, worstTrade: 0,
    };
  }

  const wins = completed.filter(t => t.status === 'WON');
  const losses = completed.filter(t => t.status === 'LOST');
  const refunds = completed.filter(t => t.status === 'REFUND');
  const totalPnl = completed.reduce((s, t) => s + t.tradePnl, 0);
  const totalProfit = wins.reduce((s, t) => s + t.tradePnl, 0);
  const totalLoss = Math.abs(losses.reduce((s, t) => s + t.tradePnl, 0));
  const avgPayout = completed.reduce((s, t) => s + t.payoutPercent, 0) / completed.length;
  const winRate = (wins.length / (wins.length + losses.length)) * 100;
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
  const pnls = completed.map(t => t.tradePnl);

  return {
    totalTrades: completed.length,
    wins: wins.length,
    losses: losses.length,
    refunds: refunds.length,
    winRate: Math.round(winRate * 10) / 10,
    totalPnl: Math.round(totalPnl * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    totalLoss: Math.round(totalLoss * 100) / 100,
    avgPayout: Math.round(avgPayout * 10) / 10,
    profitFactor: Math.round(profitFactor * 100) / 100,
    bestTrade: Math.max(...pnls, 0),
    worstTrade: Math.min(...pnls, 0),
  };
}

export function getFixedTimeStatsByAsset(trades: FixedTimeTrade[]) {
  const completed = trades.filter(t => t.status === 'WON' || t.status === 'LOST');
  const map = new Map<string, { wins: number; total: number; pnl: number }>();
  
  for (const t of completed) {
    const ex = map.get(t.asset) || { wins: 0, total: 0, pnl: 0 };
    ex.total++;
    ex.pnl += t.tradePnl;
    if (t.status === 'WON') ex.wins++;
    map.set(t.asset, ex);
  }

  return [...map.entries()].map(([asset, data]) => ({
    asset,
    trades: data.total,
    winRate: Math.round((data.wins / data.total) * 1000) / 10,
    pnl: Math.round(data.pnl * 100) / 100,
  })).sort((a, b) => b.pnl - a.pnl);
}

export function getFixedTimeStatsByDuration(trades: FixedTimeTrade[]) {
  const completed = trades.filter(t => t.status === 'WON' || t.status === 'LOST');
  const map = new Map<number, { wins: number; total: number; pnl: number }>();
  
  for (const t of completed) {
    const ex = map.get(t.duration) || { wins: 0, total: 0, pnl: 0 };
    ex.total++;
    ex.pnl += t.tradePnl;
    if (t.status === 'WON') ex.wins++;
    map.set(t.duration, ex);
  }

  const durationLabels: Record<number, string> = {
    5: '5 sec', 10: '10 sec', 15: '15 sec', 30: '30 sec', 45: '45 sec',
    60: '1 min', 120: '2 min', 180: '3 min', 300: '5 min',
    900: '15 min', 1800: '30 min', 3600: '1 hour'
  };

  return [...map.entries()].map(([duration, data]) => ({
    duration,
    label: durationLabels[duration] || `${duration}s`,
    trades: data.total,
    winRate: Math.round((data.wins / data.total) * 1000) / 10,
    pnl: Math.round(data.pnl * 100) / 100,
  })).sort((a, b) => a.duration - b.duration);
}

export function getFixedTimeStreakInfo(trades: FixedTimeTrade[]) {
  const completed = trades
    .filter(t => t.status === 'WON' || t.status === 'LOST')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (completed.length === 0) {
    return { currentStreak: 0, streakType: 'none', maxWinStreak: 0, maxLossStreak: 0 };
  }

  let currentStreak = 0;
  const streakType = completed[0].status === 'WON' ? 'win' : 'loss';
  for (const t of completed) {
    if ((streakType === 'win' && t.status === 'WON') || (streakType === 'loss' && t.status === 'LOST')) {
      currentStreak++;
    } else break;
  }

  let maxWin = 0, maxLoss = 0, tempWin = 0, tempLoss = 0;
  for (const t of completed) {
    if (t.status === 'WON') {
      tempWin++; tempLoss = 0;
      maxWin = Math.max(maxWin, tempWin);
    } else {
      tempLoss++; tempWin = 0;
      maxLoss = Math.max(maxLoss, tempLoss);
    }
  }

  return {
    currentStreak: streakType === 'win' ? currentStreak : -currentStreak,
    streakType,
    maxWinStreak: maxWin,
    maxLossStreak: maxLoss,
  };
}

export function getFixedTimeDailyPnl(trades: FixedTimeTrade[]) {
  const map = new Map<string, { pnl: number; trades: number; wins: number }>();
  const completed = trades.filter(t => t.status === 'WON' || t.status === 'LOST' || t.status === 'REFUND');

  for (const t of completed) {
    const date = t.timestamp.split('T')[0];
    const ex = map.get(date) || { pnl: 0, trades: 0, wins: 0 };
    ex.pnl += t.tradePnl;
    ex.trades++;
    if (t.status === 'WON') ex.wins++;
    map.set(date, ex);
  }

  const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let cumPnl = 0;
  return sorted.map(([date, data]) => {
    cumPnl += data.pnl;
    return {
      date,
      pnl: Math.round(data.pnl * 100) / 100,
      trades: data.trades,
      wins: data.wins,
      cumPnl: Math.round(cumPnl * 100) / 100,
    };
  });
}

export function getTotalFixedTimePnl(): number {
  const trades = getFixedTimeTrades();
  return trades
    .filter(t => t.status === 'WON' || t.status === 'LOST' || t.status === 'REFUND')
    .reduce((sum, t) => sum + t.tradePnl, 0);
}

export function analyzeFixedTimeWarnings(trades: FixedTimeTrade[], settings: AppSettings): AIWarning[] {
  const warnings: AIWarning[] = [];
  const today = new Date().toISOString().split('T')[0];
  const todayTrades = trades.filter(t => t.timestamp.startsWith(today));
  const recentCompleted = trades.filter(t => t.status === 'WON' || t.status === 'LOST').slice(0, 10);

  if (todayTrades.length >= settings.dailyTradeLimit) {
    warnings.push({
      id: uuidv4(), type: 'overtrading',
      message: `Fixed time daily limit reached (${todayTrades.length}/${settings.dailyTradeLimit}).`,
      severity: 'critical', timestamp: new Date().toISOString(), dismissed: false,
    });
  }

  const streak = getFixedTimeStreakInfo(trades);
  if (streak.currentStreak <= -settings.consecutiveLossThreshold) {
    warnings.push({
      id: uuidv4(), type: 'loss_streak',
      message: `${Math.abs(streak.currentStreak)} consecutive fixed-time losses. Take a break.`,
      severity: 'critical', timestamp: new Date().toISOString(), dismissed: false,
    });
  }

  const highRisk = todayTrades.filter(t => {
    const actualRiskPercent = (t.tradeAmount / settings.accountBalance) * 100;
    return actualRiskPercent > settings.maxRiskPerTrade;
  });
  
  if (highRisk.length > 0) {
    warnings.push({
      id: uuidv4(), type: 'risk',
      message: `${highRisk.length} fixed-time trades exceed max risk per trade (${settings.maxRiskPerTrade}%).`,
      severity: 'high', timestamp: new Date().toISOString(), dismissed: false,
    });
  }

  if (recentCompleted.length >= 3) {
    const last3 = recentCompleted.slice(0, 3);
    const allLosses = last3.every(t => t.status === 'LOST');
    const increasing = last3[0].tradeAmount > last3[1].tradeAmount * 1.3;
    if (allLosses && increasing) {
      warnings.push({
        id: uuidv4(), type: 'revenge',
        message: 'Revenge trading detected: increasing size after losses.',
        severity: 'critical', timestamp: new Date().toISOString(), dismissed: false,
      });
    }
  }

  return warnings;
}

export function generateFixedTimeAIInsights(trades: FixedTimeTrade[]): string[] {
  const insights: string[] = [];
  const stats = getFixedTimeTradeStats(trades);
  const byAsset = getFixedTimeStatsByAsset(trades);
  const byDuration = getFixedTimeStatsByDuration(trades);
  const streak = getFixedTimeStreakInfo(trades);
  const today = new Date().toISOString().split('T')[0];
  const todayTrades = trades.filter(t => t.timestamp.startsWith(today));

  if (stats.totalTrades === 0) {
    return ['Start fixed-time trading to receive AI insights.'];
  }

  if (stats.winRate >= 60) insights.push(`✅ Strong fixed-time win rate: ${stats.winRate}%. Keep it up!`);
  else if (stats.winRate >= 50) insights.push(`📊 Fixed-time win rate at ${stats.winRate}%. Aim for 55%+.`);
  else if (stats.winRate > 0) insights.push(`⚠️ Low win rate (${stats.winRate}%). Review your entries.`);

  if (stats.profitFactor >= 1.5) insights.push(`🏆 Excellent profit factor: ${stats.profitFactor}`);
  else if (stats.profitFactor < 1 && stats.totalTrades > 5) insights.push(`🔴 Profit factor below 1.0. Net losing.`);

  if (byAsset.length > 0 && byAsset[0].pnl > 0) {
    insights.push(`🎯 Best asset: ${byAsset[0].asset} (+${byAsset[0].pnl}, ${byAsset[0].winRate}% win)`);
  }

  const bestDuration = byDuration.filter(d => d.trades >= 3).sort((a, b) => b.winRate - a.winRate)[0];
  if (bestDuration && bestDuration.winRate > 50) {
    insights.push(`⏱️ Best expiry: ${bestDuration.label} (${bestDuration.winRate}% win rate)`);
  }

  const otcTrades = trades.filter(t => t.isOtc && (t.status === 'WON' || t.status === 'LOST'));
  const normalTrades = trades.filter(t => !t.isOtc && (t.status === 'WON' || t.status === 'LOST'));
  if (otcTrades.length >= 5 && normalTrades.length >= 5) {
    const otcWinRate = (otcTrades.filter(t => t.status === 'WON').length / otcTrades.length) * 100;
    const normalWinRate = (normalTrades.filter(t => t.status === 'WON').length / normalTrades.length) * 100;
    if (Math.abs(otcWinRate - normalWinRate) > 10) {
      const better = otcWinRate > normalWinRate ? 'OTC' : 'Regular';
      insights.push(`📈 ${better} markets performing better for you.`);
    }
  }

  if (streak.currentStreak <= -3) insights.push(`🔴 On ${Math.abs(streak.currentStreak)}-loss streak. Consider stopping.`);
  if (streak.currentStreak >= 3) insights.push(`🟢 On ${streak.currentStreak}-win streak! Stay disciplined.`);

  if (todayTrades.length >= 5) insights.push(`⚠️ ${todayTrades.length} fixed-time trades today. Quality > quantity.`);

  if (stats.avgPayout < 75) insights.push(`📊 Avg payout ${stats.avgPayout}% is low. Look for 80%+ payouts.`);
  else if (stats.avgPayout >= 85) insights.push(`✅ Good avg payout: ${stats.avgPayout}%`);

  return insights;
}

// ============================================================================
// UTILITY FUNCTION TO FIX EXISTING TRADES
// ============================================================================

export function fixExistingTradeRiskPercentages(): number {
  const trades = getTrades();
  const settings = getSettings();
  let fixedCount = 0;
  
  trades.forEach(trade => {
    if (trade.marketType === 'Fixed Time Trading' && trade.riskPercent > 10) {
      const actualRiskPercent = (trade.amount / settings.accountBalance) * 100;
      trade.riskPercent = Math.round(actualRiskPercent * 100) / 100;
      fixedCount++;
    }
  });
  
  if (fixedCount > 0) {
    saveTrades(trades);
  }
  
  return fixedCount;
}

// ============================================================================
// COMBINED FUNCTIONS - NEW
// ============================================================================

export function getCombinedBalance(): number {
  const settings = getSettings();
  const deposits = getTotalDeposits();
  const withdrawals = getTotalWithdrawals();
  const trades = getTrades();
  const fixedTimeTrades = getFixedTimeTrades();
  
  const tradePnL = trades.reduce((sum, t) => sum + t.profitLoss, 0);
  const fixedTimePnL = fixedTimeTrades
    .filter(t => t.status === 'WON' || t.status === 'LOST' || t.status === 'REFUND')
    .reduce((sum, t) => sum + t.tradePnl, 0);
  
  return settings.accountBalance + deposits - withdrawals + tradePnL + fixedTimePnL;
}

export function getCombinedStats() {
  const trades = getTrades();
  const fixedTimeTrades = getFixedTimeTrades();
  const deposits = getDeposits();
  const withdrawals = getWithdrawals();
  const settings = getSettings();
  
  const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);
  const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
  const tradePnL = trades.reduce((sum, t) => sum + t.profitLoss, 0);
  const fixedTimePnL = fixedTimeTrades
    .filter(t => t.status === 'WON' || t.status === 'LOST' || t.status === 'REFUND')
    .reduce((sum, t) => sum + t.tradePnl, 0);
  
  const totalProfits = trades.filter(t => t.isWin).reduce((sum, t) => sum + t.profitLoss, 0) +
    fixedTimeTrades.filter(t => t.status === 'WON').reduce((sum, t) => sum + t.tradePnl, 0);
  
  const totalLosses = trades.filter(t => !t.isWin).reduce((sum, t) => sum + Math.abs(t.profitLoss), 0) +
    fixedTimeTrades.filter(t => t.status === 'LOST').reduce((sum, t) => sum + Math.abs(t.tradePnl), 0);
  
  const allTrades = [...trades, ...fixedTimeTrades];
  const completedTrades = allTrades.filter(t => {
    if ('status' in t) return t.status === 'WON' || t.status === 'LOST';
    return 'isWin' in t;
  });
  const wins = completedTrades.filter(t => {
    if ('status' in t) return t.status === 'WON';
    return t.isWin;
  });
  const winRate = completedTrades.length > 0 ? (wins.length / completedTrades.length) * 100 : 0;
  
  return {
    totalDeposits,
    totalWithdrawals,
    tradePnL,
    fixedTimePnL,
    totalPnL: tradePnL + fixedTimePnL,
    totalProfits,
    totalLosses,
    winRate,
    totalTrades: completedTrades.length,
    balance: settings.accountBalance + totalDeposits - totalWithdrawals + tradePnL + fixedTimePnL,
  };
}