import React, { useEffect, useState } from 'react';
import { useHospitalSocket } from '../../hooks/useHospitalSocket';
import axios from 'axios';
import { BedDouble, AlertCircle, HeartPulse, CheckCircle2, Plus, Minus } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? '' : 'https://lifesensorx.onrender.com');

const BedManagement: React.FC = () => {
  const { socket } = useHospitalSocket();
  const [hospital, setHospital] = useState<any>(null);

  const fetchHospital = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/hospitals`);
      if (res.data.data && res.data.data.length > 0) {
        setHospital(res.data.data[0]); // Just pick the first one for the demo
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHospital();

    if (socket) {
      socket.on('hospitalUpdate', () => {
        fetchHospital();
      });
      return () => socket.off('hospitalUpdate');
    }
  }, [socket]);

  if (!hospital) return <div className="p-8 text-center text-zinc-500">Loading Bed Data...</div>;

  const beds = hospital.beds;

  const updateBedCount = async (type: string, action: string) => {
    try {
      await axios.put(`${BACKEND_URL}/api/hospitals/${hospital._id}/beds`, { type, action });
      // The socket will trigger a re-fetch automatically
    } catch (err) {
      console.error("Failed to update bed count", err);
    }
  };

  const BedTypeCard = ({ title, type, data, icon, colorClass, borderClass }: any) => {
    const percentage = data.total > 0 ? Math.round((data.occupied / data.total) * 100) : 0;
    
    return (
      <div className={`p-6 rounded-2xl border bg-zinc-900/40 backdrop-blur-sm flex flex-col ${borderClass}`}>
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl bg-black/40 border border-white/5 ${colorClass}`}>
              {icon}
            </div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-2xl font-bold text-white">{data.available} <span className="text-sm font-medium text-zinc-500">/ {data.total}</span></span>
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              <button 
                onClick={() => updateBedCount(type, 'free')}
                disabled={data.occupied === 0}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 disabled:opacity-50 transition-colors"
                title="Free Bed"
              >
                <Minus size={14} />
              </button>
              <button 
                onClick={() => updateBedCount(type, 'allocate')}
                disabled={data.available === 0}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 disabled:opacity-50 transition-colors"
                title="Allocate Bed"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-zinc-400">
            <span>Occupancy Rate</span>
            <span className={percentage > 85 ? 'text-red-400' : 'text-emerald-400'}>{percentage}%</span>
          </div>
          <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${percentage > 85 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-cyan-500'}`} 
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Resource Optimization</h2>
        <p className="text-zinc-400">AI-driven bed allocation and occupancy predictions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <BedTypeCard 
          title="Total Beds" 
          type="general"
          data={beds} 
          icon={<BedDouble size={20} />} 
          colorClass="text-blue-400" 
          borderClass="border-blue-500/20" 
        />
        <BedTypeCard 
          title="ICU Beds" 
          type="icu"
          data={beds.icu} 
          icon={<HeartPulse size={20} />} 
          colorClass="text-amber-400" 
          borderClass="border-amber-500/20" 
        />
        <BedTypeCard 
          title="Emergency Beds" 
          type="emergency"
          data={beds.emergency} 
          icon={<AlertCircle size={20} />} 
          colorClass="text-red-400" 
          borderClass="border-red-500/30" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-zinc-800/50 bg-zinc-900/40 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-4">AI Recommendations</h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-200 mb-1">ICU Capacity Warning</p>
                <p className="text-xs text-amber-400/80">ICU beds are currently at 80% capacity. AI predicts full capacity within 4 hours based on current patient inflow.</p>
              </div>
            </li>
            <li className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-200 mb-1">General Ward Optimal</p>
                <p className="text-xs text-emerald-400/80">General ward has sufficient availability. Suggested routing for non-critical trauma cases to Ward B.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BedManagement;
