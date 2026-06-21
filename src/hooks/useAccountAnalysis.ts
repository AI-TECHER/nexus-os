// src/hooks/useAccountAnalysis.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { Trade, FixedTimeTrade } from '../types';
import { getTrades, getFixedTimeTrades, getSettings } from '../store';

// ============================================================================
// TYPES
// ============================================================================

export interface AccountTransaction {
  date: string;
  account: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'BONUS' | 'REWARD' | 'INTERNAL_TRANSFER' | 'UNKNOWN';
  currency: string;
  amount: number;
  amountInr: number;
  originalAmount: number;
  originalText: string;
  isBonus: boolean;
  isReward: boolean;
  isInternalTransfer: boolean;
  isUsdDeposit: boolean;
  isUsdWithdrawal: boolean;
  isRealMoney: boolean;
  paymentMethod?: string;
  fromAccount?: string;
  toAccount?: string;
}

export interface AccountSummary {
  totalDeposits: number;
  totalWithdrawals: number;
  bonusTotal: number;
  internalImbalance: number;
  internalReceivedTotal: number;
  internalSentTotal: number;
  netBalance: number;
  truePnl: number;
  accountDeposits: Record<string, number>;
  accountWithdrawals: Record<string, number>;
  accountBonuses: Record<string, number>;
  accountBonusesReceived: Record<string, number>;
  accountBonusesRemoved: Record<string, number>;
  accountInternalSent: Record<string, number>;
  accountInternalReceived: Record<string, number>;
  accountInternalNet: Record<string, number>;
  accountBalances: Record<string, number>;
  accountTruePnl: Record<string, number>;
  accountRealPnl: Record<string, number>;
  inrDepositTotal: number;
  inrWithdrawalTotal: number;
  usdDepositTotal: number;
  usdWithdrawalTotal: number;
}

export interface RecoveryMetrics {
  recoveryTarget: number;
  amountRecovered: number;
  recoveryRemaining: number;
  recoveryProgress: number;
  recoveryActive: boolean;
}

export interface HealthCheckData {
  excelTransactions: number;
  depositCount: number;
  withdrawalCount: number;
  tradeCount: number;
  totalDeposits: number;
  totalWithdrawals: number;
  netPnl: number;
  availableBalance: number;
  recoveryActive: boolean;
  recoveryProgress: number;
  amountRecovered: number;
  recoveryRemaining: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const VALID_TRADING_ACCOUNTS = [
  "Investment Account",
  "Withdrawal Account",
  "USD Account",
  "USDT Account",
  "Forex Account"
];

const EXCHANGE_RATES: Record<string, number> = {
  USD: 83.50,
  USDT: 83.50,
  EUR: 90.50,
  GBP: 105.00,
  JPY: 0.55,
  CAD: 61.00,
  AUD: 55.00,
  CHF: 93.00,
  INR: 1.00
};

const ACCOUNT_MAPPINGS: Record<string, string> = {
  "investment account": "Investment Account",
  "investment": "Investment Account",
  "withdrawal account": "Withdrawal Account",
  "withdrawal": "Withdrawal Account",
  "usd account": "USD Account",
  "usd": "USD Account",
  "usdt account": "USDT Account",
  "usdt": "USDT Account",
  "forex account": "Forex Account",
  "forex": "Forex Account",
  "fx": "Forex Account"
};

// ============================================================================
// CORE COMPUTATION FUNCTIONS
// ============================================================================

/**
 * Calculate account summary from transactions
 */
export function calculateAccountSummary(transactions: AccountTransaction[]): AccountSummary {
  if (!transactions || transactions.length === 0) {
    return getEmptySummary();
  }

  const accountDeposits: Record<string, number> = {};
  const accountWithdrawals: Record<string, number> = {};
  const accountBonuses: Record<string, number> = {};
  const accountBonusesReceived: Record<string, number> = {};
  const accountBonusesRemoved: Record<string, number> = {};
  const accountInternalSent: Record<string, number> = {};
  const accountInternalReceived: Record<string, number> = {};
  const accountBalances: Record<string, number> = {};

  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let totalBonuses = 0;
  let internalReceivedTotal = 0;
  let internalSentTotal = 0;
  let netBalance = 0;

  let inrDepositTotal = 0;
  let inrWithdrawalTotal = 0;
  let usdDepositTotal = 0;
  let usdWithdrawalTotal = 0;

  for (const txn of transactions) {
    const account = txn.account || 'Unknown';
    const amount = txn.amountInr || 0;
    const currency = txn.currency || 'INR';
    const isBonus = txn.isBonus || false;
    const isInternal = txn.isInternalTransfer || false;

    // Currency totals
    if (currency === 'INR') {
      if (amount > 0 && !isBonus) inrDepositTotal += amount;
      else if (amount < 0) inrWithdrawalTotal += Math.abs(amount);
    } else if (currency === 'USD') {
      if (amount > 0 && !isBonus) usdDepositTotal += amount;
      else if (amount < 0) usdWithdrawalTotal += Math.abs(amount);
    }

    // Process transaction
    if (amount > 0 && !isBonus && !isInternal) {
      totalDeposits += amount;
      accountDeposits[account] = (accountDeposits[account] || 0) + amount;
      accountBalances[account] = (accountBalances[account] || 0) + amount;
      netBalance += amount;
    } else if (amount < 0 && !isBonus && !isInternal) {
      const absAmount = Math.abs(amount);
      totalWithdrawals += absAmount;
      accountWithdrawals[account] = (accountWithdrawals[account] || 0) + absAmount;
      accountBalances[account] = (accountBalances[account] || 0) - absAmount;
      netBalance -= absAmount;
    } else if (isBonus) {
      totalBonuses += amount;
      accountBonuses[account] = (accountBonuses[account] || 0) + amount;
      if (amount > 0) {
        accountBonusesReceived[account] = (accountBonusesReceived[account] || 0) + amount;
      } else {
        accountBonusesRemoved[account] = (accountBonusesRemoved[account] || 0) + Math.abs(amount);
      }
      accountBalances[account] = (accountBalances[account] || 0) + amount;
      netBalance += amount;
    } else if (isInternal) {
      if (amount > 0) {
        internalReceivedTotal += amount;
        accountInternalReceived[account] = (accountInternalReceived[account] || 0) + amount;
        accountBalances[account] = (accountBalances[account] || 0) + amount;
      } else {
        const absAmount = Math.abs(amount);
        internalSentTotal += absAmount;
        accountInternalSent[account] = (accountInternalSent[account] || 0) + absAmount;
        accountBalances[account] = (accountBalances[account] || 0) - absAmount;
      }
    }
  }

  // Calculate internal net
  const accountInternalNet: Record<string, number> = {};
  const allAccounts = new Set([...Object.keys(accountInternalReceived), ...Object.keys(accountInternalSent)]);
  for (const account of allAccounts) {
    accountInternalNet[account] = (accountInternalReceived[account] || 0) - (accountInternalSent[account] || 0);
  }

  // Calculate P&L
  const accountTruePnl: Record<string, number> = {};
  const accountRealPnl: Record<string, number> = {};
  for (const account of Object.keys(accountBalances)) {
    const deposits = accountDeposits[account] || 0;
    const withdrawals = accountWithdrawals[account] || 0;
    const bonuses = accountBonuses[account] || 0;
    const internalNet = accountInternalNet[account] || 0;
    const balance = accountBalances[account] || 0;

    accountTruePnl[account] = balance - deposits + withdrawals - bonuses - internalNet;
    accountRealPnl[account] = balance - deposits + withdrawals - bonuses;
  }

  const truePnl = netBalance - totalDeposits + totalWithdrawals - totalBonuses;

  return {
    totalDeposits,
    totalWithdrawals,
    bonusTotal: totalBonuses,
    internalImbalance: internalReceivedTotal - internalSentTotal,
    internalReceivedTotal,
    internalSentTotal,
    netBalance,
    truePnl,
    accountDeposits,
    accountWithdrawals,
    accountBonuses,
    accountBonusesReceived,
    accountBonusesRemoved,
    accountInternalSent,
    accountInternalReceived,
    accountInternalNet,
    accountBalances,
    accountTruePnl,
    accountRealPnl,
    inrDepositTotal,
    inrWithdrawalTotal,
    usdDepositTotal,
    usdWithdrawalTotal
  };
}

function getEmptySummary(): AccountSummary {
  return {
    totalDeposits: 0,
    totalWithdrawals: 0,
    bonusTotal: 0,
    internalImbalance: 0,
    internalReceivedTotal: 0,
    internalSentTotal: 0,
    netBalance: 0,
    truePnl: 0,
    accountDeposits: {},
    accountWithdrawals: {},
    accountBonuses: {},
    accountBonusesReceived: {},
    accountBonusesRemoved: {},
    accountInternalSent: {},
    accountInternalReceived: {},
    accountInternalNet: {},
    accountBalances: {},
    accountTruePnl: {},
    accountRealPnl: {},
    inrDepositTotal: 0,
    inrWithdrawalTotal: 0,
    usdDepositTotal: 0,
    usdWithdrawalTotal: 0
  };
}

/**
 * Calculate recovery metrics from trades
 */
export function calculateRecoveryMetrics(
  trades: Trade[],
  fixedTimeTrades: FixedTimeTrade[],
  accountBalance: number
): RecoveryMetrics {
  // Calculate total losses (sum of all negative P&L)
  const allTrades = [...trades, ...fixedTimeTrades];
  const losses = allTrades.filter(t => {
    const pnl = 'profitLoss' in t ? t.profitLoss : 'tradePnl' in t ? t.tradePnl : 0;
    return pnl < 0;
  });
  const totalLosses = losses.reduce((sum, t) => {
    const pnl = 'profitLoss' in t ? t.profitLoss : 'tradePnl' in t ? t.tradePnl : 0;
    return sum + Math.abs(pnl);
  }, 0);

  // Calculate profits
  const profits = allTrades.filter(t => {
    const pnl = 'profitLoss' in t ? t.profitLoss : 'tradePnl' in t ? t.tradePnl : 0;
    return pnl > 0;
  });
  const totalProfits = profits.reduce((sum, t) => {
    const pnl = 'profitLoss' in t ? t.profitLoss : 'tradePnl' in t ? t.tradePnl : 0;
    return sum + pnl;
  }, 0);

  // Recovery target = total losses
  const recoveryTarget = totalLosses;
  const amountRecovered = Math.min(totalProfits, recoveryTarget);
  const recoveryRemaining = Math.max(0, recoveryTarget - amountRecovered);
  const recoveryProgress = recoveryTarget > 0 ? (amountRecovered / recoveryTarget) * 100 : 0;
  const recoveryActive = recoveryTarget > 0 && recoveryRemaining > 0;

  return {
    recoveryTarget,
    amountRecovered,
    recoveryRemaining,
    recoveryProgress,
    recoveryActive
  };
}

/**
 * Calculate combined balance from all sources
 */
export function calculateCombinedBalance(
  deposits: number,
  withdrawals: number,
  manualPnL: number,
  fixedTimePnL: number
): number {
  return deposits - withdrawals + manualPnL + fixedTimePnL;
}

/**
 * Calculate win rate from trades
 */
export function calculateWinRate(trades: Trade[], fixedTimeTrades: FixedTimeTrade[]): number {
  const allTrades = [...trades, ...fixedTimeTrades];
  const completed = allTrades.filter(t => {
    if ('status' in t) {
      return t.status === 'WON' || t.status === 'LOST';
    }
    return 'isWin' in t;
  });

  if (completed.length === 0) return 0;

  const wins = completed.filter(t => {
    if ('status' in t) return t.status === 'WON';
    return t.isWin;
  });

  return (wins.length / completed.length) * 100;
}

// ============================================================================
// HEALTH CHECK FUNCTIONS
// ============================================================================

export function performHealthCheck(
  transactions: AccountTransaction[],
  depositCount: number,
  withdrawalCount: number,
  tradeCount: number,
  summary: AccountSummary,
  recovery: RecoveryMetrics
): HealthCheckData {
  return {
    excelTransactions: transactions.length,
    depositCount,
    withdrawalCount,
    tradeCount,
    totalDeposits: summary.totalDeposits,
    totalWithdrawals: summary.totalWithdrawals,
    netPnl: summary.truePnl,
    availableBalance: summary.netBalance,
    recoveryActive: recovery.recoveryActive,
    recoveryProgress: recovery.recoveryProgress,
    amountRecovered: recovery.amountRecovered,
    recoveryRemaining: recovery.recoveryRemaining
  };
}

// ============================================================================
// REACT HOOK
// ============================================================================

export function useAccountAnalysis() {
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [summary, setSummary] = useState<AccountSummary>(getEmptySummary());
  const [recovery, setRecovery] = useState<RecoveryMetrics>({
    recoveryTarget: 0,
    amountRecovered: 0,
    recoveryRemaining: 0,
    recoveryProgress: 0,
    recoveryActive: false
  });
  const [healthCheck, setHealthCheck] = useState<HealthCheckData | null>(null);
  const [loading, setLoading] = useState(false);

  // Load data from localStorage
  const loadData = useCallback(() => {
    setLoading(true);
    try {
      const trades = getTrades();
      const fixedTimeTrades = getFixedTimeTrades();
      const settings = getSettings();

      // Convert trades to transactions
      const txns: AccountTransaction[] = [];
      
      // Add trades as transactions
      for (const trade of trades) {
        txns.push({
          date: trade.date,
          account: 'Forex Account',
          type: trade.isWin ? 'DEPOSIT' : 'WITHDRAWAL',
          currency: settings.currency || 'USD',
          amount: Math.abs(trade.profitLoss),
          amountInr: trade.profitLoss,
          originalAmount: trade.amount,
          originalText: `${trade.asset} - ${trade.strategy || 'Trade'}`,
          isBonus: false,
          isReward: false,
          isInternalTransfer: false,
          isUsdDeposit: trade.isWin,
          isUsdWithdrawal: !trade.isWin,
          isRealMoney: true
        });
      }

      // Add fixed time trades
      for (const ft of fixedTimeTrades) {
        if (ft.status === 'WON' || ft.status === 'LOST' || ft.status === 'REFUND') {
          txns.push({
            date: ft.timestamp.split('T')[0],
            account: 'Fixed Time Account',
            type: ft.status === 'WON' ? 'DEPOSIT' : ft.status === 'LOST' ? 'WITHDRAWAL' : 'UNKNOWN',
            currency: settings.currency || 'USD',
            amount: Math.abs(ft.tradePnl),
            amountInr: ft.tradePnl,
            originalAmount: ft.tradeAmount,
            originalText: `${ft.asset} - ${ft.duration}s`,
            isBonus: false,
            isReward: false,
            isInternalTransfer: false,
            isUsdDeposit: ft.status === 'WON',
            isUsdWithdrawal: ft.status === 'LOST',
            isRealMoney: true
          });
        }
      }

      setTransactions(txns);

      // Calculate summary
      const newSummary = calculateAccountSummary(txns);
      setSummary(newSummary);

      // Calculate recovery
      const newRecovery = calculateRecoveryMetrics(trades, fixedTimeTrades, settings.accountBalance);
      setRecovery(newRecovery);

      // Calculate health check
      const health = performHealthCheck(
        txns,
        txns.filter(t => t.type === 'DEPOSIT').length,
        txns.filter(t => t.type === 'WITHDRAWAL').length,
        trades.length + fixedTimeTrades.length,
        newSummary,
        newRecovery
      );
      setHealthCheck(health);

    } catch (error) {
      console.error('Error loading account data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh data
  const refreshData = useCallback(() => {
    loadData();
  }, [loadData]);

  // Auto-load on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    transactions,
    summary,
    recovery,
    healthCheck,
    loading,
    refreshData,
    loadData,
    calculateAccountSummary,
    calculateRecoveryMetrics,
    calculateCombinedBalance,
    calculateWinRate,
    performHealthCheck
  };
}

// ============================================================================
// UTILITY FUNCTIONS FOR UI
// ============================================================================

/**
 * Format amount for display
 */
export function formatAmount(amount: number, currency: string = 'INR'): string {
  const symbol = currency === 'USD' ? '$' : '₹';
  const absAmount = Math.abs(amount);
  
  if (amount < 0) {
    return `-${symbol}${absAmount.toFixed(2)}`;
  }
  return `${symbol}${absAmount.toFixed(2)}`;
}

/**
 * Get status color based on amount
 */
export function getStatusColor(amount: number): string {
  if (amount > 0) return '#2ecc71';
  if (amount < 0) return '#e74c3c';
  return '#f39c12';
}

/**
 * Get status text and icon
 */
export function getStatusInfo(amount: number): { text: string; icon: string; color: string } {
  if (amount > 0) {
    return { text: 'PROFIT', icon: '✅', color: '#2ecc71' };
  }
  if (amount < 0) {
    return { text: 'LOSS', icon: '❌', color: '#e74c3c' };
  }
  return { text: 'EVEN', icon: '⚖️', color: '#f39c12' };
}

/**
 * Get account color
 */
export function getAccountColor(account: string): string {
  const colors: Record<string, string> = {
    'Investment Account': '#2ecc71',
    'Withdrawal Account': '#e74c3c',
    'USD Account': '#3498db',
    'USDT Account': '#9b59b6',
    'Forex Account': '#f39c12',
    'Fixed Time Account': '#00d4ff'
  };
  return colors[account] || '#888888';
}