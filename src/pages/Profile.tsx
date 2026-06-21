import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserProfile } from '../types';
import { getSession, clearSession } from '../components/AuthScreen';
import {
  User, Save, Lock, Smartphone, LogOut, Shield, Globe, Clock,
  Mail, Calendar, CheckCircle2
} from 'lucide-react';

export default function Profile() {
  const user = getSession();
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    country: user?.country || '',
    timezone: user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    twoFactorEnabled: user?.twoFactorEnabled || false,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      displayName: form.displayName,
      country: form.country,
      timezone: form.timezone,
      twoFactorEnabled: form.twoFactorEnabled,
    };
    localStorage.setItem('nexus_session', JSON.stringify(updated));
    if (form.twoFactorEnabled) localStorage.setItem('nexus_2fa_' + user.email, 'enabled');
    else localStorage.removeItem('nexus_2fa_' + user.email);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => { clearSession(); window.location.reload(); };

  const handleChangePassword = () => {
    const newPw = prompt('Enter new password (min 6 characters):');
    if (!newPw || newPw.length < 6) { alert('Password must be at least 6 characters'); return; }
    try {
      const users = JSON.parse(localStorage.getItem('nexus_users') || '{}');
      if (user && users[user.email]) {
        let h = 0;
        for (let i = 0; i < newPw.length; i++) { h = ((h << 5) - h + newPw.charCodeAt(i)) | 0; }
        users[user.email].password = 'h' + Math.abs(h).toString(36) + newPw.length.toString(36);
        localStorage.setItem('nexus_users', JSON.stringify(users));
        alert('Password changed successfully');
      }
    } catch { alert('Error changing password'); }
  };

  if (!user) {
    return <div className="text-center text-gray-500 py-16">Not signed in.</div>;
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {saved && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.3)] text-[#00ff88] text-sm flex items-center gap-2">
          <CheckCircle2 size={14} /> Profile updated!
        </motion.div>
      )}

      {/* Avatar & Info Card */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00ff88] to-[#00d4ff] flex items-center justify-center text-black text-3xl font-black">
            {(user.displayName || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-200">{user.displayName}</h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <Mail size={12} /> {user.email}
            </div>
            <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-600">
              <span className="flex items-center gap-1"><Calendar size={10} /> Joined {new Date(user.createdAt).toLocaleDateString()}</span>
              <span className="flex items-center gap-1"><Clock size={10} /> Last login {new Date(user.lastLogin).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Edit Form */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <User size={14} className="text-[#a855f7]" /> Edit Profile
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Display Name</label>
            <input className="cyber-input" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Email (read-only)</label>
            <input className="cyber-input" value={user.email} disabled style={{ opacity: 0.45 }} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><Globe size={11} /> Country</label>
            <input className="cyber-input" placeholder="e.g. India, United States" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><Clock size={11} /> Timezone</label>
            <input className="cyber-input" value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={handleSave} className="cyber-button flex items-center gap-2"><Save size={14} /> Save Profile</button>
        </div>
      </motion.div>

      {/* Security */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Shield size={14} className="text-[#00d4ff]" /> Security
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-[rgba(30,42,58,0.3)] hover:bg-[rgba(30,42,58,0.5)] transition-all">
            <input type="checkbox" checked={form.twoFactorEnabled} onChange={e => setForm({ ...form, twoFactorEnabled: e.target.checked })} className="w-4 h-4 rounded accent-[#00ff88]" />
            <Smartphone size={16} className="text-gray-500" />
            <div>
              <div className="text-xs text-gray-300">Two-Factor Authentication</div>
              <div className="text-[10px] text-gray-600">Verification code required on each login</div>
            </div>
          </label>
          <button onClick={handleChangePassword} className="cyber-button flex items-center gap-2 w-full justify-center">
            <Lock size={14} /> Change Password
          </button>
        </div>
      </motion.div>

      {/* Sign Out */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <button onClick={handleLogout} className="cyber-button cyber-button-danger flex items-center gap-2 w-full justify-center py-3">
          <LogOut size={16} /> Sign Out
        </button>
      </motion.div>
    </div>
  );
}
