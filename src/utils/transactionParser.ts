// src/utils/transactionParser.ts
/**
 * Transaction Parser for Excel/CSV Files
 * Consolidated from all parser implementations
 * Supports: Single-column Excel, Multi-column Excel, CSV, Text blocks
 * Handles: USD ($), INR (₹), EUR (€), GBP (£), and other currencies
 * Date formats: Multiple formats including "Jun 1", "Jan 15th", "04-Jun-26"
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ParsedTransaction {
  DATE: string;
  ACCOUNT: string;
  TYPE: 'DEPOSIT' | 'WITHDRAWAL' | 'BONUS' | 'REWARD' | 'INTERNAL_TRANSFER' | 'UNKNOWN';
  CURRENCY: string;
  AMOUNT: number;
  AMOUNT_INR: number;
  ORIGINAL_AMOUNT: number;
  ORIGINAL_TEXT: string;
  IS_BONUS: boolean;
  IS_REWARD: boolean;
  IS_INTERNAL_TRANSFER: boolean;
  IS_USD_DEPOSIT: boolean;
  IS_USD_WITHDRAWAL: boolean;
  IS_REAL_MONEY: boolean;
  PAYMENT_METHOD?: string;
  FROM_ACCOUNT?: string;
  TO_ACCOUNT?: string;
  TRADE_ID?: string;
}

export interface ImportStats {
  total: number;
  imported: number;
  duplicates: number;
  totalPnl: number;
  wins: number;
  losses: number;
  refunds: number;
  currency: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CURRENT_YEAR = new Date().getFullYear();

export const VALID_TRADING_ACCOUNTS = [
  "Investment Account",
  "Withdrawal Account",
  "USD Account",
  "USDT Account",
  "Forex Account",
  "Fixed Time Account"
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
  "fx": "Forex Account",
  "fixed time": "Fixed Time Account",
  "ft": "Fixed Time Account",
  "index": "Investment Account",
  "crypto": "Investment Account",
  "otc": "Investment Account"
};

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

// Asset keywords for trade detection
const ASSET_KEYWORDS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'USD/CHF',
  'Index', 'Crypto', 'OTC', 'Gold', 'Silver', 'Oil',
  'BTC', 'ETH', 'NASDAQ', 'Dow Jones', 'S&P 500',
  'Apple', 'Amazon', 'Google', 'Microsoft', 'Tesla',
  'Bitcoin', 'Ethereum', 'Litecoin', 'XRP', 'BNB', 'DOGE',
  'Compound Index', 'Asia Composite Index', 'Astro Index', 'Moonch Index',
  'Europe Composite', 'Maha Index'
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateTradeId(transaction: Partial<ParsedTransaction>): string {
  const data = [
    transaction.DATE || '',
    transaction.ACCOUNT || '',
    transaction.CURRENCY || '',
    String(transaction.AMOUNT || 0),
    String(transaction.AMOUNT_INR || 0),
    Date.now().toString()
  ].join('_');
  
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `TXN_${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

// ============================================================================
// TEXT NORMALIZATION FUNCTIONS
// ============================================================================

export function normalizeText(text: string): string {
  if (!text || text === 'nan' || text === 'NaN' || text === 'null' || text === 'N/A') {
    return '';
  }

  let result = String(text);

  // Replace special spaces and characters
  result = result.replace(/\xa0/g, ' ');
  result = result.replace(/\u200b/g, '');
  result = result.replace(/\u2009/g, ' ');
  result = result.replace(/\u2002/g, ' ');
  result = result.replace(/\u2003/g, ' ');
  
  // Fix common symbols
  result = result.replace(/−/g, '-');
  result = result.replace(/—/g, '-');
  result = result.replace(/–/g, '-');
  result = result.replace(/•/g, '•');
  result = result.replace(/●/g, '•');
  result = result.replace(/◦/g, '•');

  // Replace currency symbols
  result = result.replace(/₹/g, 'INR ');
  result = result.replace(/\$/g, 'USD ');
  result = result.replace(/€/g, 'EUR ');
  result = result.replace(/£/g, 'GBP ');
  result = result.replace(/¥/g, 'JPY ');

  // Remove multiple spaces
  result = result.replace(/\s+/g, ' ');

  // Trim
  result = result.trim();

  return result;
}

export function cleanCurrencyString(text: string): string {
  if (!text) return '';
  let cleaned = normalizeText(text);
  cleaned = cleaned.replace(/[^\d.-]/g, '');
  return cleaned;
}

// ============================================================================
// DATE PARSING - Enhanced
// ============================================================================

export function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr === 'nan' || dateStr === 'N/A') return null;

  const cleaned = normalizeText(dateStr);
  const original = cleaned;

  // Try standard formats
  const standardFormats = [
    /^(\d{4})-(\d{2})-(\d{2})$/, // 2024-01-15
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // 15/01/2024
    /^(\d{2})-(\d{2})-(\d{4})$/, // 15-01-2024
    /^(\d{2})\.(\d{2})\.(\d{4})$/, // 15.01.2024
  ];

  for (const pattern of standardFormats) {
    const match = cleaned.match(pattern);
    if (match) {
      if (pattern === standardFormats[0]) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      } else if (pattern === standardFormats[1] || pattern === standardFormats[2] || pattern === standardFormats[3]) {
        return `${match[3]}-${match[2]}-${match[1]}`;
      }
    }
  }

  // Month name formats: "January 15, 2024" or "Jan 15, 2024"
  const monthNamePattern = /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i;
  const monthNameMatch = cleaned.match(monthNamePattern);
  if (monthNameMatch) {
    const monthName = monthNameMatch[1].toUpperCase();
    const day = parseInt(monthNameMatch[2]);
    const year = monthNameMatch[3];
    const month = MONTH_MAP[monthName];
    if (month) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Day month year: "15 January 2024"
  const dayMonthYearPattern = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i;
  const dayMonthYearMatch = cleaned.match(dayMonthYearPattern);
  if (dayMonthYearMatch) {
    const day = parseInt(dayMonthYearMatch[1]);
    const monthName = dayMonthYearMatch[2].toUpperCase();
    const year = dayMonthYearMatch[3];
    const month = MONTH_MAP[monthName];
    if (month) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Short month-day formats: "Jun 1", "Jan 15"
  const shortMonthPattern = /^([A-Za-z]+)\s+(\d{1,2})$/i;
  const shortMatch = cleaned.match(shortMonthPattern);
  if (shortMatch) {
    const monthName = shortMatch[1].toUpperCase();
    const day = parseInt(shortMatch[2]);
    const month = MONTH_MAP[monthName];
    if (month) {
      return `${CURRENT_YEAR}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Day-month formats: "15 Jan", "4 June"
  const dayMonthPattern = /^(\d{1,2})\s+([A-Za-z]+)$/i;
  const dayMonthMatch = cleaned.match(dayMonthPattern);
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1]);
    const monthName = dayMonthMatch[2].toUpperCase();
    const month = MONTH_MAP[monthName];
    if (month) {
      return `${CURRENT_YEAR}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Day-month with hyphens: "04-Jun-26"
  const hyphenPattern = /^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/;
  const hyphenMatch = cleaned.match(hyphenPattern);
  if (hyphenMatch) {
    const day = parseInt(hyphenMatch[1]);
    const monthName = hyphenMatch[2].toUpperCase();
    let year = hyphenMatch[3];
    if (year.length === 2) year = `20${year}`;
    const month = MONTH_MAP[monthName];
    if (month) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Month-day with hyphen: "Jun-01"
  const monthDayHyphen = /^([A-Za-z]{3})-(\d{1,2})$/;
  const monthDayMatch = cleaned.match(monthDayHyphen);
  if (monthDayMatch) {
    const monthName = monthDayMatch[1].toUpperCase();
    const day = parseInt(monthDayMatch[2]);
    const month = MONTH_MAP[monthName];
    if (month) {
      return `${CURRENT_YEAR}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Month day with ordinal: "Jan 15th", "August 4th"
  const ordinalPattern = /^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)$/i;
  const ordinalMatch = cleaned.match(ordinalPattern);
  if (ordinalMatch) {
    const monthName = ordinalMatch[1].toUpperCase();
    const day = parseInt(ordinalMatch[2]);
    const month = MONTH_MAP[monthName];
    if (month) {
      return `${CURRENT_YEAR}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Day with ordinal + month: "15th Jan", "4th August"
  const dayOrdinalPattern = /^(\d{1,2})(?:st|nd|rd|th)\s+([A-Za-z]+)$/i;
  const dayOrdinalMatch = cleaned.match(dayOrdinalPattern);
  if (dayOrdinalMatch) {
    const day = parseInt(dayOrdinalMatch[1]);
    const monthName = dayOrdinalMatch[2].toUpperCase();
    const month = MONTH_MAP[monthName];
    if (month) {
      return `${CURRENT_YEAR}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Try JavaScript Date parsing as last resort
  const jsDate = new Date(cleaned);
  if (!isNaN(jsDate.getTime())) {
    return jsDate.toISOString().split('T')[0];
  }

  console.warn(`Could not parse date: ${original}`);
  return null;
}

export function isDate(text: string): boolean {
  if (!text) return false;
  const cleaned = normalizeText(text);
  
  const datePatterns = [
    /\d{4}-\d{2}-\d{2}/,
    /\d{2}\/\d{2}\/\d{4}/,
    /\d{2}-\d{2}-\d{4}/,
    /\d{2}\.\d{2}\.\d{4}/,
    /[A-Za-z]+\s+\d{1,2},?\s+\d{4}/i,
    /[A-Za-z]+\s+\d{1,2}/i,
    /\d{1,2}\s+[A-Za-z]+/i,
    /[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)/i,
    /\d{1,2}(?:st|nd|rd|th)\s+[A-Za-z]+/i,
    /^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/,
  ];
  
  return datePatterns.some(pattern => pattern.test(cleaned));
}

// ============================================================================
// AMOUNT PARSING - Enhanced
// ============================================================================

export function parseAmount(amountStr: string): { amount: number; currency: string } | null {
  if (!amountStr || amountStr === 'nan' || amountStr === 'N/A') return null;

  let cleaned = normalizeText(amountStr);
  let sign = 1;
  let currency: string = 'INR';

  // Check sign
  if (cleaned.startsWith('-') || cleaned.startsWith('−')) {
    sign = -1;
    cleaned = cleaned.substring(1).trim();
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1).trim();
  }

  const lower = cleaned.toLowerCase();

  // Detect currency
  if (lower.includes('usd') || lower.includes('$')) {
    currency = 'USD';
  } else if (lower.includes('usdt') || lower.includes('tether')) {
    currency = 'USDT';
  } else if (lower.includes('eur') || lower.includes('€')) {
    currency = 'EUR';
  } else if (lower.includes('gbp') || lower.includes('£')) {
    currency = 'GBP';
  } else if (lower.includes('jpy') || lower.includes('¥')) {
    currency = 'JPY';
  } else if (lower.includes('inr') || lower.includes('₹') || lower.includes('rs')) {
    currency = 'INR';
  }

  // Remove currency indicators
  cleaned = cleaned.replace(/^(USD|INR|EUR|GBP|JPY|USDT)\s*/i, '');
  cleaned = cleaned.replace(/[₹$€£¥]/g, '');
  cleaned = cleaned.replace(/,/g, '');

  // Handle K (thousands) and M (millions)
  let multiplier = 1;
  const upper = cleaned.toUpperCase();
  if (upper.includes('K')) {
    multiplier = 1000;
    cleaned = upper.replace('K', '');
  } else if (upper.includes('M')) {
    multiplier = 1000000;
    cleaned = upper.replace('M', '');
  }

  // Extract numbers
  const numberMatch = cleaned.match(/[\d.]+/);
  if (!numberMatch) return null;

  let amount = parseFloat(numberMatch[0]) * multiplier;
  if (isNaN(amount)) return null;

  amount = amount * sign;

  return { amount, currency };
}

// ============================================================================
// ACCOUNT DETECTION
// ============================================================================

export function detectAccount(text: string, transactionType?: string, currency?: string): string {
  const lower = normalizeText(text).toLowerCase();

  // Currency-based mapping
  if (currency === 'USD') return 'USD Account';
  if (currency === 'USDT') return 'USDT Account';
  if (currency === 'EUR' || currency === 'GBP' || currency === 'JPY') return 'Forex Account';

  // Check account mappings
  for (const [key, value] of Object.entries(ACCOUNT_MAPPINGS)) {
    if (lower.includes(key)) {
      return value;
    }
  }

  // Check for forex pairs
  const forexPairs = ['eur/usd', 'gbp/usd', 'usd/jpy', 'usd/cad', 'aud/usd', 'usd/chf'];
  if (forexPairs.some(pair => lower.includes(pair))) {
    return 'Forex Account';
  }

  // Check for asset keywords (investment)
  if (ASSET_KEYWORDS.some(keyword => lower.includes(keyword.toLowerCase()))) {
    return 'Investment Account';
  }

  // Payment method patterns (withdrawal)
  const paymentPatterns = [
    /\d{2}\*{3}[a-z0-9]+/,
    /upi/i,
    /imps/i,
    /p2p/i,
    /qr/i,
    /paytm/i,
    /phonepe/i,
    /google pay/i,
    /bank/i,
  ];
  if (paymentPatterns.some(pattern => pattern.test(lower))) {
    return 'Withdrawal Account';
  }

  // Default based on transaction type
  if (transactionType === 'DEPOSIT') return 'Investment Account';
  if (transactionType === 'WITHDRAWAL') return 'Withdrawal Account';
  if (transactionType === 'BONUS') return 'Investment Account';
  if (transactionType === 'INTERNAL_TRANSFER') return 'Investment Account';

  return 'Withdrawal Account';
}

// ============================================================================
// TRANSACTION TYPE DETECTION
// ============================================================================

export function detectTransactionType(text: string): ParsedTransaction['TYPE'] {
  const lower = normalizeText(text).toLowerCase();

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
  if (lower.includes('internal') || lower.includes('transfer')) {
    return 'INTERNAL_TRANSFER';
  }

  return 'UNKNOWN';
}

// ============================================================================
// ASSET DETECTION
// ============================================================================

export function isAssetLine(line: string): boolean {
  return ASSET_KEYWORDS.some(keyword => line.includes(keyword));
}

export function hasCurrency(text: string): boolean {
  return /[$₹€£¥]/.test(text) || /(INR|USD|EUR|GBP|JPY)/i.test(text);
}

// ============================================================================
// SINGLE COLUMN PARSER
// ============================================================================

export function parseSingleColumnFile(rows: any[][]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  let currentDate: string | null = null;
  let i = 0;

  console.log(`📊 Parsing ${rows.length} rows from single-column file`);

  while (i < rows.length) {
    const row = rows[i];
    if (!row || row.length === 0) { i++; continue; }
    
    const cellValue = normalizeText(String(row[0] || ''));
    if (!cellValue) { i++; continue; }

    // Check for date
    if (isDate(cellValue)) {
      const parsedDate = parseDate(cellValue);
      if (parsedDate) {
        currentDate = parsedDate;
        console.log(`📅 Found date: ${currentDate}`);
      }
      i++;
      continue;
    }

    // Check for asset line (trade pattern)
    if (currentDate && isAssetLine(cellValue)) {
      // Check if we have enough lines for a trade entry
      if (i + 4 < rows.length) {
        // Get the next 4 lines (typically: multiplier, duration, amount, PnL)
        const multiplierLine = normalizeText(String(rows[i + 1]?.[0] || ''));
        const durationLine = normalizeText(String(rows[i + 2]?.[0] || ''));
        const amountLine = normalizeText(String(rows[i + 3]?.[0] || ''));
        const pnlLine = normalizeText(String(rows[i + 4]?.[0] || ''));

        // Check if this looks like a trade entry
        const hasMultiplier = !isNaN(parseFloat(multiplierLine));
        const hasDuration = /sec|min/i.test(durationLine);
        const hasAmount = hasCurrency(amountLine);
        const hasPnl = hasCurrency(pnlLine) || pnlLine.startsWith('-') || pnlLine.startsWith('+');

        if (hasMultiplier && hasDuration && (hasAmount || hasPnl)) {
          const amountInfo = parseAmount(amountLine);
          const pnlInfo = parseAmount(pnlLine);

          if (amountInfo && pnlInfo) {
            const transaction: ParsedTransaction = {
              DATE: currentDate,
              ACCOUNT: 'Fixed Time Account',
              TYPE: pnlInfo.amount > 0 ? 'DEPOSIT' : pnlInfo.amount < 0 ? 'WITHDRAWAL' : 'UNKNOWN',
              CURRENCY: amountInfo.currency,
              AMOUNT: Math.abs(amountInfo.amount),
              AMOUNT_INR: pnlInfo.amount,
              ORIGINAL_AMOUNT: Math.abs(amountInfo.amount),
              ORIGINAL_TEXT: `${cellValue} | ${multiplierLine} | ${durationLine} | ${amountLine} | ${pnlLine}`,
              IS_BONUS: false,
              IS_REWARD: false,
              IS_INTERNAL_TRANSFER: false,
              IS_USD_DEPOSIT: amountInfo.currency === 'USD' && pnlInfo.amount > 0,
              IS_USD_WITHDRAWAL: amountInfo.currency === 'USD' && pnlInfo.amount < 0,
              IS_REAL_MONEY: true,
              TRADE_ID: generateTradeId({ DATE: currentDate, ACCOUNT: 'Fixed Time Account', AMOUNT_INR: pnlInfo.amount })
            };
            transactions.push(transaction);
            i += 5;
            continue;
          }
        }
      }
    }
    i++;
  }

  console.log(`✅ Parsed ${transactions.length} transactions from single-column file`);
  return transactions;
}

// ============================================================================
// MULTI-COLUMN PARSER
// ============================================================================

export function parseExcelRows(rows: any[][]): ParsedTransaction[] {
  // Check if it's a single-column format
  const nonEmptyRows = rows.filter(row => row && row.length > 0);
  const isSingleColumn = nonEmptyRows.every(row => row.length <= 1);
  
  if (isSingleColumn && nonEmptyRows.length > 0) {
    console.log('🔍 Detected single-column format');
    return parseSingleColumnFile(rows);
  }

  // Try to detect if it's a trade history format
  const firstRows = rows.slice(0, 20).map(row => normalizeText(String(row[0] || '')));
  const hasTradePattern = firstRows.some(row => isAssetLine(row));
  
  if (hasTradePattern) {
    console.log('🔍 Detected trade history pattern');
    return parseTradeHistory(rows);
  }

  // Try transaction block format
  console.log('🔍 Detected transaction block format');
  return parseTransactionBlocks(rows);
}

// ============================================================================
// TRADE HISTORY PARSER
// ============================================================================

export function parseTradeHistory(rows: any[][]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  let currentDate: string | null = null;
  let i = 0;

  while (i < rows.length) {
    const row = rows[i];
    if (!row || row.length === 0) { i++; continue; }
    
    const cellValue = normalizeText(String(row[0] || ''));
    if (!cellValue) { i++; continue; }

    // Check for date
    if (isDate(cellValue)) {
      const parsedDate = parseDate(cellValue);
      if (parsedDate) {
        currentDate = parsedDate;
        console.log(`📅 Found date: ${currentDate}`);
      }
      i++;
      continue;
    }

    // Check for asset line
    if (currentDate && isAssetLine(cellValue)) {
      if (i + 4 < rows.length) {
        // Skip bullet point
        let j = i + 1;
        while (j < rows.length && ['•', '●', '◦', '*', '-', '–'].includes(normalizeText(String(rows[j]?.[0] || '')))) {
          j++;
        }

        if (j + 3 < rows.length) {
          const multiplierLine = normalizeText(String(rows[j]?.[0] || ''));
          const durationLine = normalizeText(String(rows[j + 1]?.[0] || ''));
          const amountLine = normalizeText(String(rows[j + 2]?.[0] || ''));
          const pnlLine = normalizeText(String(rows[j + 3]?.[0] || ''));

          const amountInfo = parseAmount(amountLine);
          const pnlInfo = parseAmount(pnlLine);

          if (amountInfo && pnlInfo) {
            const transaction: ParsedTransaction = {
              DATE: currentDate,
              ACCOUNT: detectAccount(cellValue),
              TYPE: pnlInfo.amount > 0 ? 'DEPOSIT' : pnlInfo.amount < 0 ? 'WITHDRAWAL' : 'UNKNOWN',
              CURRENCY: amountInfo.currency,
              AMOUNT: Math.abs(amountInfo.amount),
              AMOUNT_INR: pnlInfo.amount,
              ORIGINAL_AMOUNT: Math.abs(amountInfo.amount),
              ORIGINAL_TEXT: `${cellValue} | ${multiplierLine} | ${durationLine} | ${amountLine} | ${pnlLine}`,
              IS_BONUS: false,
              IS_REWARD: false,
              IS_INTERNAL_TRANSFER: false,
              IS_USD_DEPOSIT: amountInfo.currency === 'USD' && pnlInfo.amount > 0,
              IS_USD_WITHDRAWAL: amountInfo.currency === 'USD' && pnlInfo.amount < 0,
              IS_REAL_MONEY: true,
              TRADE_ID: generateTradeId({ DATE: currentDate, ACCOUNT: cellValue, AMOUNT_INR: pnlInfo.amount })
            };
            transactions.push(transaction);
            i = j + 4;
            continue;
          }
        }
      }
    }
    i++;
  }

  return transactions;
}

// ============================================================================
// TRANSACTION BLOCKS PARSER
// ============================================================================

export function parseTransactionBlocks(rows: any[][]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  let currentDate: string | null = null;
  let i = 0;

  while (i < rows.length) {
    const row = rows[i];
    if (!row || row.length === 0) { i++; continue; }

    const cellValue = normalizeText(String(row[0] || ''));
    if (!cellValue) { i++; continue; }

    // Check for date
    if (isDate(cellValue)) {
      const parsedDate = parseDate(cellValue);
      if (parsedDate) {
        currentDate = parsedDate;
        console.log(`📅 Found date: ${currentDate}`);
      }
      i++;
      continue;
    }

    // Process transaction block
    if (currentDate && (i + 2 < rows.length)) {
      const typeText = normalizeText(String(rows[i]?.[0] || ''));
      const amountText = normalizeText(String(rows[i + 1]?.[0] || ''));
      const accountText = normalizeText(String(rows[i + 2]?.[0] || ''));

      if (typeText && amountText) {
        const transactionType = detectTransactionType(typeText);
        const amountInfo = parseAmount(amountText);

        if (amountInfo) {
          const { amount, currency } = amountInfo;
          const account = detectAccount(accountText, transactionType, currency);
          const isPositive = amount > 0;
          const isBonus = transactionType === 'BONUS' || transactionType === 'REWARD';
          const isInternal = transactionType === 'INTERNAL_TRANSFER';
          const exchangeRate = EXCHANGE_RATES[currency] || 1;
          const amountInr = Math.abs(amount) * exchangeRate;

          const transaction: ParsedTransaction = {
            DATE: currentDate,
            ACCOUNT: account,
            TYPE: transactionType,
            CURRENCY: currency,
            AMOUNT: Math.abs(amount),
            AMOUNT_INR: isPositive ? amountInr : -amountInr,
            ORIGINAL_AMOUNT: Math.abs(amount),
            ORIGINAL_TEXT: `${typeText} | ${amountText} | ${accountText}`,
            IS_BONUS: isBonus,
            IS_REWARD: transactionType === 'REWARD',
            IS_INTERNAL_TRANSFER: isInternal,
            IS_USD_DEPOSIT: currency === 'USD' && isPositive && !isBonus && !isInternal,
            IS_USD_WITHDRAWAL: currency === 'USD' && !isPositive && !isBonus && !isInternal,
            IS_REAL_MONEY: !isBonus && !isInternal,
            PAYMENT_METHOD: accountText,
            TRADE_ID: generateTradeId({ DATE: currentDate, ACCOUNT: account, AMOUNT_INR: amountInr })
          };

          transactions.push(transaction);
          i += 3;
          continue;
        }
      }
    }
    i++;
  }

  return transactions;
}

// ============================================================================
// CSV PARSING
// ============================================================================

export function parseCSVContent(csvText: string): ParsedTransaction[] {
  const lines = csvText.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => normalizeText(h).toLowerCase());
  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => normalizeText(v));
    
    const transaction: Partial<ParsedTransaction> = {};
    let amountInfo = null;
    let pnlInfo = null;
    
    for (let j = 0; j < headers.length && j < values.length; j++) {
      const header = headers[j];
      const value = values[j];
      
      if (header.includes('date') || header.includes('time') || header.includes('timestamp')) {
        const parsedDate = parseDate(value);
        if (parsedDate) transaction.DATE = parsedDate;
      } else if (header.includes('amount') || header.includes('investment') || header.includes('stake')) {
        amountInfo = parseAmount(value);
        if (amountInfo) {
          transaction.AMOUNT = Math.abs(amountInfo.amount);
          transaction.CURRENCY = amountInfo.currency;
        }
      } else if (header.includes('pnl') || header.includes('profit') || header.includes('loss') || header.includes('pl')) {
        pnlInfo = parseAmount(value);
        if (pnlInfo) {
          transaction.AMOUNT_INR = pnlInfo.amount;
          if (!transaction.CURRENCY) transaction.CURRENCY = pnlInfo.currency;
        }
      } else if (header.includes('account') || header.includes('type') || header.includes('asset') || header.includes('symbol')) {
        transaction.ACCOUNT = detectAccount(value);
      } else if (header.includes('bonus')) {
        transaction.IS_BONUS = value.toLowerCase().includes('yes') || value.toLowerCase().includes('true');
      } else if (header.includes('result') || header.includes('status')) {
        const result = value.toUpperCase();
        if (result.includes('WON') || result.includes('PROFIT') || result.includes('WIN') || result.includes('SUCCESS')) {
          transaction.TYPE = 'DEPOSIT';
          if (pnlInfo && pnlInfo.amount < 0) pnlInfo.amount = -pnlInfo.amount;
        } else if (result.includes('LOST') || result.includes('LOSS') || result.includes('FAIL')) {
          transaction.TYPE = 'WITHDRAWAL';
          if (pnlInfo && pnlInfo.amount > 0) pnlInfo.amount = -pnlInfo.amount;
        } else if (result.includes('REFUND') || result.includes('BREAKEVEN')) {
          transaction.TYPE = 'UNKNOWN';
          pnlInfo = { amount: 0, currency: transaction.CURRENCY || 'INR' };
        }
      } else if (header.includes('duration') || header.includes('expiry')) {
        // Store for reference
      }
    }
    
    // If we have amount and pnl, calculate properly
    if (transaction.DATE && (amountInfo || pnlInfo)) {
      if (amountInfo && pnlInfo) {
        // Use both
        transaction.AMOUNT = Math.abs(amountInfo.amount);
        transaction.CURRENCY = amountInfo.currency || pnlInfo.currency || 'INR';
        transaction.AMOUNT_INR = pnlInfo.amount;
      } else if (amountInfo && !pnlInfo) {
        // Only amount - determine if it's positive or negative from context
        transaction.AMOUNT = Math.abs(amountInfo.amount);
        transaction.CURRENCY = amountInfo.currency || 'INR';
        transaction.AMOUNT_INR = amountInfo.amount; // Keep sign
      } else if (pnlInfo && !amountInfo) {
        // Only PnL
        transaction.AMOUNT = Math.abs(pnlInfo.amount);
        transaction.CURRENCY = pnlInfo.currency || 'INR';
        transaction.AMOUNT_INR = pnlInfo.amount;
      }
      
      transaction.TYPE = transaction.TYPE || (transaction.AMOUNT_INR && transaction.AMOUNT_INR > 0 ? 'DEPOSIT' : 'WITHDRAWAL');
      transaction.ORIGINAL_TEXT = lines[i];
      transaction.ORIGINAL_AMOUNT = transaction.AMOUNT || 0;
      transaction.IS_REAL_MONEY = !transaction.IS_BONUS;
      transaction.ACCOUNT = transaction.ACCOUNT || 'Forex Account';
      transaction.IS_BONUS = transaction.IS_BONUS || false;
      transaction.IS_REWARD = false;
      transaction.IS_INTERNAL_TRANSFER = false;
      transaction.IS_USD_DEPOSIT = transaction.CURRENCY === 'USD' && (transaction.AMOUNT_INR || 0) > 0;
      transaction.IS_USD_WITHDRAWAL = transaction.CURRENCY === 'USD' && (transaction.AMOUNT_INR || 0) < 0;
      
      // Fix amount_inr if negative
      if (transaction.TYPE === 'WITHDRAWAL' && transaction.AMOUNT_INR && transaction.AMOUNT_INR > 0) {
        transaction.AMOUNT_INR = -transaction.AMOUNT_INR;
      }
      if (transaction.TYPE === 'DEPOSIT' && transaction.AMOUNT_INR && transaction.AMOUNT_INR < 0) {
        transaction.AMOUNT_INR = -transaction.AMOUNT_INR;
      }
      
      transaction.TRADE_ID = generateTradeId(transaction);
      transactions.push(transaction as ParsedTransaction);
    }
  }
  
  return transactions;
}

// ============================================================================
// TEXT BLOCK PARSING
// ============================================================================

export function parseTextBlocks(text: string): ParsedTransaction[] {
  const lines = text.split('\n').map(l => normalizeText(l)).filter(l => l);
  return parseTradeHistory(lines.map(l => [l]));
}

// ============================================================================
// MASTER IMPORT FUNCTION
// ============================================================================

export interface ImportResult {
  transactions: ParsedTransaction[];
  stats: ImportStats;
}

export function importTransactionFile(
  rawRows: any[][],
  jsonData: any[]
): ImportResult {
  let transactions: ParsedTransaction[] = [];

  // Try Excel/CSV parsing
  if (rawRows && rawRows.length > 0) {
    // Try different parsers
    transactions = parseExcelRows(rawRows);
    
    // If no transactions found, try text block parser
    if (transactions.length === 0) {
      const textContent = rawRows.map(row => String(row[0] || '')).join('\n');
      transactions = parseTextBlocks(textContent);
    }
  }

  // If no transactions found and we have JSON data
  if (transactions.length === 0 && jsonData && jsonData.length > 0) {
    transactions = parseJSONData(jsonData);
  }

  // Calculate stats
  const wins = transactions.filter(t => t.AMOUNT_INR > 0).length;
  const losses = transactions.filter(t => t.AMOUNT_INR < 0).length;
  const refunds = transactions.filter(t => t.AMOUNT_INR === 0).length;
  const totalPnl = transactions.reduce((sum, t) => sum + t.AMOUNT_INR, 0);

  const currency = transactions.length > 0 
    ? (transactions[0].CURRENCY === 'USD' ? 'USD' : 'INR')
    : 'USD';

  return {
    transactions,
    stats: {
      total: transactions.length,
      imported: transactions.length,
      duplicates: 0,
      totalPnl: Math.round(totalPnl * 100) / 100,
      wins,
      losses,
      refunds,
      currency
    }
  };
}

// ============================================================================
// JSON DATA PARSING
// ============================================================================

function parseJSONData(data: any[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  for (const item of data) {
    const date = parseDate(item.date || item.DATE || item.timestamp || '');
    if (!date) continue;

    let amount = 0;
    let currency = 'INR';
    
    const amountFields = ['amount', 'AMOUNT', 'trade_amount', 'investment', 'stake', 'Amount', 'Investment'];
    for (const field of amountFields) {
      if (item[field] !== undefined && item[field] !== null) {
        const parsed = parseAmount(String(item[field]));
        if (parsed) {
          amount = Math.abs(parsed.amount);
          currency = parsed.currency;
          break;
        }
      }
    }

    let pnl = 0;
    const pnlFields = ['pnl', 'PNL', 'profit_loss', 'profitLoss', 'trade_pnl', 'P/L', 'PnL'];
    for (const field of pnlFields) {
      if (item[field] !== undefined && item[field] !== null) {
        const parsed = parseAmount(String(item[field]));
        if (parsed) {
          pnl = parsed.amount;
          break;
        }
      }
    }

    if (amount === 0 && pnl === 0) continue;

    const isProfit = pnl > 0 || (item.result === 'WIN' || item.result === 'PROFIT' || item.result === 'WON');
    const finalPnl = pnl !== 0 ? pnl : (isProfit ? amount * 0.8 : -amount);

    const transaction: ParsedTransaction = {
      DATE: date,
      ACCOUNT: detectAccount(String(item.asset || item.symbol || item.Account || '')),
      TYPE: finalPnl > 0 ? 'DEPOSIT' : finalPnl < 0 ? 'WITHDRAWAL' : 'UNKNOWN',
      CURRENCY: currency,
      AMOUNT: amount,
      AMOUNT_INR: finalPnl,
      ORIGINAL_AMOUNT: amount,
      ORIGINAL_TEXT: JSON.stringify(item),
      IS_BONUS: false,
      IS_REWARD: false,
      IS_INTERNAL_TRANSFER: false,
      IS_USD_DEPOSIT: currency === 'USD' && finalPnl > 0,
      IS_USD_WITHDRAWAL: currency === 'USD' && finalPnl < 0,
      IS_REAL_MONEY: true,
      TRADE_ID: generateTradeId({ DATE: date, ACCOUNT: String(item.asset || ''), AMOUNT_INR: finalPnl })
    };

    transactions.push(transaction);
  }

  return transactions;
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export function convertToTrades(transactions: ParsedTransaction[]): any[] {
  return transactions.map(t => ({
    id: generateUUID(),
    date: t.DATE,
    time: '00:00',
    asset: t.ACCOUNT,
    marketType: t.CURRENCY === 'USD' ? 'Forex' : t.CURRENCY === 'INR' ? 'Crypto' : 'Fixed Time',
    direction: t.AMOUNT_INR > 0 ? 'buy' : 'sell',
    entryPrice: 0,
    exitPrice: 0,
    amount: t.AMOUNT,
    profitLoss: t.AMOUNT_INR,
    profitLossPercent: 0,
    strategy: '',
    marketCondition: 'normal',
    emotionBefore: 'Neutral',
    emotionAfter: 'Neutral',
    mistakeCategory: t.TYPE === 'DEPOSIT' ? 'Profit' : t.TYPE === 'WITHDRAWAL' ? 'Loss' : 'Refund',
    notes: t.ORIGINAL_TEXT,
    tags: [t.CURRENCY.toLowerCase()],
    isWin: t.AMOUNT_INR > 0,
    riskRewardRatio: 0,
    createdAt: new Date().toISOString(),
    tradeId: t.TRADE_ID
  }));
}

export function exportToCSV(transactions: ParsedTransaction[]): string {
  if (transactions.length === 0) return '';
  
  const headers = ['DATE', 'ACCOUNT', 'TYPE', 'CURRENCY', 'AMOUNT', 'AMOUNT_INR', 'IS_BONUS', 'IS_REWARD', 'IS_INTERNAL', 'ORIGINAL_TEXT', 'TRADE_ID'];
  const rows = transactions.map(t => [
    t.DATE,
    t.ACCOUNT,
    t.TYPE,
    t.CURRENCY,
    t.AMOUNT.toFixed(2),
    t.AMOUNT_INR.toFixed(2),
    t.IS_BONUS ? 'Yes' : 'No',
    t.IS_REWARD ? 'Yes' : 'No',
    t.IS_INTERNAL_TRANSFER ? 'Yes' : 'No',
    `"${t.ORIGINAL_TEXT.replace(/"/g, '""')}"`,
    t.TRADE_ID || ''
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function getAccountSummary(transactions: ParsedTransaction[]): {
  accountBalances: Record<string, number>;
  totalDeposits: number;
  totalWithdrawals: number;
  netPnl: number;
} {
  const accountBalances: Record<string, number> = {};
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let netPnl = 0;

  for (const txn of transactions) {
    const account = txn.ACCOUNT || 'Unknown';
    const amount = txn.AMOUNT_INR || 0;
    
    if (!accountBalances[account]) accountBalances[account] = 0;
    accountBalances[account] += amount;
    
    if (amount > 0) {
      totalDeposits += amount;
    } else {
      totalWithdrawals += Math.abs(amount);
    }
    netPnl += amount;
  }

  return { accountBalances, totalDeposits, totalWithdrawals, netPnl };
}