import React, { useEffect, useState } from 'react';
import { Users, Clock, AlertTriangle, BedDouble, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useHospitalSocket } from '../../hooks/useHospitalSocket';
import axios from 'axios';
import AddPatientModal from './AddPatientModal';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? '' : 'https://lifesensorx.onrender.com');

const HospitalDashboard: React.FC = () => {
  const { socket, connected } = useHospitalSocket();
  const [stats, setStats] = useState({
    totalPatients: 0,
    waitingPatients: 0,
    avgWaitTime: 0,
    criticalCases: 0,
    availableBeds: 0,
    doctorsAvailable: 5
  });

  const [queueData, setQueueData] = useState<any[]>([]);
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [triggeringEmergency, setTriggeringEmergency] = useState(false);

  // Mock chart data for now
  const chartData = [
    { time: '08:00', patients: 12 },
    { time: '09:00', patients: 25 },
    { time: '10:00', patients: 38 },
    { time: '11:00', patients: 45 },
    { time: '12:00', patients: 52 },
    { time: '13:00', patients: 48 },
    { time: '14:00', patients: 60 },
  ];

  useEffect(() => {
    // Initial Fetch
    const fetchStats = async () => {
      try {
        const queueRes = await axios.get(`${BACKEND_URL}/api/queue`);
        const q = queueRes.data.data || [];
        setQueueData(q);
        
        const waiting = q.filter((p: any) => p.status === 'WAITING');
        const critical = q.filter((p: any) => p.severity === 'CRITICAL' && p.status === 'WAITING');
        
        let totalWait = 0;
        waiting.forEach((p: any) => totalWait += p.estimatedWaitTime);
        const avgWait = waiting.length > 0 ? Math.round(totalWait / waiting.length) : 0;

        setStats(prev => ({
          ...prev,
          totalPatients: q.length,
          waitingPatients: waiting.length,
          criticalCases: critical.length,
          avgWaitTime: avgWait,
        }));
      } catch (err) {
        console.error("Error fetching dashboard data", err);
      }
    };

    fetchStats();

    if (socket) {
      socket.on('queueUpdate', fetchStats); // Refetch or smartly update on socket event
      return () => {
        socket.off('queueUpdate', fetchStats);
      };
    }
  }, [socket]);

  const statCards = [
    { title: 'Waiting Patients', value: stats.waitingPatients, icon: <Users size={24} className="text-blue-400" />, trend: '+12%', color: 'from-blue-500/20 to-cyan-500/5', border: 'border-blue-500/20' },
    { title: 'Avg Wait Time', value: `${stats.avgWaitTime}m`, icon: <Clock size={24} className="text-amber-400" />, trend: '-5m', color: 'from-amber-500/20 to-orange-500/5', border: 'border-amber-500/20' },
    { title: 'Critical Emergencies', value: stats.criticalCases, icon: <AlertTriangle size={24} className="text-red-400" />, trend: '+2', color: 'from-red-500/20 to-rose-500/5', border: 'border-red-500/20', highlight: true },
    { title: 'Available Beds', value: stats.availableBeds || 45, icon: <BedDouble size={24} className="text-emerald-400" />, trend: '-3', color: 'from-emerald-500/20 to-teal-500/5', border: 'border-emerald-500/20' },
  ];

  const handleEmergencyTrigger = async () => {
    setTriggeringEmergency(true);
    try {
      await axios.post(`${BACKEND_URL}/api/queue`, {
        name: "UNKNOWN TRAUMA PATIENT",
        age: 35,
        gender: "Unknown",
        severity: "CRITICAL",
        consultationType: "TRAUMA"
      });
      // The socket will update the stats automatically
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setTriggeringEmergency(false), 1000); // UI feedback
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Hospital Overview</h2>
          <p className="text-zinc-400 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
            {connected ? 'Live System Connected' : 'Connecting to Server...'}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className={`relative overflow-hidden rounded-2xl border ${stat.border} bg-gradient-to-br ${stat.color} p-6 backdrop-blur-sm`}>
            {stat.highlight && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse"></div>
            )}
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                {stat.icon}
              </div>
              <span className={`text-sm font-medium ${stat.trend.startsWith('+') && !stat.highlight ? 'text-emerald-400' : 'text-zinc-400'}`}>
                {stat.trend} today
              </span>
            </div>
            <h3 className="text-zinc-400 text-sm font-medium mb-1">{stat.title}</h3>
            <div className="text-3xl font-bold text-white tracking-tight">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-zinc-800/50 bg-zinc-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity size={18} className="text-cyan-400" />
              Patient Inflow Trend
            </h3>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                  itemStyle={{ color: '#06b6d4' }}
                />
                <Area type="monotone" dataKey="patients" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorPatients)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/40 p-6 backdrop-blur-sm flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-6">Quick Actions</h3>
          <div className="space-y-3 flex-1">
            <button 
              onClick={() => setIsAddPatientOpen(true)}
              className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-left rounded-xl text-sm font-medium transition-colors border border-zinc-700/50 flex justify-between items-center group"
            >
              Manual Patient Entry
              <span className="text-zinc-500 group-hover:text-white transition-colors">→</span>
            </button>
            <button 
              onClick={() => window.location.href = '/hospital/beds'}
              className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-left rounded-xl text-sm font-medium transition-colors border border-zinc-700/50 flex justify-between items-center group"
            >
              Update Bed Status
              <span className="text-zinc-500 group-hover:text-white transition-colors">→</span>
            </button>
            <button 
              onClick={handleEmergencyTrigger}
              disabled={triggeringEmergency}
              className={`w-full py-3 px-4 text-left rounded-xl text-sm font-medium transition-colors border flex justify-between items-center group ${
                triggeringEmergency 
                  ? 'bg-red-900/50 border-red-900/50 text-red-300 cursor-not-allowed'
                  : 'bg-red-900/20 hover:bg-red-900/40 border-red-900/30 text-red-400'
              }`}
            >
              {triggeringEmergency ? 'Triggering...' : 'Trigger Emergency Protocol'}
              <AlertTriangle size={16} className={triggeringEmergency ? 'animate-ping' : ''} />
            </button>
          </div>
        </div>
      </div>

      <AddPatientModal 
        isOpen={isAddPatientOpen} 
        onClose={() => setIsAddPatientOpen(false)} 
      />
    </div>
  );
};

export default HospitalDashboard;
