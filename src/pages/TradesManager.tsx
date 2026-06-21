// src/pages/TradeEntry.tsx
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { read, utils } from 'xlsx';
import { Trade, AppSettings, RecoveryState, AIWarning, FIXED_TIME_ASSETS } from '../types';
import { addTrade, getTrades, saveTrades, importTradesCSV, exportTradesCSV, deleteTrade, updateTrade, importExcelFile } from '../store';
import { Plus, Upload, Download, Trash2, Edit3, X, Check, AlertTriangle, FileSpreadsheet, CheckCircle2, XCircle, RotateCcw, Loader2 } from 'lucide-react';

const EMOTIONS = ['Calm', 'Confident', 'Focused', 'Disciplined', 'Patient', 'Neutral', 'Anxious', 'Fearful', 'Greedy', 'Frustrated', 'Angry', 'Revenge', 'FOMO', 'Hopeful', 'Bored'];
const STRATEGIES = ['Breakout', 'Trend Following', 'Mean Reversion', 'Scalping', 'Swing', 'Position', 'News Trading', 'Support/Resistance', 'Supply/Demand', 'Price Action', 'ICT', 'SMC', 'Other'];
const MARKETS = ['Fixed Time Trading', 'Forex', 'Crypto', 'Stocks', 'Indices', 'Commodities', 'Options', 'Futures'];
const CONDITIONS = ['Trending', 'Ranging', 'Volatile', 'Calm', 'Choppy', 'Breakout', 'News-Driven'];
const MISTAKES = ['None', 'Overtrading', 'Revenge Trade', 'No Stop Loss', 'Moved Stop Loss', 'Early Exit', 'Late Entry', 'Wrong Direction', 'Too Large Position', 'Emotional Entry', 'Against Trend', 'Ignored Rules', 'FOMO Entry'];
const RESULTS = ['', 'Profit', 'Loss', 'Refund'];
const PAYOUTS = [60, 65, 70, 75, 80, 82, 85, 87, 90, 92, 95];

const EXPIRY_OPTIONS = [
  { value: '5 sec', label: '5s' },
  { value: '10 sec', label: '10s' },
  { value: '15 sec', label: '15s' },
  { value: '30 sec', label: '30s' },
  { value: '1 min', label: '1m' },
  { value: '2 min', label: '2m' },
  { value: '3 min', label: '3m' },
  { value: '5 min', label: '5m' },
  { value: '10 min', label: '10m' },
  { value: 'custom', label: 'Custom' },
];

// Helper function to format currency with negative sign BEFORE the currency symbol
const formatCurrency = (amount: number, currencySymbol: string = '$'): string => {
  if (amount < 0) {
    return `-${currencySymbol}${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currencySymbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface TradeEntryProps {
  trades: Trade[];
  setTrades: (t: Trade[]) => void;
  settings: AppSettings;
  recovery: RecoveryState;
  onWarnings: (w: AIWarning[]) => void;
  getAvailableBalance: () => number;
}

const defaultForm = {
  asset: '',
  marketType: 'Fixed Time Trading',
  direction: 'buy' as 'buy' | 'sell',
  entryPrice: '',
  exitPrice: '',
  stopLoss: '',
  takeProfit: '',
  amount: '',
  riskPercent: '',
  duration: '',
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().slice(0, 5),
  strategy: '',
  marketCondition: 'Trending',
  confidence: 50,
  emotionBefore: 'Neutral',
  emotionAfter: 'Neutral',
  mistakeCategory: 'None',
  notes: '',
  tags: '',
  result: '',
  payoutPercent: '80',
  expiryTime: '15 sec',
  customExpiry: '',
};

// ============================================================================
// GAUGE PROGRESS COMPONENT
// ============================================================================

const GaugeProgress: React.FC<{ 
  progress: number; 
  status: string; 
  phase: 'parsing' | 'importing' | 'complete' | 'error';
  total?: number;
  processed?: number;
}> = ({ progress, status, phase, total = 0, processed = 0 }) => {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  
  const getColor = () => {
    if (phase === 'error') return '#ff3366';
    if (phase === 'complete') return '#00ff88';
    if (progress < 30) return '#ffdd00';
    if (progress < 70) return '#00d4ff';
    return '#00ff88';
  };
  
  const getGlowColor = () => {
    if (phase === 'error') return 'rgba(255,51,102,0.3)';
    if (phase === 'complete') return 'rgba(0,255,136,0.3)';
    return 'rgba(0,212,255,0.3)';
  };
  
  const getStatusText = () => {
    if (phase === 'error') return '❌ Import Failed';
    if (phase === 'complete') return '✅ Import Complete!';
    if (phase === 'parsing') return '📊 Parsing file...';
    return '📥 Importing trades...';
  };
  
  return (
    <div className="flex flex-col items-center justify-center p-6">
      <div className="relative">
        {/* Background ring */}
        <svg width="160" height="160" className="transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="rgba(30,42,58,0.5)"
            strokeWidth="12"
            fill="none"
          />
          {/* Progress ring */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke={getColor()}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-300 ease-out"
            style={{
              filter: `drop-shadow(0 0 20px ${getGlowColor()})`,
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold" style={{ color: getColor() }}>
            {phase === 'error' ? '!' : `${Math.round(progress)}%`}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            {phase === 'parsing' && 'Parsing'}
            {phase === 'importing' && 'Importing'}
            {phase === 'complete' && 'Complete'}
            {phase === 'error' && 'Error'}
          </div>
        </div>
        
        {/* Spinner animation for active states */}
        {(phase === 'parsing' || phase === 'importing') && (
          <div className="absolute -inset-1">
            <div className="w-full h-full animate-spin-slow">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#00d4ff] shadow-lg shadow-[#00d4ff]/50" />
            </div>
          </div>
        )}
      </div>
      
      {/* Status text */}
      <div className="mt-4 text-center">
        <div className="text-sm font-medium text-gray-300">{getStatusText()}</div>
        <div className="text-xs text-gray-500 mt-1">{status}</div>
        {total > 0 && (
          <div className="text-xs text-gray-600 mt-1">
            {processed} / {total} trades processed
          </div>
        )}
      </div>
      
      {/* Progress bar dots */}
      <div className="flex gap-1 mt-3">
        {[0, 1, 2, 3, 4].map(i => {
          const active = progress >= (i + 1) * 20;
          return (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                active ? 'bg-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.5)]' : 'bg-[rgba(30,42,58,0.5)]'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// IMPORT PROGRESS OVERLAY
// ============================================================================

const ImportProgressOverlay: React.FC<{
  isOpen: boolean;
  progress: number;
  status: string;
  phase: 'parsing' | 'importing' | 'complete' | 'error';
  total: number;
  processed: number;
  onClose?: () => void;
}> = ({ isOpen, progress, status, phase, total, processed, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={phase === 'complete' || phase === 'error' ? onClose : undefined}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="glass-card p-8 w-[400px] neon-glow"
        onClick={e => e.stopPropagation()}
      >
        <GaugeProgress
          progress={progress}
          status={status}
          phase={phase}
          total={total}
          processed={processed}
        />
        
        {(phase === 'complete' || phase === 'error') && (
          <button
            onClick={onClose}
            className="w-full mt-4 py-2 rounded-lg bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold hover:opacity-90 transition-opacity"
          >
            {phase === 'complete' ? '✅ Done' : 'Close'}
          </button>
        )}
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TradeEntry({ trades, setTrades, settings, recovery, onWarnings, getAvailableBalance }: TradeEntryProps) {
  const [form, setForm] = useState(defaultForm);
  const [showForm, setShowForm] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDir, setFilterDir] = useState<string>('all');
  const [filterMarket, setFilterMarket] = useState<string>('all');
  const [importSummary, setImportSummary] = useState<{ show: boolean; total: number; imported: number; duplicates: number; totalPnl: number; wins: number; losses: number; refunds: number; currency: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  
  // Import progress state
  const [importProgress, setImportProgress] = useState<{
    show: boolean;
    progress: number;
    status: string;
    phase: 'parsing' | 'importing' | 'complete' | 'error';
    total: number;
    processed: number;
  }>({
    show: false,
    progress: 0,
    status: 'Starting import...',
    phase: 'parsing',
    total: 0,
    processed: 0
  });

  const today = new Date().toISOString().split('T')[0];
  const todayTrades = trades.filter(t => t.date === today);
  const isLimitReached = todayTrades.length >= (recovery.active ? recovery.dailyTradeLimit : settings.dailyTradeLimit);

  const isFT = form.marketType === 'Fixed Time Trading';

  // Resolve actual duration string from expiry selection
  const getResolvedDuration = (): string => {
    if (!isFT) return form.duration;
    if (form.expiryTime === 'custom') return form.customExpiry || '';
    return form.expiryTime;
  };

  // ── PnL Calculation ──
  const calcPnL = () => {
    if (isFT) {
      const amt = parseFloat(form.amount) || 0;
      const payout = parseFloat(form.payoutPercent) || 80;
      if (form.result === 'Profit') return (amt * payout / 100).toFixed(2);
      if (form.result === 'Loss') return (-amt).toFixed(2);
      if (form.result === 'Refund') return '0.00';
      return '—';
    }
    const entry = parseFloat(form.entryPrice) || 0;
    const exit = parseFloat(form.exitPrice) || 0;
    const amt = parseFloat(form.amount) || 1;
    const dir = form.direction === 'buy' ? 1 : -1;
    return ((exit - entry) * amt * dir).toFixed(2);
  };

  const calcRR = () => {
    if (isFT) return '—';
    const entry = parseFloat(form.entryPrice) || 0;
    const sl = parseFloat(form.stopLoss) || 0;
    const tp = parseFloat(form.takeProfit) || 0;
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    return risk > 0 ? (reward / risk).toFixed(2) : '—';
  };

  // ── Submit ──
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.asset) return;
    if (!isFT && (!form.entryPrice || !form.exitPrice)) return;
    if (isFT && !form.amount) return;

    let pnlValue = 0;
    if (isFT) {
      const amt = parseFloat(form.amount) || 0;
      const payout = parseFloat(form.payoutPercent) || 80;
      if (form.result === 'Profit') pnlValue = amt * payout / 100;
      else if (form.result === 'Loss') pnlValue = -amt;
      else pnlValue = 0;
    }

    const resolvedDuration = getResolvedDuration();

    const tradeData = {
      asset: form.asset,
      marketType: form.marketType,
      direction: form.direction,
      entryPrice: isFT ? 0 : parseFloat(form.entryPrice),
      exitPrice: isFT ? 0 : parseFloat(form.exitPrice),
      stopLoss: isFT ? 0 : (parseFloat(form.stopLoss) || 0),
      takeProfit: isFT ? 0 : (parseFloat(form.takeProfit) || 0),
      amount: parseFloat(form.amount) || 1,
      riskPercent: isFT ? (parseFloat(form.payoutPercent) || 80) : (parseFloat(form.riskPercent) || 1),
      duration: resolvedDuration,
      date: form.date,
      time: form.time,
      strategy: form.strategy,
      marketCondition: form.marketCondition,
      confidence: form.confidence,
      emotionBefore: form.emotionBefore,
      emotionAfter: form.emotionAfter,
      mistakeCategory: isFT ? (form.result || 'None') : form.mistakeCategory,
      notes: form.notes,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    };

    if (editingId) {
      const updates: Partial<Trade> = { ...tradeData };
      if (isFT) {
        updates.profitLoss = Math.round(pnlValue * 100) / 100;
        updates.isWin = pnlValue > 0;
      }
      updateTrade(editingId, updates);
      setTrades(getTrades());
      setEditingId(null);
    } else {
      if (isFT) {
        const fakeEntry = 100;
        const fakeExit = pnlValue >= 0 ? 100 + Math.abs(pnlValue) : 100 - Math.abs(pnlValue);
        const { warnings } = addTrade({ ...tradeData, entryPrice: fakeEntry, exitPrice: fakeExit, amount: 1 });
        const allTrades = getTrades();
        if (allTrades.length > 0) {
          allTrades[0].profitLoss = Math.round(pnlValue * 100) / 100;
          allTrades[0].isWin = pnlValue > 0;
          allTrades[0].entryPrice = 0;
          allTrades[0].exitPrice = 0;
          allTrades[0].amount = parseFloat(form.amount) || 0;
          allTrades[0].riskPercent = parseFloat(form.payoutPercent) || 80;
          allTrades[0].duration = resolvedDuration;
          saveTrades(allTrades);
        }
        setTrades(getTrades());
        if (warnings.length > 0) onWarnings(warnings);
      } else {
        const { warnings } = addTrade(tradeData);
        setTrades(getTrades());
        if (warnings.length > 0) onWarnings(warnings);
      }
    }
    setForm(defaultForm);
  };

  // ── Edit ──
  const handleEdit = (trade: Trade) => {
    setEditingId(trade.id);
    const isFTTrade = trade.marketType === 'Fixed Time Trading';
    let result = '';
    if (isFTTrade) {
      if (trade.profitLoss > 0) result = 'Profit';
      else if (trade.profitLoss < 0) result = 'Loss';
      else result = 'Refund';
    }
    let expiryTime = '30 sec';
    let customExpiry = '';
    if (isFTTrade && trade.duration) {
      const match = EXPIRY_OPTIONS.find(e => e.value === trade.duration);
      if (match) { expiryTime = match.value; }
      else { expiryTime = 'custom'; customExpiry = trade.duration; }
    }
    setForm({
      asset: trade.asset,
      marketType: trade.marketType,
      direction: trade.direction,
      entryPrice: isFTTrade ? '' : String(trade.entryPrice),
      exitPrice: isFTTrade ? '' : String(trade.exitPrice),
      stopLoss: isFTTrade ? '' : String(trade.stopLoss),
      takeProfit: isFTTrade ? '' : String(trade.takeProfit),
      amount: String(trade.amount),
      riskPercent: isFTTrade ? '' : String(trade.riskPercent),
      duration: trade.duration,
      date: trade.date,
      time: trade.time,
      strategy: trade.strategy,
      marketCondition: trade.marketCondition,
      confidence: trade.confidence,
      emotionBefore: trade.emotionBefore,
      emotionAfter: trade.emotionAfter,
      mistakeCategory: isFTTrade ? 'None' : trade.mistakeCategory,
      notes: trade.notes,
      tags: trade.tags.join(', '),
      result,
      payoutPercent: isFTTrade ? String(trade.riskPercent) : '80',
      expiryTime,
      customExpiry,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => { deleteTrade(id); setTrades(getTrades()); };

  // ── Import with Progress ──
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Show progress overlay
    setImportProgress({
      show: true,
      progress: 0,
      status: 'Reading file...',
      phase: 'parsing',
      total: 0,
      processed: 0
    });
    
    const reader = new FileReader();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        setImportProgress(prev => ({
          ...prev,
          progress: Math.min(progress, 95),
          status: `Reading file... ${Math.round(progress)}%`
        }));
      }
    };
    
    reader.onload = (ev) => {
      try {
        setImportProgress(prev => ({
          ...prev,
          progress: 10,
          status: 'Parsing data...',
          phase: 'parsing'
        }));
        
        if (isExcel) {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const workbook = read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawRows = utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          const jsonData = utils.sheet_to_json(worksheet) as any[];
          
          setImportProgress(prev => ({
            ...prev,
            progress: 30,
            status: `Found ${rawRows.length} rows, processing...`,
            total: rawRows.length
          }));
          
          const result = importExcelFile(rawRows, jsonData);
          const tradesToImport = result.trades;
          
          // Simulate progressive import with animation
          const totalTrades = tradesToImport.length;
          let processedCount = 0;
          
          if (totalTrades > 0) {
            setImportProgress(prev => ({
              ...prev,
              progress: 40,
              status: `Importing ${totalTrades} trades...`,
              phase: 'importing',
              total: totalTrades
            }));
            
            // Process in chunks with animation
            const chunkSize = Math.max(1, Math.floor(totalTrades / 20));
            const importChunk = (start: number) => {
              const end = Math.min(start + chunkSize, totalTrades);
              const chunk = tradesToImport.slice(start, end);
              
              // Add chunk to existing trades
              const all = [...chunk, ...trades];
              saveTrades(all);
              setTrades(all);
              
              processedCount += chunk.length;
              const progress = 40 + (processedCount / totalTrades) * 50;
              
              setImportProgress(prev => ({
                ...prev,
                progress: Math.min(progress, 95),
                processed: processedCount,
                status: `Importing ${processedCount}/${totalTrades} trades...`
              }));
              
              if (end < totalTrades) {
                // Continue with next chunk
                setTimeout(() => importChunk(end), 50);
              } else {
                // Import complete
                setImportProgress(prev => ({
                  ...prev,
                  progress: 100,
                  status: `Successfully imported ${totalTrades} trades!`,
                  phase: 'complete'
                }));
                
                setImportSummary({ show: true, ...result.stats });
              }
            };
            
            // Start importing
            importChunk(0);
            
          } else {
            setImportProgress(prev => ({
              ...prev,
              progress: 100,
              status: 'No new trades to import',
              phase: 'complete'
            }));
          }
        } else {
          const csv = ev.target?.result as string;
          const imported = importTradesCSV(csv);
          
          setImportProgress(prev => ({
            ...prev,
            progress: 40,
            status: `Found ${imported.length} trades, importing...`,
            total: imported.length,
            phase: 'importing'
          }));
          
          if (imported.length > 0) {
            const all = [...imported, ...trades];
            saveTrades(all);
            setTrades(all);
            
            setImportProgress(prev => ({
              ...prev,
              progress: 100,
              status: `Successfully imported ${imported.length} trades!`,
              phase: 'complete'
            }));
            
            setImportSummary({
              show: true,
              total: imported.length,
              imported: imported.length,
              duplicates: 0,
              totalPnl: Math.round(imported.reduce((s, t) => s + t.profitLoss, 0) * 100) / 100,
              wins: imported.filter(t => t.isWin).length,
              losses: imported.filter(t => !t.isWin).length,
              refunds: 0,
              currency: 'UNKNOWN'
            });
          } else {
            setImportProgress(prev => ({
              ...prev,
              progress: 100,
              status: 'No new trades to import',
              phase: 'complete'
            }));
          }
        }
      } catch (error) {
        console.error('Import error:', error);
        setImportProgress(prev => ({
          ...prev,
          progress: 100,
          status: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          phase: 'error'
        }));
      }
    };
    
    reader.onerror = () => {
      setImportProgress(prev => ({
        ...prev,
        progress: 100,
        status: 'Error reading file',
        phase: 'error'
      }));
    };
    
    isExcel ? reader.readAsArrayBuffer(file) : reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportClose = () => {
    setImportProgress(prev => ({
      ...prev,
      show: false
    }));
  };

  const handleExport = () => {
    const csv = exportTradesCSV(trades);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `nexus_trades_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  // ── Filters ──
  const filteredTrades = trades
    .filter(t => filterDir === 'all' || t.direction === filterDir)
    .filter(t => filterMarket === 'all' || t.marketType === filterMarket)
    .filter(t => t.asset.toLowerCase().includes(searchTerm.toLowerCase()) || t.strategy.toLowerCase().includes(searchTerm.toLowerCase()) || t.notes.toLowerCase().includes(searchTerm.toLowerCase()));

  // ── Helpers ──
  const getResultBadge = (trade: Trade) => {
    if (trade.marketType !== 'Fixed Time Trading') return null;
    if (trade.profitLoss > 0) return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[rgba(0,255,136,0.15)] text-[#00ff88]">PROFIT</span>;
    if (trade.profitLoss < 0) return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[rgba(255,51,102,0.15)] text-[#ff3366]">LOSS</span>;
    return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[rgba(255,221,0,0.15)] text-[#ffdd00]">REFUND</span>;
  };

  const getDirLabel = (trade: Trade) => {
    if (trade.marketType === 'Fixed Time Trading') return trade.direction === 'buy' ? '▲ UP' : '▼ DOWN';
    return trade.direction.toUpperCase();
  };

  // Hide price columns when the active form market or history filter is Fixed Time Trading.
  const showPriceCols = form.marketType !== 'Fixed Time Trading' && filterMarket !== 'Fixed Time Trading';

  // Get formatted balance
  const CS = settings.currencySymbol || '$';
  const formattedBalance = formatCurrency(getAvailableBalance(), CS);

  // ════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">

      {/* Import Progress Overlay */}
      <ImportProgressOverlay
        isOpen={importProgress.show}
        progress={importProgress.progress}
        status={importProgress.status}
        phase={importProgress.phase}
        total={importProgress.total}
        processed={importProgress.processed}
        onClose={handleImportClose}
      />

      {/* ══════ Import Summary Modal ══════ */}
      <AnimatePresence>
        {importSummary?.show && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setImportSummary(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()} className="glass-card p-6 w-[440px] neon-glow space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00ff88] to-[#00d4ff] flex items-center justify-center"><FileSpreadsheet size={20} className="text-black" /></div>
                <div><h3 className="text-lg font-bold text-[#00ff88]">Import Complete</h3><p className="text-[10px] text-gray-500">Trade history parsed and imported</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[rgba(0,255,136,0.08)] text-center"><div className="text-xl font-bold text-[#00ff88]">{importSummary.imported}</div><div className="text-[9px] text-gray-500">IMPORTED</div></div>
                <div className="p-3 rounded-lg bg-[rgba(255,221,0,0.08)] text-center"><div className="text-xl font-bold text-[#ffdd00]">{importSummary.duplicates}</div><div className="text-[9px] text-gray-500">DUPLICATES SKIPPED</div></div>
                <div className="p-3 rounded-lg bg-[rgba(0,212,255,0.08)] text-center"><CheckCircle2 size={14} className="text-[#00ff88] mx-auto mb-1" /><div className="text-sm font-bold text-[#00ff88]">{importSummary.wins}</div><div className="text-[9px] text-gray-500">WINS</div></div>
                <div className="p-3 rounded-lg bg-[rgba(255,51,102,0.08)] text-center"><XCircle size={14} className="text-[#ff3366] mx-auto mb-1" /><div className="text-sm font-bold text-[#ff3366]">{importSummary.losses}</div><div className="text-[9px] text-gray-500">LOSSES</div></div>
              </div>
              {importSummary.refunds > 0 && (<div className="flex items-center gap-2 p-2 rounded bg-[rgba(255,221,0,0.08)]"><RotateCcw size={12} className="text-[#ffdd00]" /><span className="text-xs text-[#ffdd00]">{importSummary.refunds} refunds</span></div>)}
              <div className="p-3 rounded-lg bg-[rgba(30,42,58,0.5)] flex items-center justify-between">
                <span className="text-xs text-gray-400">Total P&L</span>
                <span className={`text-lg font-bold ${importSummary.totalPnl >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                  {importSummary.totalPnl >= 0 ? '+' : '-'}{importSummary.currency === 'INR' ? '₹' : '$'}{Math.abs(importSummary.totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-500"><span>Total in file: {importSummary.total}</span><span>•</span><span>Currency: {importSummary.currency}</span></div>
              <button onClick={() => setImportSummary(null)} className="cyber-button w-full flex items-center justify-center gap-2"><Check size={14} /> Done</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warning Banner */}
      {isLimitReached && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="warning-banner flex items-center gap-3">
          <AlertTriangle className="text-[#ff3366]" size={20} />
          <div><div className="text-sm font-bold text-[#ff3366]">Daily Trade Limit Reached</div><div className="text-xs text-gray-400">You've reached your limit of {recovery.active ? recovery.dailyTradeLimit : settings.dailyTradeLimit} trades today.</div></div>
        </motion.div>
      )}

      {/* Action Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(defaultForm); }} className="cyber-button flex items-center gap-2">
          {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? 'Close Form' : 'New Trade'}
        </button>
        <button onClick={() => fileRef.current?.click()} className="cyber-button flex items-center gap-2">
          <Upload size={14} /> Import (CSV/Excel)
        </button>
        <button onClick={handleExport} className="cyber-button flex items-center gap-2" disabled={trades.length === 0}>
          <Download size={14} /> Export CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
        <div className="flex-1" />
        <span className="text-xs text-gray-500">{trades.length} total trades</span>
      </div>

      {/* ════════════════════════ TRADE FORM ════════════════════════ */}
      {showForm && (
        <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} onSubmit={handleSubmit} className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-bold text-[#00ff88] flex items-center gap-2">
            {editingId ? <Edit3 size={14} /> : <Plus size={14} />}
            {editingId ? 'Edit Trade' : 'New Trade Entry'}
            {isFT && <span className="text-[10px] ml-2 px-2 py-0.5 rounded bg-[rgba(0,212,255,0.15)] text-[#00d4ff] font-bold">FIXED TIME MODE</span>}
          </h3>

          {/* Row 1: Asset, Market, Direction, Strategy */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Asset *</label>
              <select className="cyber-select" value={form.asset} onChange={e => setForm({ ...form, asset: e.target.value })} required>
                <option value="">Select Asset...</option>
                {FIXED_TIME_ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Market</label>
              <select className="cyber-select" value={form.marketType} onChange={e => setForm({ ...form, marketType: e.target.value, direction: 'buy', entryPrice: '', exitPrice: '', stopLoss: '', takeProfit: '', riskPercent: '', result: '' })}>
                {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Direction</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm({ ...form, direction: 'buy' })} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${form.direction === 'buy' ? 'bg-[rgba(0,255,136,0.2)] text-[#00ff88] border border-[#00ff88]' : 'bg-[rgba(30,42,58,0.3)] text-gray-500 border border-transparent'}`}>
                  {isFT ? '▲ UP' : 'BUY'}
                </button>
                <button type="button" onClick={() => setForm({ ...form, direction: 'sell' })} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${form.direction === 'sell' ? 'bg-[rgba(255,51,102,0.2)] text-[#ff3366] border border-[#ff3366]' : 'bg-[rgba(30,42,58,0.3)] text-gray-500 border border-transparent'}`}>
                  {isFT ? '▼ DOWN' : 'SELL'}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Strategy</label>
              <select className="cyber-select" value={form.strategy} onChange={e => setForm({ ...form, strategy: e.target.value })}>
                <option value="">Select...</option>
                {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Expiry Time — only for Fixed Time Trading */}
          {isFT && (
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 block">Expiry Time</label>
              <div className="flex gap-1.5 flex-wrap">
                {EXPIRY_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setForm({ ...form, expiryTime: opt.value })}
                    className={`px-3 py-2 rounded-lg text-[11px] font-bold transition-all ${form.expiryTime === opt.value
                      ? 'bg-[rgba(0,212,255,0.2)] text-[#00d4ff] border border-[#00d4ff] shadow-[0_0_8px_rgba(0,212,255,0.3)]'
                      : 'bg-[rgba(30,42,58,0.5)] text-gray-500 border border-transparent hover:border-[rgba(0,212,255,0.3)]'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {form.expiryTime === 'custom' && (
                <input className="cyber-input mt-2" placeholder="e.g. 45 sec, 7 min, 1 hour" value={form.customExpiry} onChange={e => setForm({ ...form, customExpiry: e.target.value })} />
              )}
            </div>
          )}

          {/* Row 2: Prices — disabled for FT */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Entry Price {isFT ? '' : '*'}</label>
              <input className="cyber-input" type="number" step="any" placeholder={isFT ? 'N/A' : '0.00'} value={form.entryPrice} onChange={e => setForm({ ...form, entryPrice: e.target.value })} disabled={isFT} required={!isFT} style={isFT ? { opacity: 0.35 } : {}} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Exit Price {isFT ? '' : '*'}</label>
              <input className="cyber-input" type="number" step="any" placeholder={isFT ? 'N/A' : '0.00'} value={form.exitPrice} onChange={e => setForm({ ...form, exitPrice: e.target.value })} disabled={isFT} required={!isFT} style={isFT ? { opacity: 0.35 } : {}} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Stop Loss</label>
              <input className="cyber-input" type="number" step="any" placeholder={isFT ? 'N/A' : '0.00'} value={form.stopLoss} onChange={e => setForm({ ...form, stopLoss: e.target.value })} disabled={isFT} style={isFT ? { opacity: 0.35 } : {}} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Take Profit</label>
              <input className="cyber-input" type="number" step="any" placeholder={isFT ? 'N/A' : '0.00'} value={form.takeProfit} onChange={e => setForm({ ...form, takeProfit: e.target.value })} disabled={isFT} style={isFT ? { opacity: 0.35 } : {}} />
            </div>
          </div>

          {/* Row 3: Amount / Payout / Result / P&L / Date / Time */}
          <div className={`grid gap-3 ${isFT ? 'grid-cols-2 md:grid-cols-6' : 'grid-cols-2 md:grid-cols-5'}`}>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">{isFT ? 'Trade Amount *' : 'Amount/Lots'}</label>
              <input className="cyber-input" type="number" step="any" placeholder={isFT ? '$ Amount' : 'Lots'} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required={isFT} />
            </div>
            {isFT ? (
              <>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Payout %</label>
                  <select className="cyber-select" value={form.payoutPercent} onChange={e => setForm({ ...form, payoutPercent: e.target.value })}>
                    {PAYOUTS.map(p => <option key={p} value={String(p)}>{p}%</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Result *</label>
                  <select className="cyber-select" value={form.result} onChange={e => setForm({ ...form, result: e.target.value })} required>
                    {RESULTS.map(r => <option key={r} value={r}>{r || 'Select...'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Trade P&L</label>
                  <div className={`cyber-input flex items-center font-bold ${form.result === 'Profit' ? 'text-[#00ff88]' : form.result === 'Loss' ? 'text-[#ff3366]' : 'text-[#ffdd00]'}`} style={{ background: 'rgba(30,42,58,0.5)' }}>
                    {form.result ? formatCurrency(parseFloat(calcPnL()) || 0, CS) : '—'}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Risk %</label>
                <input className="cyber-input" type="number" step="0.1" placeholder="1" value={form.riskPercent} onChange={e => setForm({ ...form, riskPercent: e.target.value })} />
              </div>
            )}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Date</label>
              <input className="cyber-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Time</label>
              <input className="cyber-input" type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
            </div>
            {!isFT && (
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Duration</label>
                <input className="cyber-input" placeholder="e.g. 2h 30m" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} />
              </div>
            )}
          </div>

          {/* Row 4: Psychology */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Emotion Before</label><select className="cyber-select" value={form.emotionBefore} onChange={e => setForm({ ...form, emotionBefore: e.target.value })}>{EMOTIONS.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
            <div><label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Emotion After</label><select className="cyber-select" value={form.emotionAfter} onChange={e => setForm({ ...form, emotionAfter: e.target.value })}>{EMOTIONS.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
            <div><label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Market Condition</label><select className="cyber-select" value={form.marketCondition} onChange={e => setForm({ ...form, marketCondition: e.target.value })}>{CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Mistake</label><select className="cyber-select" value={form.mistakeCategory} onChange={e => setForm({ ...form, mistakeCategory: e.target.value })}>{MISTAKES.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
          </div>

          {/* Confidence */}
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Confidence Level</span><span className="text-[#00d4ff]">{form.confidence}%</span>
            </label>
            <input type="range" min="0" max="100" value={form.confidence} onChange={e => setForm({ ...form, confidence: parseInt(e.target.value) })} className="w-full" />
          </div>

          {/* Notes & Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Notes</label><textarea className="cyber-input" placeholder="Trade notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <div><label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Tags (comma-separated)</label><input className="cyber-input" placeholder="e.g. london-session, setup-a" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></div>
          </div>

          {/* Calculated values */}
          <div className="flex items-center gap-6 p-3 rounded-lg bg-[rgba(30,42,58,0.3)]">
            <div>
              <span className="text-[10px] text-gray-500">{isFT ? 'Trade P&L: ' : 'Est. P/L: '}</span>
              <span className={`text-sm font-bold ${(parseFloat(calcPnL()) || 0) >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                {calcPnL() === '—' ? '—' : formatCurrency(parseFloat(calcPnL()) || 0, CS)}
              </span>
            </div>
            {!isFT && <div><span className="text-[10px] text-gray-500">R:R Ratio: </span><span className="text-sm font-bold text-[#00d4ff]">{calcRR()}</span></div>}
            {isFT && <div><span className="text-[10px] text-gray-500">Payout: </span><span className="text-sm font-bold text-[#00d4ff]">{form.payoutPercent}%</span></div>}
            {isFT && <div><span className="text-[10px] text-gray-500">Expiry: </span><span className="text-sm font-bold text-[#a855f7]">{getResolvedDuration() || '—'}</span></div>}
            <div><span className="text-[10px] text-gray-500">Balance: </span><span className="text-sm font-bold text-[#a855f7]">{formattedBalance}</span></div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 justify-end">
            {editingId && (<button type="button" className="cyber-button cyber-button-danger" onClick={() => { setEditingId(null); setForm(defaultForm); }}>Cancel</button>)}
            <button type="submit" className="cyber-button flex items-center gap-2 px-8" disabled={isLimitReached && !editingId}>
              {editingId ? <Check size={14} /> : <Plus size={14} />}
              {editingId ? 'Update Trade' : 'Save Trade'}
            </button>
          </div>
        </motion.form>
      )}

      {/* ════════════════════════ TRADE HISTORY TABLE ════════════════════════ */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Trade History</h3>
          <div className="flex-1" />
          <input className="cyber-input max-w-[180px]" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <select className="cyber-select max-w-[100px]" value={filterDir} onChange={e => setFilterDir(e.target.value)}>
            <option value="all">All Dir</option><option value="buy">Buy/UP</option><option value="sell">Sell/DOWN</option>
          </select>
          <select className="cyber-select max-w-[120px]" value={filterMarket} onChange={e => setFilterMarket(e.target.value)}>
            <option value="all">All Markets</option>{MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {filteredTrades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-[rgba(30,42,58,0.5)]">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Asset</th>
                  <th className="text-left p-2">Market</th>
                  <th className="text-left p-2">Dir</th>
                  {showPriceCols && <th className="text-right p-2">Entry</th>}
                  {showPriceCols && <th className="text-right p-2">Exit</th>}
                  {showPriceCols && <th className="text-right p-2">SL</th>}
                  {showPriceCols && <th className="text-right p-2">TP</th>}
                  <th className="text-right p-2">Amt</th>
                  <th className="text-right p-2">Payout/Risk</th>
                  <th className="text-center p-2">Expiry</th>
                  <th className="text-center p-2">Result</th>
                  <th className="text-right p-2">P/L</th>
                  <th className="text-left p-2">Strategy</th>
                  <th className="text-left p-2">Emotion</th>
                  <th className="text-center p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map(t => {
                  const isFTRow = t.marketType === 'Fixed Time Trading';
                  const formattedPnl = formatCurrency(t.profitLoss, CS);
                  return (
                    <tr key={t.id} className="border-b border-[rgba(30,42,58,0.3)] hover:bg-[rgba(0,255,136,0.02)]">
                      <td className="p-2 text-gray-400 whitespace-nowrap">{t.date}</td>
                      <td className="p-2 font-medium text-gray-300">{t.asset}</td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isFTRow ? 'bg-[rgba(0,212,255,0.15)] text-[#00d4ff]' : 'bg-[rgba(30,42,58,0.5)] text-gray-400'}`}>
                          {isFTRow ? 'FT' : t.marketType.slice(0, 5)}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.direction === 'buy' ? 'bg-[rgba(0,255,136,0.1)] text-[#00ff88]' : 'bg-[rgba(255,51,102,0.1)] text-[#ff3366]'}`}>
                          {getDirLabel(t)}
                        </span>
                      </td>
                      {showPriceCols && <td className="p-2 text-right text-gray-400">{isFTRow ? '—' : t.entryPrice}</td>}
                      {showPriceCols && <td className="p-2 text-right text-gray-400">{isFTRow ? '—' : t.exitPrice}</td>}
                      {showPriceCols && <td className="p-2 text-right text-gray-500">{isFTRow ? '—' : (t.stopLoss || '—')}</td>}
                      {showPriceCols && <td className="p-2 text-right text-gray-500">{isFTRow ? '—' : (t.takeProfit || '—')}</td>}
                      <td className="p-2 text-right text-gray-300">{isFTRow ? formatCurrency(t.amount, CS) : t.amount}</td>
                      <td className="p-2 text-right text-[#00d4ff]">{`${t.riskPercent}%`}</td>
                      <td className="p-2 text-center">
                        {t.duration ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[rgba(168,85,247,0.12)] text-[#a855f7]">{t.duration}</span> : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="p-2 text-center">{getResultBadge(t) || <span className="text-gray-600">—</span>}</td>
                      <td className="p-2 text-right font-bold" style={{ color: t.profitLoss >= 0 ? '#00ff88' : '#ff3366' }}>
                        {formattedPnl}
                      </td>
                      <td className="p-2 text-gray-400">{t.strategy || '—'}</td>
                      <td className="p-2 text-gray-400 capitalize">{t.emotionBefore}</td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleEdit(t)} className="p-1 hover:text-[#00d4ff] text-gray-500 transition-colors"><Edit3 size={12} /></button>
                          <button onClick={() => handleDelete(t.id)} className="p-1 hover:text-[#ff3366] text-gray-500 transition-colors"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-600 py-8 text-sm">
            {trades.length === 0 ? 'No trades yet. Add your first trade above.' : 'No trades match your filters.'}
          </div>
        )}
      </div>

    </div>
  );
}