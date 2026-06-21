import { motion, AnimatePresence } from 'framer-motion';
import { AIWarning } from '../types';
import { AlertTriangle, X, ShieldAlert, Brain, TrendingDown, Flame, Clock } from 'lucide-react';

interface WarningModalProps {
  warnings: AIWarning[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const getIcon = (type: AIWarning['type']) => {
  switch (type) {
    case 'overtrading': return <Flame size={16} className="text-[#ff8800]" />;
    case 'emotional': return <Brain size={16} className="text-[#a855f7]" />;
    case 'risk': return <ShieldAlert size={16} className="text-[#ff3366]" />;
    case 'revenge': return <AlertTriangle size={16} className="text-[#ff3366]" />;
    case 'loss_streak': return <TrendingDown size={16} className="text-[#ff3366]" />;
    case 'recovery': return <Clock size={16} className="text-[#ffdd00]" />;
    default: return <AlertTriangle size={16} className="text-[#ffdd00]" />;
  }
};

const getSeverityColor = (severity: AIWarning['severity']) => {
  switch (severity) {
    case 'critical': return '#ff3366';
    case 'high': return '#ff8800';
    case 'medium': return '#ffdd00';
    case 'low': return '#00d4ff';
  }
};

export default function WarningModal({ warnings, onDismiss, onDismissAll, isOpen, onClose }: WarningModalProps) {
  const activeWarnings = warnings.filter(w => !w.dismissed);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-end p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="glass-card p-4 w-96 max-h-[80vh] overflow-y-auto mt-12 neon-glow"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#ff3366] flex items-center gap-2">
                <AlertTriangle size={16} /> AI Warnings ({activeWarnings.length})
              </h3>
              <div className="flex items-center gap-2">
                {activeWarnings.length > 0 && (
                  <button onClick={onDismissAll} className="text-[10px] text-gray-500 hover:text-gray-300">
                    Dismiss All
                  </button>
                )}
                <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
                  <X size={16} />
                </button>
              </div>
            </div>

            {activeWarnings.length > 0 ? (
              <div className="space-y-2">
                {activeWarnings.map(w => (
                  <motion.div
                    key={w.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg flex items-start gap-3"
                    style={{
                      background: `${getSeverityColor(w.severity)}10`,
                      borderLeft: `3px solid ${getSeverityColor(w.severity)}`,
                    }}
                  >
                    {getIcon(w.type)}
                    <div className="flex-1">
                      <div className="text-xs text-gray-300 leading-relaxed">{w.message}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] uppercase font-bold" style={{ color: getSeverityColor(w.severity) }}>
                          {w.severity}
                        </span>
                        <span className="text-[9px] text-gray-600">
                          {new Date(w.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => onDismiss(w.id)} className="text-gray-600 hover:text-gray-300 flex-shrink-0">
                      <X size={12} />
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShieldAlert size={32} className="text-gray-700 mx-auto mb-2" />
                <div className="text-sm text-gray-500">No active warnings</div>
                <div className="text-xs text-gray-600 mt-1">AI is monitoring your trading behavior</div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
