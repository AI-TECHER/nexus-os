import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Shield, Brain, Activity, Cpu, Wifi, Database, Lock } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

const bootLines = [
  { text: 'NEXUS KERNEL v4.2.1 ............... LOADED', delay: 0 },
  { text: 'Neural Trading Engine .............. ONLINE', delay: 200 },
  { text: 'AI Discipline Module ............... ACTIVE', delay: 400 },
  { text: 'Recovery Protection System ......... ARMED', delay: 600 },
  { text: 'Emotional Detection Array .......... SYNCED', delay: 800 },
  { text: 'Risk Management Firewall ........... SECURE', delay: 1000 },
  { text: 'Psychology Analytics Core ........... READY', delay: 1200 },
  { text: 'Voice Command Interface ............ LINKED', delay: 1400 },
  { text: 'Data Encryption Layer .............. AES-256', delay: 1600 },
  { text: 'System Integrity ................... 100%', delay: 1800 },
];

const systemModules = [
  { name: 'AI ENGINE', icon: <Brain size={14} />, color: '#a855f7' },
  { name: 'RISK SHIELD', icon: <Shield size={14} />, color: '#00ff88' },
  { name: 'ANALYTICS', icon: <Activity size={14} />, color: '#00d4ff' },
  { name: 'NEURAL NET', icon: <Cpu size={14} />, color: '#ffdd00' },
  { name: 'LIVE SYNC', icon: <Wifi size={14} />, color: '#00ff88' },
  { name: 'DATA VAULT', icon: <Database size={14} />, color: '#a855f7' },
  { name: 'ENCRYPTION', icon: <Lock size={14} />, color: '#ff3366' },
  { name: 'CORE SYS', icon: <Zap size={14} />, color: '#00d4ff' },
];

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState(0); // 0=logo, 1=boot, 2=modules, 3=ready, 4=exit
  const [visibleLines, setVisibleLines] = useState(0);
  const [moduleProgress, setModuleProgress] = useState<number[]>(new Array(8).fill(0));
  const [overallProgress, setOverallProgress] = useState(0);

  // Phase sequencing
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Phase 0: Logo flicker (0 - 1200ms)
    timers.push(setTimeout(() => setPhase(1), 1200));
    // Phase 1: Boot lines (1200 - 3400ms)
    timers.push(setTimeout(() => setPhase(2), 3400));
    // Phase 2: Module loading (3400 - 5400ms)
    timers.push(setTimeout(() => setPhase(3), 5600));
    // Phase 3: Ready (5400 - 6400ms)
    timers.push(setTimeout(() => setPhase(4), 6600));
    // Phase 4: Exit
    timers.push(setTimeout(() => onComplete(), 7200));
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // Boot lines typing
  useEffect(() => {
    if (phase < 1) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    bootLines.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), bootLines[i].delay));
    });
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // Module progress bars
  useEffect(() => {
    if (phase < 2) return;
    const interval = setInterval(() => {
      setModuleProgress(prev => {
        const next = prev.map((p, i) => {
          const speed = 3 + Math.random() * 8 + i * 0.5;
          return Math.min(100, p + speed);
        });
        return next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [phase]);

  // Overall progress
  useEffect(() => {
    if (phase < 1) return;
    const interval = setInterval(() => {
      setOverallProgress(prev => {
        if (phase === 1) return Math.min(40, prev + 2);
        if (phase === 2) return Math.min(85, prev + 3);
        if (phase >= 3) return Math.min(100, prev + 8);
        return prev;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [phase]);

  return (
    <AnimatePresence>
      {phase < 4 && (
        <motion.div
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: '#050508' }}
        >
          {/* Animated Background Grid */}
          <div className="absolute inset-0 splash-grid opacity-20" />

          {/* Scanline overlay */}
          <div className="absolute inset-0 pointer-events-none splash-scanlines" />

          {/* Corner decorations */}
          <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-[#00ff8833] rounded-tl-lg" />
          <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-[#00ff8833] rounded-tr-lg" />
          <div className="absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 border-[#00ff8833] rounded-bl-lg" />
          <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-[#00ff8833] rounded-br-lg" />

          {/* Top HUD bar */}
          <div className="absolute top-0 left-0 right-0 h-8 flex items-center justify-between px-6 border-b border-[#00ff8815]">
            <span className="text-[9px] text-[#00ff8855] font-mono tracking-widest">SYS://NEXUS.TROS.BOOT</span>
            <span className="text-[9px] text-[#00ff8855] font-mono tracking-widest">{new Date().toISOString()}</span>
          </div>

          {/* Main Content */}
          <div className="relative z-10 flex flex-col items-center max-w-2xl w-full px-8">

            {/* Phase 0: Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: phase === 0 ? [0, 1, 0.6, 1, 0.8, 1] : 1,
                scale: phase === 0 ? [0.5, 1.1, 1] : 1,
              }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="flex flex-col items-center mb-8"
            >
              {/* Hexagon Logo */}
              <div className="relative mb-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 w-28 h-28 rounded-full"
                  style={{
                    background: 'conic-gradient(from 0deg, transparent, #00ff8833, transparent, #00d4ff33, transparent)',
                  }}
                />
                <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-[#00ff8820] to-[#00d4ff10] border border-[#00ff8840] flex items-center justify-center relative backdrop-blur-sm"
                  style={{ boxShadow: '0 0 40px #00ff8822, 0 0 80px #00ff8811, inset 0 0 30px #00ff8808' }}>
                  <motion.div
                    animate={phase === 0 ? { opacity: [0.5, 1, 0.7, 1] } : { opacity: 1 }}
                    transition={{ duration: 0.8, repeat: phase === 0 ? 2 : 0 }}
                  >
                    <Zap size={48} className="text-[#00ff88] drop-shadow-[0_0_15px_rgba(0,255,136,0.6)]" />
                  </motion.div>
                </div>
              </div>

              {/* Title with glitch effect */}
              <motion.h1
                className="text-4xl md:text-5xl font-black tracking-[0.3em] splash-glitch-text"
                style={{
                  color: '#00ff88',
                  textShadow: '0 0 20px #00ff8866, 0 0 40px #00ff8833, 0 0 80px #00ff8822',
                }}
                data-text="NEXUS"
              >
                NEXUS
              </motion.h1>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                className="h-px bg-gradient-to-r from-transparent via-[#00ff88] to-transparent mt-3 max-w-[200px]"
              />
              <motion.p
                initial={{ opacity: 0, letterSpacing: '0.5em' }}
                animate={{ opacity: 1, letterSpacing: '0.6em' }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="text-[10px] text-[#00d4ff] mt-2 tracking-[0.6em] font-medium uppercase"
              >
                Trading Recovery Operating System
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ delay: 0.9 }}
                className="text-[9px] text-gray-600 mt-1 tracking-[0.3em]"
              >
                AI-POWERED DISCIPLINE ENGINE v4.2
              </motion.p>
            </motion.div>

            {/* Phase 1: Boot Terminal */}
            <AnimatePresence>
              {phase >= 1 && phase < 3 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4 }}
                  className="w-full mb-6"
                >
                  <div className="rounded-lg border border-[#00ff8818] bg-[#05050888] p-4 font-mono text-[10px] max-h-[180px] overflow-hidden">
                    <div className="text-[#00ff8855] mb-2">{'>'} INITIALIZING NEXUS T.R.O.S. ...</div>
                    {bootLines.slice(0, visibleLines).map((line, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex justify-between py-[2px]"
                      >
                        <span className="text-[#8899aa]">{line.text.split('...')[0]}</span>
                        <span className="text-[#00ff88]">{line.text.split('...')[1] || ''}</span>
                      </motion.div>
                    ))}
                    {visibleLines < bootLines.length && (
                      <span className="inline-block w-2 h-3 bg-[#00ff88] animate-pulse ml-1" />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Phase 2: Module Loading */}
            <AnimatePresence>
              {phase >= 2 && phase < 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="w-full mb-6"
                >
                  <div className="grid grid-cols-4 gap-2">
                    {systemModules.map((mod, i) => (
                      <motion.div
                        key={mod.name}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.06, duration: 0.25 }}
                        className="rounded-lg border border-[#1e2a3a] bg-[#0a0a0f88] p-2 text-center"
                      >
                        <div className="flex items-center justify-center mb-1.5" style={{ color: mod.color }}>
                          {mod.icon}
                        </div>
                        <div className="text-[8px] text-gray-500 tracking-wider mb-1.5">{mod.name}</div>
                        <div className="h-1 rounded-full bg-[#1e2a3a] overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              width: `${moduleProgress[i]}%`,
                              background: mod.color,
                              boxShadow: `0 0 6px ${mod.color}55`,
                            }}
                          />
                        </div>
                        <div className="text-[8px] mt-1 font-mono" style={{ color: moduleProgress[i] >= 100 ? mod.color : '#4a5568' }}>
                          {moduleProgress[i] >= 100 ? 'READY' : `${Math.floor(moduleProgress[i])}%`}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Phase 3: System Ready */}
            <AnimatePresence>
              {phase === 3 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  transition={{ duration: 0.4 }}
                  className="text-center mb-6"
                >
                  <motion.div
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 0.6, repeat: 2 }}
                    className="text-lg font-bold tracking-[0.4em] text-[#00ff88] mb-2"
                    style={{ textShadow: '0 0 30px #00ff8866, 0 0 60px #00ff8833' }}
                  >
                    SYSTEM ONLINE
                  </motion.div>
                  <div className="text-[10px] text-[#00d4ff] tracking-widest">
                    ALL MODULES OPERATIONAL — ENTERING DASHBOARD
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Overall Progress Bar */}
            <div className="w-full max-w-md">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] text-gray-600 font-mono tracking-wider">
                  {phase === 0 ? 'BOOTING' : phase === 1 ? 'INITIALIZING' : phase === 2 ? 'LOADING MODULES' : phase === 3 ? 'READY' : 'LAUNCHING'}
                </span>
                <span className="text-[9px] font-mono tracking-wider" style={{ color: overallProgress >= 100 ? '#00ff88' : '#00d4ff' }}>
                  {overallProgress}%
                </span>
              </div>
              <div className="h-1 rounded-full bg-[#1e2a3a] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    width: `${overallProgress}%`,
                    background: overallProgress >= 100
                      ? 'linear-gradient(90deg, #00ff88, #00d4ff)'
                      : 'linear-gradient(90deg, #00ff88, #00d4ff, #a855f7)',
                    boxShadow: '0 0 10px #00ff8844',
                    transition: 'width 0.1s ease-out',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Bottom HUD */}
          <div className="absolute bottom-0 left-0 right-0 h-8 flex items-center justify-between px-6 border-t border-[#00ff8815]">
            <span className="text-[9px] text-[#00ff8833] font-mono">◈ NEXUS T.R.O.S.</span>
            <div className="flex items-center gap-4">
              <span className="text-[8px] text-[#00ff8833] font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" /> SECURE
              </span>
              <span className="text-[8px] text-[#00d4ff33] font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-pulse" /> AI ACTIVE
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
