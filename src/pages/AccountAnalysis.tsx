// src/pages/AccountAnalysis.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Database, CheckCircle2, XCircle, RotateCcw,
  Wallet, Download, Upload, RefreshCw, FileText,
  PieChart, DollarSign, Filter, Info, Shield, TrendingUp, TrendingDown,
  ArrowUpDown, AlertCircle
} from 'lucide-react';
import { getTrades, getFixedTimeTrades, getSettings } from '../store';
import * as XLSX from 'xlsx';

// ============================================================================
// TYPES
// ============================================================================

interface ParsedTransaction {
  DATE: string;
  ACCOUNT: string;
  TYPE: 'DEPOSIT' | 'WITHDRAWAL' | 'BONUS' | 'REWARD' | 'INTERNAL_TRANSFER' | 'UNKNOWN' | 'TRADE_PROFIT' | 'TRADE_LOSS';
  CURRENCY: string;
  AMOUNT: number;
  AMOUNT_INR: number;
  ORIGINAL_AMOUNT: number;
  ORIGINAL_TEXT: string;
  IS_BONUS: boolean;
  IS_REWARD: boolean;
  IS_INTERNAL_TRANSFER: boolean;
  IS_TRADE: boolean;
  IS_USD_DEPOSIT: boolean;
  IS_USD_WITHDRAWAL: boolean;
  IS_REAL_MONEY: boolean;
  PAYMENT_METHOD?: string;
  FROM_ACCOUNT?: string;
  TO_ACCOUNT?: string;
}

interface AccountBreakdown {
  account: string;
  deposits: number;
  withdrawals: number;
  bonuses: number;
  sent: number;
  received: number;
  netInternal: number;
  balance: number;
  truePnl: number;
  realPnl: number;
  status: 'PROFIT' | 'LOSS' | 'EVEN';
}

interface AccountSummary {
  totalDeposits: number;
  totalWithdrawals: number;
  totalBonuses: number;
  totalInternalTransfers: number;
  netPnl: number;
  availableBalance: number;
  totalTradeProfits: number;
  totalTradeLosses: number;
  totalTradePnl: number;
  totalTransactions: number;
  accountBreakdowns: AccountBreakdown[];
  accountDeposits: Record<string, number>;
  accountWithdrawals: Record<string, number>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CURRENCY_SYMBOL = '$';

const VALID_ACCOUNTS = [
  'Forex Account',
  'Investment Account', 
  'USD Account',
  'Withdrawal Account',
  'USDT Account',
  'Fixed Time Account'
];

const ACCOUNT_TYPES = [
  { id: 'investment', label: 'Investment Account' },
  { id: 'withdrawal', label: 'Withdrawal Account' },
  { id: 'usd', label: 'USD Account' },
  { id: 'usdt', label: 'USDT Account' },
  { id: 'forex', label: 'Forex Account' },
];

const MONTH_MAP: Record<string, number> = {
  'JAN': 1, 'JANUARY': 1,
  'FEB': 2, 'FEBRUARY': 2,
  'MAR': 3, 'MARCH': 3,
  'APR': 4, 'APRIL': 4,
  'MAY': 5,
  'JUN': 6, 'JUNE': 6,
  'JUL': 7, 'JULY': 7,
  'AUG': 8, 'AUGUST': 8,
  'SEP': 9, 'SEPTEMBER': 9,
  'OCT': 10, 'OCTOBER': 10,
  'NOV': 11, 'NOVEMBER': 11,
  'DEC': 12, 'DECEMBER': 12
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Parse currency value to number - handles strings with currency symbols
function parseCurrencyValue(value: any): number {
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

// Format currency with negative sign BEFORE the symbol
function formatCurrency(amount: number, currencySymbol: string = '$'): string {
  if (amount < 0) {
    return `-${currencySymbol}${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currencySymbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function normalizeText(text: string): string {
  if (!text || text === 'nan' || text === 'NaN' || text === 'null') return '';
  let result = String(text);
  result = result.replace(/\xa0/g, ' ');
  result = result.replace(/−/g, '-');
  result = result.replace(/—/g, '-');
  result = result.replace(/–/g, '-');
  result = result.replace(/₹/g, 'INR ');
  result = result.replace(/\$/g, 'USD ');
  result = result.replace(/£/g, 'GBP ');
  result = result.replace(/,/g, '');
  result = result.replace(/\s+/g, ' ');
  return result.trim();
}

function parseDateFromString(dateStr: string): string | null {
  if (!dateStr || dateStr === 'nan') return null;
  
  const cleaned = normalizeText(dateStr);
  
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/,
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    /^(\d{2})-(\d{2})-(\d{4})$/,
    /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i,
    /^([A-Za-z]+)\s+(\d{1,2})$/i,
    /^(\d{1,2})\s+([A-Za-z]+)$/i,
  ];
  
  for (const pattern of formats) {
    const match = cleaned.match(pattern);
    if (match) {
      if (pattern === formats[0]) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      } else if (pattern === formats[1] || pattern === formats[2]) {
        return `${match[3]}-${match[2]}-${match[1]}`;
      } else if (pattern === formats[3]) {
        const monthName = match[1].toUpperCase();
        const day = parseInt(match[2]);
        const year = match[3];
        const month = MONTH_MAP[monthName];
        if (month) {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      } else if (pattern === formats[4]) {
        const monthName = match[1].toUpperCase();
        const day = parseInt(match[2]);
        const month = MONTH_MAP[monthName];
        if (month) {
          const currentYear = new Date().getFullYear();
          return `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      } else if (pattern === formats[5]) {
        const day = parseInt(match[1]);
        const monthName = match[2].toUpperCase();
        const month = MONTH_MAP[monthName];
        if (month) {
          const currentYear = new Date().getFullYear();
          return `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }
  }
  
  return null;
}

function parseAmount(text: string): { amount: number; currency: string; isNegative: boolean } | null {
  if (!text) return null;
  
  let cleaned = normalizeText(text);
  let isNegative = false;
  
  if (cleaned.startsWith('-') || cleaned.startsWith('−')) {
    isNegative = true;
    cleaned = cleaned.substring(1).trim();
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1).trim();
  }
  
  let currency = 'INR';
  const upper = cleaned.toUpperCase();
  
  if (upper.includes('USD') || upper.includes('$')) {
    currency = 'USD';
    cleaned = cleaned.replace(/USD/g, '').replace(/\$/g, '').trim();
  } else if (upper.includes('GBP') || upper.includes('£')) {
    currency = 'GBP';
    cleaned = cleaned.replace(/GBP/g, '').replace(/£/g, '').trim();
  } else if (upper.includes('INR') || upper.includes('₹')) {
    currency = 'INR';
    cleaned = cleaned.replace(/INR/g, '').replace(/₹/g, '').trim();
  }
  
  cleaned = cleaned.replace(/,/g, '');
  
  const numberMatch = cleaned.match(/[\d.]+/);
  if (!numberMatch) return null;
  
  const amount = parseFloat(numberMatch[0]);
  if (isNaN(amount)) return null;
  
  return { amount, currency, isNegative };
}

function detectAccount(text: string): string {
  const lower = text.toLowerCase();
  
  if (lower.includes('forex')) return 'Forex Account';
  if (lower.includes('investment')) return 'Investment Account';
  if (lower.includes('usd account') || lower.includes('usd')) return 'USD Account';
  if (lower.includes('withdrawal')) return 'Withdrawal Account';
  if (lower.includes('usdt')) return 'USDT Account';
  if (lower.includes('fixed time') || lower.includes('ft')) return 'Fixed Time Account';
  
  if (/\d{2}\*{3}/.test(lower) || lower.includes('upi') || lower.includes('imps') || 
      lower.includes('p2p') || lower.includes('paytm') || lower.includes('phonepe')) {
    return 'Withdrawal Account';
  }
  
  return 'Investment Account';
}

function detectTransactionType(text: string): ParsedTransaction['TYPE'] {
  const lower = text.toLowerCase();
  
  if (lower.includes('deposit') || lower.includes('credit') || lower.includes('received')) {
    return 'DEPOSIT';
  }
  if (lower.includes('withdrawal') || lower.includes('debit') || lower.includes('sent')) {
    return 'WITHDRAWAL';
  }
  if (lower.includes('bonus') && !lower.includes('removed')) {
    return 'BONUS';
  }
  if (lower.includes('reward')) {
    return 'REWARD';
  }
  if (lower.includes('internal transfer') || lower.includes('transfer')) {
    return 'INTERNAL_TRANSFER';
  }
  if (lower.includes('bonus removed')) {
    return 'WITHDRAWAL';
  }
  
  return 'UNKNOWN';
}

// ============================================================================
// SINGLE-COLUMN PARSER
// ============================================================================

function parseSingleColumnExcel(rows: any[][]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  let currentDate: string | null = null;
  let i = 0;
  
  console.log(`📊 Parsing ${rows.length} rows from single-column Excel`);
  
  while (i < rows.length) {
    const row = rows[i];
    if (!row || row.length === 0) { i++; continue; }
    
    const cellValue = normalizeText(String(row[0] || ''));
    if (!cellValue || cellValue === 'nan') { i++; continue; }
    
    const parsedDate = parseDateFromString(cellValue);
    if (parsedDate) {
      currentDate = parsedDate;
      i++;
      continue;
    }
    
    if (cellValue === '' || cellValue === ' ') {
      i++;
      continue;
    }
    
    if (currentDate) {
      const txnType = detectTransactionType(cellValue);
      const amountInfo = parseAmount(cellValue);
      
      if (amountInfo && currentDate) {
        let typeText = '';
        let accountText = '';
        
        for (let j = 1; j <= 3; j++) {
          const prevIdx = i - j;
          if (prevIdx >= 0) {
            const prevCell = normalizeText(String(rows[prevIdx]?.[0] || ''));
            if (prevCell && prevCell !== '' && prevCell !== ' ') {
              const prevType = detectTransactionType(prevCell);
              if (prevType !== 'UNKNOWN') {
                typeText = prevCell;
              } else if (!accountText && detectAccount(prevCell) !== 'Investment Account') {
                accountText = prevCell;
              }
            }
          }
        }
        
        let account = detectAccount(accountText || typeText);
        
        if (account === 'Investment Account' && 
            (txnType === 'BONUS' || txnType === 'REWARD' || typeText.toLowerCase().includes('bonus'))) {
          account = 'Investment Account';
        }
        
        const isBonusRemoval = typeText.toLowerCase().includes('bonus removed') || 
                              cellValue.toLowerCase().includes('bonus removed');
        
        const isBonus = txnType === 'BONUS' || txnType === 'REWARD' || 
                       typeText.toLowerCase().includes('bonus') || 
                       typeText.toLowerCase().includes('reward');
        
        const isInternal = txnType === 'INTERNAL_TRANSFER' || 
                          typeText.toLowerCase().includes('internal transfer');
        
        const transaction: ParsedTransaction = {
          DATE: currentDate,
          ACCOUNT: account,
          TYPE: txnType,
          CURRENCY: amountInfo.currency,
          AMOUNT: amountInfo.amount,
          AMOUNT_INR: amountInfo.amount * (amountInfo.isNegative ? -1 : 1),
          ORIGINAL_AMOUNT: amountInfo.amount,
          ORIGINAL_TEXT: `${typeText || cellValue} | ${cellValue} | ${accountText}`,
          IS_BONUS: isBonus && !isBonusRemoval,
          IS_REWARD: txnType === 'REWARD',
          IS_INTERNAL_TRANSFER: isInternal,
          IS_TRADE: false,
          IS_USD_DEPOSIT: amountInfo.currency === 'USD' && !amountInfo.isNegative && !isBonus && !isInternal,
          IS_USD_WITHDRAWAL: amountInfo.currency === 'USD' && amountInfo.isNegative && !isBonus && !isInternal,
          IS_REAL_MONEY: !isBonus && !isInternal,
          PAYMENT_METHOD: accountText
        };
        
        transactions.push(transaction);
        i++;
        continue;
      }
      
      if (txnType !== 'UNKNOWN' && i + 1 < rows.length) {
        const nextCell = normalizeText(String(rows[i + 1]?.[0] || ''));
        const nextAmount = parseAmount(nextCell);
        
        if (nextAmount) {
          let accountText = '';
          if (i + 2 < rows.length) {
            accountText = normalizeText(String(rows[i + 2]?.[0] || ''));
          }
          
          const account = detectAccount(accountText || cellValue);
          const amountInr = nextAmount.amount * (nextAmount.isNegative ? -1 : 1);
          
          const isBonus = txnType === 'BONUS' || txnType === 'REWARD';
          const isInternal = txnType === 'INTERNAL_TRANSFER';
          const isBonusRemoval = cellValue.toLowerCase().includes('bonus removed');
          
          const transaction: ParsedTransaction = {
            DATE: currentDate,
            ACCOUNT: account,
            TYPE: txnType,
            CURRENCY: nextAmount.currency,
            AMOUNT: nextAmount.amount,
            AMOUNT_INR: amountInr,
            ORIGINAL_AMOUNT: nextAmount.amount,
            ORIGINAL_TEXT: `${cellValue} | ${nextCell} | ${accountText}`,
            IS_BONUS: isBonus && !isBonusRemoval,
            IS_REWARD: txnType === 'REWARD',
            IS_INTERNAL_TRANSFER: isInternal,
            IS_TRADE: false,
            IS_USD_DEPOSIT: nextAmount.currency === 'USD' && !nextAmount.isNegative && !isBonus && !isInternal,
            IS_USD_WITHDRAWAL: nextAmount.currency === 'USD' && nextAmount.isNegative && !isBonus && !isInternal,
            IS_REAL_MONEY: !isBonus && !isInternal,
            PAYMENT_METHOD: accountText
          };
          
          transactions.push(transaction);
          i += 3;
          continue;
        }
      }
    }
    
    i++;
  }
  
  console.log(`✅ Parsed ${transactions.length} transactions from single-column file`);
  return transactions;
}

// ============================================================================
// COMPUTATIONAL LOGIC - FIXED WITH parseCurrencyValue
// ============================================================================

function calculateAccountBreakdown(transactions: ParsedTransaction[]): AccountBreakdown[] {
  const accountMap = new Map<string, AccountBreakdown>();
  
  VALID_ACCOUNTS.forEach(account => {
    accountMap.set(account, {
      account,
      deposits: 0,
      withdrawals: 0,
      bonuses: 0,
      sent: 0,
      received: 0,
      netInternal: 0,
      balance: 0,
      truePnl: 0,
      realPnl: 0,
      status: 'EVEN'
    });
  });
  
  for (const txn of transactions) {
    const account = txn.ACCOUNT || 'Investment Account';
    const amount = parseCurrencyValue(txn.AMOUNT_INR) || 0;
    const isBonus = txn.IS_BONUS || false;
    const isInternal = txn.IS_INTERNAL_TRANSFER || false;
    const isTrade = txn.IS_TRADE || false;
    
    let entry = accountMap.get(account);
    if (!entry) {
      entry = {
        account,
        deposits: 0,
        withdrawals: 0,
        bonuses: 0,
        sent: 0,
        received: 0,
        netInternal: 0,
        balance: 0,
        truePnl: 0,
        realPnl: 0,
        status: 'EVEN'
      };
      accountMap.set(account, entry);
    }
    
    if (isTrade) {
      entry.balance += amount;
      continue;
    }
    
    if (isBonus) {
      entry.bonuses += amount;
      entry.balance += amount;
    } else if (isInternal) {
      if (amount > 0) {
        entry.received += amount;
      } else {
        entry.sent += Math.abs(amount);
      }
      entry.balance += amount;
    } else if (amount > 0) {
      entry.deposits += amount;
      entry.balance += amount;
    } else if (amount < 0) {
      entry.withdrawals += Math.abs(amount);
      entry.balance += amount;
    }
  }
  
  const results: AccountBreakdown[] = [];
  for (const entry of accountMap.values()) {
    entry.netInternal = entry.received - entry.sent;
    entry.realPnl = entry.deposits - entry.withdrawals + entry.bonuses + entry.netInternal;
    entry.truePnl = entry.realPnl;
    entry.status = entry.realPnl > 0 ? 'PROFIT' : entry.realPnl < 0 ? 'LOSS' : 'EVEN';
    results.push(entry);
  }
  
  results.sort((a, b) => a.account.localeCompare(b.account));
  return results;
}

function calculateSummary(transactions: ParsedTransaction[], trades: any[], fixedTimeTrades: any[]): AccountSummary {
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let totalBonuses = 0;
  let totalInternalTransfers = 0;
  let netPnl = 0;
  
  const accountDeposits: Record<string, number> = {};
  const accountWithdrawals: Record<string, number> = {};
  
  ACCOUNT_TYPES.forEach(acc => {
    accountDeposits[acc.label] = 0;
    accountWithdrawals[acc.label] = 0;
  });
  
  for (const t of transactions) {
    const amount = parseCurrencyValue(t.AMOUNT_INR) || 0;
    const account = t.ACCOUNT || 'Investment Account';
    const isTrade = t.IS_TRADE || false;
    const isInternal = t.IS_INTERNAL_TRANSFER || false;
    
    if (isTrade) {
      continue;
    }
    
    if (isInternal) {
      totalInternalTransfers += Math.abs(amount);
      continue;
    }
    
    if (t.IS_BONUS) {
      totalBonuses += amount;
      netPnl += amount;
    } else if (amount > 0) {
      totalDeposits += amount;
      accountDeposits[account] = (accountDeposits[account] || 0) + amount;
      netPnl += amount;
    } else if (amount < 0) {
      totalWithdrawals += Math.abs(amount);
      accountWithdrawals[account] = (accountWithdrawals[account] || 0) + Math.abs(amount);
      netPnl += amount;
    }
  }
  
  let totalTradeProfits = 0;
  let totalTradeLosses = 0;
  let totalTradePnl = 0;
  
  for (const trade of trades) {
    const pnl = parseCurrencyValue(trade.profitLoss);
    totalTradePnl += pnl;
    if (pnl > 0) {
      totalTradeProfits += pnl;
    } else if (pnl < 0) {
      totalTradeLosses += Math.abs(pnl);
    }
  }
  
  for (const ft of fixedTimeTrades) {
    if (ft.status === 'WON' || ft.status === 'LOST' || ft.status === 'REFUND') {
      const pnl = parseCurrencyValue(ft.tradePnl);
      totalTradePnl += pnl;
      if (pnl > 0) {
        totalTradeProfits += pnl;
      } else if (pnl < 0) {
        totalTradeLosses += Math.abs(pnl);
      }
    }
  }
  
  const settings = getSettings();
  const startingBalance = parseCurrencyValue(settings?.accountBalance) || 0;
  const availableBalance = startingBalance + netPnl + totalTradePnl;
  const accountBreakdowns = calculateAccountBreakdown(transactions);
  
  return {
    totalDeposits,
    totalWithdrawals,
    totalBonuses,
    totalInternalTransfers,
    netPnl: netPnl + totalTradePnl,
    availableBalance,
    totalTradeProfits,
    totalTradeLosses,
    totalTradePnl,
    totalTransactions: transactions.length + trades.length + fixedTimeTrades.length,
    accountBreakdowns,
    accountDeposits,
    accountWithdrawals
  };
}

// ============================================================================
// COMPONENTS
// ============================================================================

const GlassMetricCard: React.FC<{
  title: string;
  value: number | string;
  color: string;
  icon?: React.ReactNode;
  prefix?: string;
  subText?: string;
}> = ({ title, value, color, icon, prefix = '$', subText }) => {
  let formattedValue: string;
  
  if (typeof value === 'number') {
    formattedValue = formatCurrency(value, prefix);
  } else if (typeof value === 'string') {
    let str = value;
    if (str.startsWith(`${prefix}-`)) {
      formattedValue = `-${prefix}${str.substring(2)}`;
    } else if (str.startsWith(`${prefix} -`)) {
      formattedValue = `-${prefix}${str.substring(3)}`;
    } else {
      formattedValue = str;
    }
  } else {
    formattedValue = String(value);
  }

  return (
    <div className="bg-gradient-to-br from-[rgba(20,30,30,0.8)] to-[rgba(30,40,40,0.6)] rounded-xl p-4 border border-[rgba(0,255,136,0.1)] group hover:scale-[1.02] transition-transform">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-xs font-medium">{title}</span>
        {icon && <span className="text-gray-500">{icon}</span>}
      </div>
      <div className="text-xl font-bold" style={{ color }}>{formattedValue}</div>
      {subText && <div className="text-[10px] text-gray-500 mt-1">{subText}</div>}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT - WITH REFRESH SUPPORT
// ============================================================================

interface AccountAnalysisProps {
  refreshTrigger?: number;
}

const AccountAnalysis: React.FC<AccountAnalysisProps> = ({ refreshTrigger = 0 }) => {
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [summary, setSummary] = useState<AccountSummary>({
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalBonuses: 0,
    totalInternalTransfers: 0,
    netPnl: 0,
    availableBalance: 0,
    totalTradeProfits: 0,
    totalTradeLosses: 0,
    totalTradePnl: 0,
    totalTransactions: 0,
    accountBreakdowns: [],
    accountDeposits: {},
    accountWithdrawals: {}
  });
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [fileStatus, setFileStatus] = useState('No file loaded');
  const [importStats, setImportStats] = useState<any>(null);
  const [showImportSummary, setShowImportSummary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 10;

  const saveTransactionsToStorage = useCallback((txns: ParsedTransaction[]) => {
    try {
      localStorage.setItem('account_analysis_transactions', JSON.stringify(txns));
    } catch (e) {
      console.error('Error saving transactions:', e);
    }
  }, []);

  const loadTransactionsFromStorage = useCallback((): ParsedTransaction[] => {
    try {
      const data = localStorage.getItem('account_analysis_transactions');
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error loading transactions:', e);
    }
    return [];
  }, []);

  const loadData = useCallback(() => {
    setLoading(true);
    try {
      let storedTxns = loadTransactionsFromStorage();
      
      if (storedTxns.length === 0) {
        const trades = getTrades();
        const fixedTimeTrades = getFixedTimeTrades();
        const settings = getSettings();
        
        const txns: ParsedTransaction[] = [];
        
        for (const trade of trades) {
          const amount = parseCurrencyValue(trade.profitLoss);
          txns.push({
            DATE: trade.date,
            ACCOUNT: 'Forex Account',
            TYPE: amount > 0 ? 'TRADE_PROFIT' : 'TRADE_LOSS',
            CURRENCY: settings.currency || 'USD',
            AMOUNT: Math.abs(amount),
            AMOUNT_INR: amount,
            ORIGINAL_AMOUNT: Math.abs(amount),
            ORIGINAL_TEXT: `${trade.asset} - ${trade.strategy || 'Trade'}`,
            IS_BONUS: false,
            IS_REWARD: false,
            IS_INTERNAL_TRANSFER: false,
            IS_TRADE: true,
            IS_USD_DEPOSIT: false,
            IS_USD_WITHDRAWAL: false,
            IS_REAL_MONEY: true
          });
        }
        
        for (const ft of fixedTimeTrades) {
          if (ft.status === 'WON' || ft.status === 'LOST' || ft.status === 'REFUND') {
            const amount = parseCurrencyValue(ft.tradePnl);
            txns.push({
              DATE: ft.timestamp.split('T')[0],
              ACCOUNT: 'Fixed Time Account',
              TYPE: amount > 0 ? 'TRADE_PROFIT' : amount < 0 ? 'TRADE_LOSS' : 'UNKNOWN',
              CURRENCY: settings.currency || 'USD',
              AMOUNT: Math.abs(amount),
              AMOUNT_INR: amount,
              ORIGINAL_AMOUNT: ft.tradeAmount,
              ORIGINAL_TEXT: `${ft.asset} - ${ft.duration}s`,
              IS_BONUS: false,
              IS_REWARD: false,
              IS_INTERNAL_TRANSFER: false,
              IS_TRADE: true,
              IS_USD_DEPOSIT: false,
              IS_USD_WITHDRAWAL: false,
              IS_REAL_MONEY: true
            });
          }
        }
        
        storedTxns = txns;
        saveTransactionsToStorage(txns);
      }
      
      setTransactions(storedTxns);
      
      const trades = getTrades();
      const fixedTimeTrades = getFixedTimeTrades();
      const newSummary = calculateSummary(storedTxns, trades, fixedTimeTrades);
      setSummary(newSummary);
      setFileStatus(`📊 ${storedTxns.length} transactions loaded`);
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [loadTransactionsFromStorage, saveTransactionsToStorage]);

  // Listen for refreshTrigger changes to reload data
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 Account Analysis refreshing due to external trigger');
      loadData();
    }
  }, [refreshTrigger, loadData]);

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    setLoading(true);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      const parsedTxns = parseSingleColumnExcel(jsonData as any[][]);
      
      if (parsedTxns.length === 0) {
        alert('No transactions found in the file. Please check the format.');
        setImporting(false);
        setLoading(false);
        return;
      }
      
      const filteredTxns = parsedTxns.filter(t => 
        t.TYPE === 'DEPOSIT' || 
        t.TYPE === 'WITHDRAWAL' || 
        t.TYPE === 'BONUS' || 
        t.TYPE === 'REWARD' || 
        t.TYPE === 'INTERNAL_TRANSFER'
      );
      
      if (filteredTxns.length === 0) {
        alert('No deposit/withdrawal transactions found in the file. Trade history is handled separately.');
        setImporting(false);
        setLoading(false);
        return;
      }
      
      const allTxns = [...transactions, ...filteredTxns];
      setTransactions(allTxns);
      saveTransactionsToStorage(allTxns);
      
      const trades = getTrades();
      const fixedTimeTrades = getFixedTimeTrades();
      const newSummary = calculateSummary(allTxns, trades, fixedTimeTrades);
      setSummary(newSummary);
      
      const wins = filteredTxns.filter(t => t.AMOUNT_INR > 0).length;
      const losses = filteredTxns.filter(t => t.AMOUNT_INR < 0).length;
      const refunds = filteredTxns.filter(t => t.AMOUNT_INR === 0).length;
      const totalPnl = filteredTxns.reduce((sum, t) => sum + parseCurrencyValue(t.AMOUNT_INR), 0);
      
      setImportStats({
        total: filteredTxns.length,
        imported: filteredTxns.length,
        duplicates: 0,
        totalPnl: Math.round(totalPnl * 100) / 100,
        wins,
        losses,
        refunds,
        currency: 'USD'
      });
      setShowImportSummary(true);
      setFileStatus(`✅ ${filteredTxns.length} transactions imported from ${file.name}`);
      
    } catch (error) {
      console.error('Error importing file:', error);
      alert('Error importing file. Please check the format.');
    } finally {
      setImporting(false);
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const exportData = () => {
    if (transactions.length === 0) {
      alert('No data to export');
      return;
    }
    
    const headers = ['DATE', 'ACCOUNT', 'TYPE', 'CURRENCY', 'AMOUNT', 'AMOUNT_INR', 'IS_BONUS', 'IS_INTERNAL', 'IS_TRADE', 'ORIGINAL_TEXT'];
    const rows = transactions.map(t => [
      t.DATE, t.ACCOUNT, t.TYPE, t.CURRENCY, 
      t.AMOUNT.toFixed(2), t.AMOUNT_INR.toFixed(2),
      t.IS_BONUS ? 'Yes' : 'No',
      t.IS_INTERNAL_TRANSFER ? 'Yes' : 'No',
      t.IS_TRADE ? 'Yes' : 'No',
      t.ORIGINAL_TEXT
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `account_analysis_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportFullReport = () => {
    if (transactions.length === 0) {
      alert('No data to export');
      return;
    }
    
    let report = 'ACCOUNT ANALYSIS REPORT\n';
    report += '='.repeat(60) + '\n\n';
    
    report += 'SUMMARY:\n';
    const CS = getSettings()?.currencySymbol || '$';
    report += `  Total Deposits: ${formatCurrency(summary.totalDeposits, CS)}\n`;
    report += `  Total Withdrawals: ${formatCurrency(summary.totalWithdrawals, CS)}\n`;
    report += `  Total Bonuses: ${formatCurrency(summary.totalBonuses, CS)}\n`;
    report += `  Internal Transfers: ${formatCurrency(summary.totalInternalTransfers, CS)}\n`;
    report += `  Net P&L (Deposits/Withdrawals): ${formatCurrency(summary.netPnl, CS)}\n`;
    report += `  Trade Profits: ${formatCurrency(summary.totalTradeProfits, CS)}\n`;
    report += `  Trade Losses: ${formatCurrency(summary.totalTradeLosses, CS)}\n`;
    report += `  Total Trade P&L: ${formatCurrency(summary.totalTradePnl, CS)}\n`;
    report += `  Available Balance: ${formatCurrency(summary.availableBalance, CS)}\n`;
    report += `  Total Transactions: ${summary.totalTransactions}\n\n`;
    
    report += 'ACCOUNT BREAKDOWN:\n';
    report += '-'.repeat(60) + '\n';
    for (const acc of summary.accountBreakdowns) {
      if (acc.deposits === 0 && acc.withdrawals === 0 && acc.bonuses === 0) continue;
      report += `\n${acc.account}:\n`;
      report += `  Deposits: ${formatCurrency(acc.deposits, CS)}\n`;
      report += `  Withdrawals: ${formatCurrency(acc.withdrawals, CS)}\n`;
      report += `  Bonuses: ${formatCurrency(acc.bonuses, CS)}\n`;
      report += `  Balance: ${formatCurrency(acc.balance, CS)}\n`;
      report += `  Status: ${acc.status}\n`;
    }
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `account_report_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAllData = () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      setTransactions([]);
      localStorage.removeItem('account_analysis_transactions');
      const trades = getTrades();
      const fixedTimeTrades = getFixedTimeTrades();
      setSummary(calculateSummary([], trades, fixedTimeTrades));
      setFileStatus('No file loaded');
    }
  };

  const getPaginatedBreakdowns = () => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return summary.accountBreakdowns.slice(start, end);
  };

  const totalPages = Math.ceil(summary.accountBreakdowns.filter(a => 
    a.deposits !== 0 || a.withdrawals !== 0 || a.bonuses !== 0
  ).length / itemsPerPage);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw size={40} className="animate-spin text-[#00ff88] mx-auto mb-4" />
          <p className="text-gray-400">Loading account analysis...</p>
        </div>
      </div>
    );
  }

  const getAccountDepositSummary = () => {
    return ACCOUNT_TYPES.map(acc => ({
      ...acc,
      deposits: summary.accountDeposits[acc.label] || 0,
      withdrawals: summary.accountWithdrawals[acc.label] || 0
    }));
  };

  const formatTableCurrency = (amount: number): string => {
    const CS = getSettings()?.currencySymbol || '$';
    if (amount < 0) {
      return `-${CS}${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${CS}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const CS = getSettings()?.currencySymbol || '$';

  return (
    <div className="space-y-4 p-6" data-testid="account-analysis-page">
      {/* Import Summary Modal */}
      {showImportSummary && importStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowImportSummary(false)}>
          <div className="bg-[rgba(20,30,30,0.95)] p-6 w-[440px] rounded-xl space-y-4 border border-[rgba(0,255,136,0.2)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00ff88] to-[#00d4ff] flex items-center justify-center">
                <FileText size={20} className="text-black" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#00ff88]">Import Complete</h3>
                <p className="text-[10px] text-gray-500">Transactions parsed and imported</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-[rgba(0,255,136,0.08)] text-center">
                <div className="text-xl font-bold text-[#00ff88]">{importStats.imported}</div>
                <div className="text-[9px] text-gray-500">IMPORTED</div>
              </div>
              <div className="p-3 rounded-lg bg-[rgba(255,221,0,0.08)] text-center">
                <div className="text-xl font-bold text-[#ffdd00]">{importStats.duplicates}</div>
                <div className="text-[9px] text-gray-500">DUPLICATES</div>
              </div>
              <div className="p-3 rounded-lg bg-[rgba(0,212,255,0.08)] text-center">
                <CheckCircle2 size={14} className="text-[#00ff88] mx-auto mb-1" />
                <div className="text-sm font-bold text-[#00ff88]">{importStats.wins}</div>
                <div className="text-[9px] text-gray-500">WINS</div>
              </div>
              <div className="p-3 rounded-lg bg-[rgba(255,51,102,0.08)] text-center">
                <XCircle size={14} className="text-[#ff3366] mx-auto mb-1" />
                <div className="text-sm font-bold text-[#ff3366]">{importStats.losses}</div>
                <div className="text-[9px] text-gray-500">LOSSES</div>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[rgba(30,42,58,0.5)] flex items-center justify-between">
              <span className="text-xs text-gray-400">Total P&L</span>
              <span className={`text-lg font-bold ${importStats.totalPnl >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                {formatCurrency(importStats.totalPnl, CS)}
              </span>
            </div>
            <button onClick={() => setShowImportSummary(false)} className="w-full py-2 rounded-lg bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold">
              Done
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-[#00ff88] to-[#00d4ff]">
            <Wallet size={24} className="text-black" />
          </div>
          <h1 className="text-xl font-bold text-[#00ff88]">ACCOUNT ANALYSIS</h1>
        </div>
        <div className="flex items-center gap-3">
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileImport} />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(30,40,40,0.8)] text-[#00ff88] hover:bg-[rgba(40,50,50,0.9)] transition-all text-sm disabled:opacity-50"
          >
            {importing ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
            {importing ? 'Importing...' : 'Select file to Load'}
          </button>
          <button 
            onClick={loadData} 
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(30,40,40,0.8)] text-[#00ff88] hover:bg-[rgba(40,50,50,0.9)] transition-all text-sm"
          >
            <Database size={16} />
            Load from Database
          </button>
        </div>
      </div>

      {/* File Status */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">{fileStatus}</div>
        <div className="text-sm text-gray-500">{new Date().toLocaleString()}</div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassMetricCard 
          title="DEPOSITS" 
          value={summary.totalDeposits} 
          color="#2ecc71"
          icon={<TrendingUp size={16} />}
          subText="Across all accounts"
        />
        <GlassMetricCard 
          title="WITHDRAWALS" 
          value={summary.totalWithdrawals} 
          color="#e74c3c"
          icon={<TrendingDown size={16} />}
          subText="Across all accounts"
        />
        <GlassMetricCard 
          title="INTERNAL TRANSFER" 
          value={summary.totalInternalTransfers} 
          color="#3498db"
          icon={<ArrowUpDown size={16} />}
        />
        <GlassMetricCard 
          title="BONUS" 
          value={summary.totalBonuses} 
          color="#9b59b6"
          icon={<AlertCircle size={16} />}
        />
        <GlassMetricCard 
          title="TOTAL PROFITS" 
          value={summary.totalTradeProfits} 
          color="#27ae60"
          icon={<TrendingUp size={16} />}
          subText="From trades only"
        />
        <GlassMetricCard 
          title="TOTAL LOSSES" 
          value={summary.totalTradeLosses} 
          color="#e74c3c"
          icon={<TrendingDown size={16} />}
          subText="From trades only"
        />
        <GlassMetricCard 
          title="NET P&L" 
          value={summary.netPnl} 
          color={summary.netPnl >= 0 ? "#00ff88" : "#e74c3c"}
          icon={<DollarSign size={16} />}
          subText="Total P&L from all sources"
        />
        <GlassMetricCard 
          title="AVAILABLE BALANCE" 
          value={summary.availableBalance} 
          color={summary.availableBalance >= 0 ? "#2ecc71" : "#e74c3c"}
          icon={<Wallet size={16} />}
        />
      </div>

      {/* Account-wise Deposit/Withdrawal Breakdown */}
      <div className="bg-[rgba(20,30,30,0.5)] rounded-xl p-4 border border-[rgba(0,255,136,0.1)]">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Wallet size={14} className="text-[#00d4ff]" /> Account-wise Deposits & Withdrawals
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {getAccountDepositSummary().map(acc => (
            <div key={acc.id} className="p-3 rounded-lg bg-[rgba(30,42,58,0.3)] border border-[rgba(255,255,255,0.05)]">
              <div className="text-xs text-gray-400 mb-2">{acc.label}</div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-green-400">Dep: {formatTableCurrency(acc.deposits)}</span>
                <span className="text-xs text-red-400">Wth: {formatTableCurrency(acc.withdrawals)}</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                Net: {formatTableCurrency(acc.deposits - acc.withdrawals)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Account Breakdown Table */}
      <div className="bg-[rgba(20,30,30,0.7)] rounded-xl overflow-hidden border border-[rgba(0,255,136,0.1)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(0,255,136,0.1)] bg-[rgba(0,255,136,0.05)]">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Account</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Deposits</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Withdrawals</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Bonuses</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Sent</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Received</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Net Internal</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Balance</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">True P&L</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Real P&L</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {getPaginatedBreakdowns().filter(a => 
                a.deposits !== 0 || a.withdrawals !== 0 || a.bonuses !== 0 || a.balance !== 0
              ).map((row, idx) => {
                const isProfit = row.status === 'PROFIT';
                const isLoss = row.status === 'LOSS';
                
                return (
                  <tr key={idx} className="border-b border-[rgba(0,255,136,0.05)] hover:bg-[rgba(0,255,136,0.02)]">
                    <td className="py-2 px-4 text-[#88c0d0]">{row.account}</td>
                    <td className="py-2 px-4 text-right text-green-400">{formatTableCurrency(row.deposits)}</td>
                    <td className="py-2 px-4 text-right text-red-400">{formatTableCurrency(row.withdrawals)}</td>
                    <td className="py-2 px-4 text-right text-yellow-400">{formatTableCurrency(row.bonuses)}</td>
                    <td className="py-2 px-4 text-right text-red-400">{formatTableCurrency(row.sent)}</td>
                    <td className="py-2 px-4 text-right text-green-400">{formatTableCurrency(row.received)}</td>
                    <td className={`py-2 px-4 text-right font-medium ${row.netInternal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatTableCurrency(row.netInternal)}
                    </td>
                    <td className={`py-2 px-4 text-right font-medium ${row.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatTableCurrency(row.balance)}
                    </td>
                    <td className="py-2 px-4 text-right text-gray-400">{formatTableCurrency(row.truePnl)}</td>
                    <td className={`py-2 px-4 text-right font-medium ${row.realPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatTableCurrency(row.realPnl)}
                    </td>
                    <td className="py-2 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        isProfit ? 'bg-[rgba(0,255,136,0.1)] text-[#00ff88]' : 
                        isLoss ? 'bg-[rgba(255,51,102,0.1)] text-[#ff3366]' :
                        'bg-[rgba(255,221,0,0.1)] text-[#ffdd00]'
                      }`}>
                        {isProfit ? '✅ PROFIT' : isLoss ? '❌ LOSS' : '⚖️ EVEN'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
            disabled={currentPage === 1} 
            className="p-2 rounded-lg bg-[rgba(30,40,40,0.8)] disabled:opacity-50 hover:bg-[rgba(40,50,50,0.9)] transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-400">Page {currentPage} of {totalPages}</span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
            disabled={currentPage === totalPages} 
            className="p-2 rounded-lg bg-[rgba(30,40,40,0.8)] disabled:opacity-50 hover:bg-[rgba(40,50,50,0.9)] transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[rgba(0,255,136,0.1)]">
        <div className="flex items-center gap-3">
          <button 
            onClick={exportData} 
            disabled={transactions.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(30,40,40,0.8)] text-[#00ff88] text-sm hover:bg-[rgba(40,50,50,0.9)] transition-all disabled:opacity-50"
          >
            <FileText size={14} />
            Export Data
          </button>
          <button 
            onClick={exportFullReport} 
            disabled={transactions.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(30,40,40,0.8)] text-[#00d4ff] text-sm hover:bg-[rgba(40,50,50,0.9)] transition-all disabled:opacity-50"
          >
            <FileText size={14} />
            Export Full Report
          </button>
          <button 
            onClick={clearAllData}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,51,102,0.2)] text-[#ff3366] text-sm hover:bg-[rgba(255,51,102,0.3)] transition-all"
          >
            <RotateCcw size={14} />
            Clear Data
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">📊 {transactions.length} txns</span>
          <button 
            onClick={loadData} 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(30,40,40,0.8)] text-[#00ff88] text-sm hover:bg-[rgba(40,50,50,0.9)] transition-all"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountAnalysis;