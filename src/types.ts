// src/types.ts

// ============================================================
// CORE TRADE TYPES (Enhanced)
// ============================================================

export interface Trade {
  id: string;
  asset: string;
  marketType: string;
  direction: 'buy' | 'sell';
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  amount: number;
  riskPercent: number;
  profitLoss: number;
  profitLossPercent: number;
  duration: string;
  date: string;
  time: string;
  strategy: string;
  marketCondition: string;
  confidence: number;
  emotionBefore: string;
  emotionAfter: string;
  mistakeCategory: string;
  notes: string;
  tags: string[];
  isWin: boolean;
  riskRewardRatio: number;
  createdAt: string;
  
  // Enhanced fields for new dashboard
  pair?: string;
  type?: 'LONG' | 'SHORT';
  pnl?: number;
  emotionalState?: 'calm' | 'disciplined' | 'excited' | 'anxious' | 'fearful' | 'greedy';
  followedPlan?: boolean;
  stopLossPrice?: number;
  takeProfitPrice?: number;
}

// ============================================================
// GOAL TYPES (Enhanced)
// ============================================================

export interface Goal {
  id: string;
  title: string;
  category: string;
  target: number;
  current: number;
  unit: string;
  deadline: string;
  createdAt: string;
  completed: boolean;
  notes?: string; // Enhanced field
}

// ============================================================
// APP SETTINGS (Enhanced)
// ============================================================

export interface AppSettings {
  dailyTradeLimit: number;
  dailyLossLimit: number;
  maxRiskPerTrade: number;
  cooldownAfterLoss: number;
  accountBalance: number;
  currency: string;
  currencySymbol: string;
  recoveryAutoActivate: boolean;
  consecutiveLossThreshold: number;
  drawdownThreshold: number;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  
  // Enhanced fields for new dashboard
  riskPercentageTarget?: number;
  disciplinePassScore?: number;
  initialBalance?: number;
}

// ============================================================
// DAY GOAL TYPE (For 31-Day Roadmap)
// ============================================================

export interface DayGoal {
  day: number;
  title: string;
  icon: string;
  description: string;
  target: string;
  category: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  check: (trades: Trade[], goals: Goal[], settings: AppSettings) => boolean;
  xpReward: number;
  isFinal?: boolean;
  tip: string;
}

// ============================================================
// EXISTING TYPES (Kept as is)
// ============================================================

export interface DailyLog {
  date: string;
  trades: number;
  pnl: number;
  emotionScore: number;
  disciplineScore: number;
  notes: string;
}

export interface RecoveryState {
  active: boolean;
  activatedAt: string;
  reason: string;
  consecutiveLosses: number;
  drawdownPercent: number;
  dailyTradeLimit: number;
  cooldownMinutes: number;
  lastCooldownStart: string;
  emotionalScore: number;
  recoveryProgress: number;
  safeTradesCompleted: number;
  safeTradesRequired: number;
}

export interface PsychologyEntry {
  date: string;
  emotionalStability: number;
  disciplineScore: number;
  confidenceLevel: number;
  stressLevel: number;
  fearGreedBalance: number;
  patienceLevel: number;
  notes: string;
}

export interface AIWarning {
  id: string;
  type: 'overtrading' | 'emotional' | 'risk' | 'revenge' | 'gambling' | 'fatigue' | 'loss_streak' | 'recovery';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  dismissed: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar: string;
  country: string;
  timezone: string;
  createdAt: string;
  lastLogin: string;
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  sessionToken: string;
}

// ============================================================
// WORLD CURRENCIES
// ============================================================

export const WORLD_CURRENCIES: { code: string; symbol: string; name: string }[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'CLP', symbol: 'CL$', name: 'Chilean Peso' },
  { code: 'COP', symbol: 'COL$', name: 'Colombian Peso' },
  { code: 'PEN', symbol: 'S/.', name: 'Peruvian Sol' },
  { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso' },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  { code: 'BTC', symbol: '₿', name: 'Bitcoin' },
  { code: 'ETH', symbol: 'Ξ', name: 'Ethereum' },
  { code: 'USDT', symbol: '₮', name: 'Tether' },
];

// ============================================================
// VERSION CONSTANTS
// ============================================================

export const APP_VERSION = '4.3.0';
export const APP_BUILD = '2025.07.15';

export type PageType = "dashboard" | "trade-entry" | "olymptrade" | "analytics" | "graphs" | "recovery" | "ai-intelligence" | "voice-assistant" | "psychology" | "risk-management" | "calendar" | "reports" | "goals" | "settings" | "profile" | "help" | "account-analysis" | "trading-roadmap";

// ============================================================
// OLYMPTRADE CONSTANTS
// ============================================================

export const OLYMPTRADE_ASSETS = [
  { name: 'EUR/USD', category: 'Forex', payout: 82, otc: false },
  { name: 'GBP/USD', category: 'Forex', payout: 80, otc: false },
  { name: 'USD/JPY', category: 'Forex', payout: 80, otc: false },
  { name: 'AUD/USD', category: 'Forex', payout: 79, otc: false },
  { name: 'USD/CHF', category: 'Forex', payout: 78, otc: false },
  { name: 'EUR/GBP', category: 'Forex', payout: 77, otc: false },
  { name: 'EUR/JPY', category: 'Forex', payout: 78, otc: false },
  { name: 'GBP/JPY', category: 'Forex', payout: 76, otc: false },
  { name: 'NZD/USD', category: 'Forex', payout: 75, otc: false },
  { name: 'USD/CAD', category: 'Forex', payout: 76, otc: false },
  { name: 'EUR/USD (OTC)', category: 'OTC', payout: 85, otc: true },
  { name: 'GBP/USD (OTC)', category: 'OTC', payout: 85, otc: true },
  { name: 'USD/JPY (OTC)', category: 'OTC', payout: 85, otc: true },
  { name: 'AUD/USD (OTC)', category: 'OTC', payout: 84, otc: true },
  { name: 'EUR/GBP (OTC)', category: 'OTC', payout: 84, otc: true },
  { name: 'GBP/JPY (OTC)', category: 'OTC', payout: 83, otc: true },
  { name: 'AUD/CAD (OTC)', category: 'OTC', payout: 83, otc: true },
  { name: 'NZD/USD (OTC)', category: 'OTC', payout: 82, otc: true },
  { name: 'BTC/USD', category: 'Crypto', payout: 80, otc: false },
  { name: 'ETH/USD', category: 'Crypto', payout: 78, otc: false },
  { name: 'LTC/USD', category: 'Crypto', payout: 75, otc: false },
  { name: 'Gold', category: 'Commodities', payout: 80, otc: false },
  { name: 'Silver', category: 'Commodities', payout: 77, otc: false },
  { name: 'Oil', category: 'Commodities', payout: 76, otc: false },
  { name: 'Europe Composite Index', category: 'Indices', payout: 82, otc: false },
  { name: 'Asia Composite Index', category: 'Indices', payout: 80, otc: false },
  { name: 'Dow Jones', category: 'Indices', payout: 78, otc: false },
  { name: 'NASDAQ', category: 'Indices', payout: 79, otc: false },
  { name: 'Maha Crypto Index', category: 'Custom', payout: 85, otc: false },
  { name: 'Moonch Crypto Index', category: 'Custom', payout: 84, otc: false },
  { name: 'Astro Crypto Index', category: 'Custom', payout: 83, otc: false },
  { name: 'Basic Dollar Index', category: 'Custom', payout: 82, otc: false },
  { name: 'Basic Altcoin Index', category: 'Custom', payout: 80, otc: false },
  { name: 'Cricket Index', category: 'Custom', payout: 85, otc: false },
];

// ============================================================
// FIXED TIME TRADING TYPES
// ============================================================

export type FixedTimeDirection = 'UP' | 'DOWN';
export type FixedTimeStatus = 'ACTIVE' | 'WON' | 'LOST' | 'REFUND' | 'EXPIRED' | 'PENDING_RESULT';
export type ExpiryDuration = 5 | 10 | 15 | 30 | 45 | 60 | 120 | 180 | 300 | 900 | 1800 | 3600;

export interface FixedTimeTrade {
  id: string;
  timestamp: string;
  asset: string;
  direction: FixedTimeDirection;
  entryPrice: number;
  expiryPrice: number | null;
  duration: ExpiryDuration;
  payoutPercent: number;
  tradeAmount: number;
  result: FixedTimeStatus | null;
  tradePnl: number;
  status: FixedTimeStatus;
  entryTime: string;
  expiryTime: string;
  notes: string;
  strategy: string;
  confidence: number;
  marketCondition: string;
  isOtc: boolean;
  createdAt: string;
}

export const EXPIRY_DURATIONS: { value: ExpiryDuration; label: string }[] = [
  { value: 5, label: '5 Seconds' },
  { value: 10, label: '10 Seconds' },
  { value: 15, label: '15 Seconds' },
  { value: 30, label: '30 Seconds' },
  { value: 45, label: '45 Seconds' },
  { value: 60, label: '1 Minute' },
  { value: 120, label: '2 Minutes' },
  { value: 180, label: '3 Minutes' },
  { value: 300, label: '5 Minutes' },
  { value: 900, label: '15 Minutes' },
  { value: 1800, label: '30 Minutes' },
  { value: 3600, label: '1 Hour' },
];

export const FIXED_TIME_ASSETS = [
  'Asia Composite Index','Basic Dollar Index','Basic Altcoin Index',
  'Cricket composite index','crypto Composite Index','Maha jantar Index',
  'Moonch Crypto Index','Europe Composite Index','EUR/USD',
  'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD',
  'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'EUR/AUD', 'GBP/AUD',
  'EUR/USD (OTC)', 'GBP/USD (OTC)', 'USD/JPY (OTC)', 'AUD/USD (OTC)',
  'EUR/GBP (OTC)', 'GBP/JPY (OTC)', 'AUD/CAD (OTC)', 'NZD/USD (OTC)',
  'BTC/USD', 'ETH/USD', 'LTC/USD', 'XRP/USD', 'BNB/USD', 'DOGE/USD',
  'BTC/USD (OTC)', 'ETH/USD (OTC)',
  'GOLD', 'SILVER', 'OIL', 'GOLD (OTC)', 'SILVER (OTC)',
  'US100', 'US500', 'US30', 'DE30', 'UK100', 'JP225',
  'AAPL', 'GOOGL', 'AMZN', 'TSLA', 'META', 'MSFT', 'NVDA'
];

export const FIXED_TIME_STRATEGIES = [
  'Trend Following', 'Support/Resistance', 'Breakout', 'Reversal',
  'News Trading', 'Scalping', 'Martingale', 'Anti-Martingale',
  'Bollinger Bands', 'RSI Divergence', 'MACD Crossover', 'Moving Average',
  'Price Action', 'Supply/Demand', 'Fibonacci', 'ICT/SMC', 'OTC Pattern'
];