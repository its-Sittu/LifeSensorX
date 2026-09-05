import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, CheckCircle2, AlertCircle, RefreshCw, X, Send, Smartphone, ShieldCheck } from 'lucide-react';
import { getBackendUrl } from '../utils/api';

interface GatewayStatus {
  isConnected: boolean;
  connectedUser: string | null;
  hasQr: boolean;
}

interface WhatsAppGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WhatsAppGatewayModal: React.FC<WhatsAppGatewayModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<GatewayStatus>({ isConnected: false, connectedUser: null, hasQr: false });
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const backendUrl = getBackendUrl() || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://lifesensorx.onrender.com');

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/whatsapp/status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.warn('Failed to fetch WhatsApp gateway status:', err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await fetch(`${backendUrl}/api/whatsapp/logout`, { method: 'POST' });
      await fetchStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone) return;
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch(`${backendUrl}/api/whatsapp/test?phone=${encodeURIComponent(testPhone)}`);
      const data = await res.json();
      if (data.success) {
        setTestResult(`✅ Test emergency alert sent to +91${testPhone.slice(-10)}!`);
      } else {
        setTestResult(`❌ Failed: ${data.error || 'Check gateway connection'}`);
      }
    } catch (err: any) {
      setTestResult(`❌ Error: ${err.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Smartphone size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">WhatsApp Emergency Gateway</h3>
                <p className="text-xs text-zinc-400">100% Free Automatic Crash Alert System</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Status Badge */}
          <div className="my-5 flex items-center justify-center">
            {status.isConnected ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>CONNECTED & READY ({status.connectedUser || 'Active'})</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold animate-pulse">
                <AlertCircle size={16} className="text-amber-400" />
                <span>WAITING FOR SCAN — LINK A DEVICE</span>
              </div>
            )}
          </div>

          {/* Body Content */}
          {status.isConnected ? (
            <div className="flex flex-col gap-4 text-center">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-left">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1">
                  <ShieldCheck size={18} />
                  <span>Automatic Dispatch Armed</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Whenever an accident or SOS occurs, LifeSensorX will automatically send live GPS location and crash details to all emergency contacts from this linked WhatsApp account.
                </p>
              </div>

              {/* Quick Test Box */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-left">
                <label className="text-xs font-bold text-zinc-300 block mb-2">Send Instant Test WhatsApp Message:</label>
                <div className="flex gap-2">
                  <input 
                    type="tel"
                    placeholder="Enter 10-digit phone number"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button 
                    onClick={handleSendTest}
                    disabled={isSendingTest || !testPhone}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Send size={14} />
                    <span>{isSendingTest ? 'Sending...' : 'Send'}</span>
                  </button>
                </div>
                {testResult && (
                  <p className="text-xs mt-2 font-medium">{testResult}</p>
                )}
              </div>

              <div className="flex gap-2 mt-2">
                <button 
                  onClick={handleDisconnect}
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 text-xs font-bold transition-all cursor-pointer"
                >
                  {isLoading ? 'Disconnecting...' : 'Disconnect / Link New WhatsApp'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              {/* Live QR Frame */}
              <div className="p-3 bg-white rounded-2xl shadow-xl my-2">
                <iframe 
                  src={`${backendUrl}/api/whatsapp/qr`}
                  title="WhatsApp QR Scanner"
                  className="w-[280px] h-[340px] border-0 overflow-hidden rounded-xl"
                />
              </div>

              <div className="w-full text-left bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-400 mt-2">
                <p className="font-bold text-white mb-1">📋 How to Link in 5 Seconds:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Open <b>WhatsApp</b> on your mobile phone.</li>
                  <li>Tap <b>Menu (⋮)</b> or <b>Settings</b> &gt; <b>Linked Devices</b>.</li>
                  <li>Tap <b>Link a Device</b> and point camera at this QR code.</li>
                </ol>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WhatsAppGatewayModal;
