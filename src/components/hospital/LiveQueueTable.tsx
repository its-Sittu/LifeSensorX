import React, { useEffect, useState } from 'react';
import { useHospitalSocket } from '../../hooks/useHospitalSocket';
import axios from 'axios';
import { Clock, AlertCircle, CheckCircle2, User, Activity, BedDouble } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const LiveQueueTable: React.FC = () => {
  const { socket } = useHospitalSocket();
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/queue`);
      // Sort so critical ones and WAITING are on top, then by arrival time
      const sorted = res.data.data.sort((a: any, b: any) => {
        if (a.status === 'WAITING' && b.status !== 'WAITING') return -1;
        if (a.status !== 'WAITING' && b.status === 'WAITING') return 1;
        
        const severityWeight: Record<string, number> = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        const weightA = severityWeight[a.severity] || 0;
        const weightB = severityWeight[b.severity] || 0;
        
        if (weightA !== weightB) return weightB - weightA;
        return new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime();
      });
      setQueue(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();

    if (socket) {
      const handleUpdate = () => fetchQueue();
      socket.on('queueUpdate', handleUpdate);
      return () => {
        socket.off('queueUpdate', handleUpdate);
      };
    }
  }, [socket]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await axios.put(`${BACKEND_URL}/api/queue/${id}/status`, { status: newStatus });
      // The socket will trigger a re-fetch automatically
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch(severity) {
      case 'CRITICAL': return 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse';
      case 'HIGH': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Live Queue Monitoring</h2>
          <p className="text-zinc-400">Real-time patient flow and AI predictions</p>
        </div>
        <button onClick={fetchQueue} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors border border-zinc-700">
          Refresh List
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/40 backdrop-blur-sm overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/80 border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                <th className="p-4 font-medium">Patient</th>
                <th className="p-4 font-medium">Priority</th>
                <th className="p-4 font-medium">Est. Wait</th>
                <th className="p-4 font-medium">Arrival</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">Loading live queue...</td>
                </tr>
              ) : queue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">No patients in queue.</td>
                </tr>
              ) : (
                queue.map((patient) => (
                  <tr key={patient._id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${patient.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-400'}`}>
                          <User size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{patient.name}</p>
                          <p className="text-xs text-zinc-500">{patient.consultationType}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityStyle(patient.severity)}`}>
                        {patient.severity === 'CRITICAL' && <AlertCircle size={12} className="mr-1" />}
                        {patient.severity}
                      </span>
                    </td>
                    <td className="p-4">
                      {patient.status === 'WAITING' ? (
                        <div className="flex items-center gap-2">
                          <Clock size={16} className={patient.estimatedWaitTime > 30 ? 'text-amber-400' : 'text-emerald-400'} />
                          <span className="text-sm font-medium text-zinc-300">{patient.estimatedWaitTime} min</span>
                        </div>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-zinc-400">
                      {new Date(patient.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${patient.status === 'WAITING' ? 'text-cyan-400' : patient.status === 'IN_CONSULTATION' ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {patient.status === 'WAITING' && <Clock size={14} />}
                        {patient.status === 'IN_CONSULTATION' && <Activity size={14} />}
                        {patient.status === 'ADMITTED' && <BedDouble size={14} />}
                        {patient.status === 'DISCHARGED' && <CheckCircle2 size={14} />}
                        {patient.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      {patient.status === 'WAITING' && (
                        <button 
                          onClick={() => updateStatus(patient._id, 'IN_CONSULTATION')}
                          className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-lg text-xs font-medium transition-colors"
                        >
                          Call Patient
                        </button>
                      )}
                      {patient.status === 'IN_CONSULTATION' && (
                        <div className="flex gap-2">
                           <button 
                            onClick={() => updateStatus(patient._id, 'ADMITTED')}
                            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-medium transition-colors"
                          >
                            Admit
                          </button>
                          <button 
                            onClick={() => updateStatus(patient._id, 'DISCHARGED')}
                            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium transition-colors"
                          >
                            Discharge
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LiveQueueTable;
