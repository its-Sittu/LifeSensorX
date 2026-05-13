import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, Bell, Shield, Database, Layout } from 'lucide-react';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState({
    hospitalName: 'Central General Hospital',
    maxQueueCapacity: 100,
    enableAutoTriage: true,
    notificationSound: true,
    darkMode: true,
    smsAlerts: true
  });

  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    // Simulate save
    setTimeout(() => setSaving(false), 800);
  };

  const Toggle = ({ label, description, checked, onChange }: any) => (
    <div className="flex items-center justify-between py-4 border-b border-zinc-800/50 last:border-0">
      <div>
        <p className="text-white font-medium">{label}</p>
        <p className="text-xs text-zinc-500 mt-1">{description}</p>
      </div>
      <button 
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full relative transition-colors ${checked ? 'bg-cyan-500' : 'bg-zinc-700'}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${checked ? 'left-6.5' : 'left-0.5'}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Hospital Settings</h2>
          <p className="text-zinc-400">Manage system preferences and hospital configurations</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-medium shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Settings Navigation Sidebar */}
        <div className="md:col-span-1 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-800/50 text-white rounded-xl border border-zinc-700/50">
            <Layout size={18} className="text-cyan-400" /> General
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800/30 rounded-xl transition-colors">
            <Bell size={18} /> Notifications
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800/30 rounded-xl transition-colors">
            <Shield size={18} /> Security
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800/30 rounded-xl transition-colors">
            <Database size={18} /> Integrations
          </button>
        </div>

        {/* Settings Content */}
        <div className="md:col-span-3 space-y-6">
          
          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <SettingsIcon size={20} className="text-zinc-400" />
              General Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Hospital Name</label>
                <input 
                  type="text" 
                  value={settings.hospitalName} 
                  onChange={e => setSettings({...settings, hospitalName: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Maximum Queue Capacity</label>
                <input 
                  type="number" 
                  value={settings.maxQueueCapacity} 
                  onChange={e => setSettings({...settings, maxQueueCapacity: parseInt(e.target.value)})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white mb-2">System Behaviors</h3>
            <div className="space-y-1">
              <Toggle 
                label="AI Auto-Triage" 
                description="Automatically prioritize patients based on severity using AI predictions."
                checked={settings.enableAutoTriage}
                onChange={(val: boolean) => setSettings({...settings, enableAutoTriage: val})}
              />
              <Toggle 
                label="Notification Sounds" 
                description="Play audible alerts for CRITICAL emergency arrivals."
                checked={settings.notificationSound}
                onChange={(val: boolean) => setSettings({...settings, notificationSound: val})}
              />
              <Toggle 
                label="SMS Alerts to Staff" 
                description="Send background SMS to available doctors on new critical trauma patients."
                checked={settings.smsAlerts}
                onChange={(val: boolean) => setSettings({...settings, smsAlerts: val})}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;
