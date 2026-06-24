import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageType, APP_VERSION } from '../types';
import { getSession } from './AuthScreen';
import {
  LayoutDashboard, PenLine, BarChart3, LineChart, ShieldAlert, Brain,
  Mic, HeartPulse, Shield, CalendarDays, FileText, Target, Settings,
  ChevronLeft, ChevronRight, ChevronDown, Zap, User, HelpCircle,
  Wallet
} from 'lucide-react';

// Analytics sub-items
const analyticsSubItems: { id: PageType; label: string; icon: React.ReactNode }[] = [
  { id: 'graphs', label: 'Graphs & Charts', icon: <LineChart size={15} /> },
  { id: 'ai-intelligence', label: 'AI Intelligence', icon: <Brain size={15} /> },
  { id: 'risk-management', label: 'Risk Management', icon: <Shield size={15} /> },
  { id: 'reports', label: 'Reports', icon: <FileText size={15} /> },
  { id: 'psychology', label: 'Psychology', icon: <HeartPulse size={15} /> },
];

// Top menu items (no submenu)
const mainItems: { id: PageType; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'trade-entry', label: 'Trade Terminal', icon: <PenLine size={18} /> },
  { id: 'olymptrade', label: 'OlympTrade', icon: <Zap size={18} /> },
];

// Below analytics - with Account Analysis
const lowerItems: { id: PageType; label: string; icon: React.ReactNode }[] = [
  { id: 'account-analysis', label: 'Account Analysis', icon: <Wallet size={18} /> },
  { id: 'recovery', label: 'Recovery Mode', icon: <ShieldAlert size={18} /> },
  { id: 'voice-assistant', label: 'Voice Assistant', icon: <Mic size={18} /> },
  { id: 'calendar', label: 'Trading Calendar', icon: <CalendarDays size={18} /> },
  { id: 'goals', label: 'Goals & Discipline', icon: <Target size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
];

interface SidebarProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  recoveryActive: boolean;
}

export default function Sidebar({ currentPage, onNavigate, recoveryActive }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(
    ['analytics', 'graphs', 'ai-intelligence', 'risk-management', 'reports', 'psychology'].includes(currentPage)
  );
  const user = getSession();

  const isAnalyticsChild = ['analytics', 'graphs', 'ai-intelligence', 'risk-management', 'reports', 'psychology'].includes(currentPage);

  const renderItem = (item: { id: PageType; label: string; icon: React.ReactNode }, indent = false) => {
    const isActive = currentPage === item.id;
    const isRecoveryItem = item.id === 'recovery';
    
    return (
      <div
        key={item.id}
        className={`sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''} ${indent && !collapsed ? 'ml-4 pl-3 border-l border-[rgba(0,255,136,0.08)]' : ''}`}
        onClick={() => onNavigate(item.id)}
        title={collapsed ? item.label : undefined}
      >
        <span className={`flex-shrink-0 ${isRecoveryItem && recoveryActive ? 'text-[#ff3366] animate-pulse-neon' : ''}`}>
          {item.icon}
        </span>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="whitespace-nowrap overflow-hidden text-[12px]"
            >
              {item.label}
              {isRecoveryItem && recoveryActive && <span className="ml-1 text-[9px] text-[#ff3366]">?</span>}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={`h-screen sticky top-0 flex flex-col transition-all duration-300 ${collapsed ? 'w-[60px]' : 'w-[220px]'}`}
      style={{
        background: 'rgba(10, 10, 15, 0.95)',
        borderRight: '1px solid rgba(0, 255, 136, 0.1)',
      }}
    >
      {/* Logo */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-3 border-b border-[rgba(0,255,136,0.1)]`}>
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00ff88] to-[#00d4ff] flex items-center justify-center">
              <Zap size={16} className="text-black" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#00ff88] neon-text tracking-wider">NEXUS</div>
              <div className="text-[9px] text-gray-500 tracking-widest">T.R.O.S.</div>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00ff88] to-[#00d4ff] flex items-center justify-center">
            <Zap size={16} className="text-black" />
          </div>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {/* Top items */}
        {mainItems.map(item => renderItem(item))}

        {/* Analytics with submenu */}
        <div>
          <div
            className={`sidebar-item ${isAnalyticsChild ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
            onClick={() => {
              if (collapsed) { onNavigate('analytics'); return; }
              setAnalyticsOpen(!analyticsOpen);
              onNavigate('analytics');
            }}
            title={collapsed ? 'Analytics' : undefined}
          >
            <span className="flex-shrink-0"><BarChart3 size={18} /></span>
            {!collapsed && (
              <>
                <span className="whitespace-nowrap overflow-hidden flex-1 text-[13px]">Analytics</span>
                <motion.span animate={{ rotate: analyticsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={14} className="text-gray-600" />
                </motion.span>
              </>
            )}
          </div>

          {/* Sub-menu */}
          <AnimatePresence>
            {analyticsOpen && !collapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {analyticsSubItems.map(sub => renderItem(sub, true))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Lower items - Now includes Account Analysis */}
        {lowerItems.map(item => renderItem(item))}
      </nav>

      {/* Bottom section: Profile + Help + Collapse */}
      <div className="border-t border-[rgba(0,255,136,0.1)] px-2 py-2 space-y-0.5">
        {/* User Profile */}
        <div
          className={`sidebar-item ${currentPage === 'profile' ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
          onClick={() => onNavigate('profile')}
          title={collapsed ? 'Profile' : undefined}
        >
          {user ? (
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-[#00ff88] to-[#00d4ff] flex items-center justify-center text-[10px] font-bold text-black">
              {(user.displayName || 'U')[0].toUpperCase()}
            </span>
          ) : (
            <span className="flex-shrink-0"><User size={18} /></span>
          )}
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-[12px] truncate">{user?.displayName || 'Profile'}</span>
              {user && <span className="text-[9px] text-gray-600 truncate">{user.email}</span>}
            </div>
          )}
        </div>

        {/* Help */}
        <div
          className={`sidebar-item ${currentPage === 'help' ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
          onClick={() => onNavigate('help')}
          title={collapsed ? 'Help & About' : undefined}
        >
          <span className="flex-shrink-0"><HelpCircle size={18} /></span>
          {!collapsed && (
            <div className="flex items-center gap-2 flex-1 overflow-hidden">
              <span className="text-[12px] whitespace-nowrap">Help</span>
              <span className="ml-auto text-[8px] text-gray-600 font-mono">v{APP_VERSION}</span>
            </div>
          )}
        </div>

        {/* Collapse */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 text-gray-500 hover:text-[#00ff88] transition-colors rounded-lg"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </motion.aside>
  );
}
