import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, TrendingUp, TrendingDown, Users } from 'lucide-react';

const Analytics: React.FC = () => {
  const departmentData = [
    { name: 'General', value: 400 },
    { name: 'Trauma', value: 300 },
    { name: 'Cardiology', value: 200 },
    { name: 'Orthopedic', value: 150 },
  ];

  const waitTimeData = [
    { day: 'Mon', wait: 24 },
    { day: 'Tue', wait: 18 },
    { day: 'Wed', wait: 35 },
    { day: 'Thu', wait: 20 },
    { day: 'Fri', wait: 45 },
    { day: 'Sat', wait: 55 },
    { day: 'Sun', wait: 40 },
  ];

  const COLORS = ['#06b6d4', '#ef4444', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Hospital Analytics</h2>
        <p className="text-zinc-400">Historical data and performance metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl border border-zinc-800/50 bg-zinc-900/40 backdrop-blur-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
              <Activity size={24} />
            </div>
            <span className="flex items-center text-sm font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
              <TrendingDown size={14} className="mr-1" /> 12%
            </span>
          </div>
          <h3 className="text-zinc-400 text-sm font-medium">Avg Resolution Time</h3>
          <p className="text-3xl font-bold text-white mt-1">45 min</p>
        </div>
        
        <div className="p-6 rounded-2xl border border-zinc-800/50 bg-zinc-900/40 backdrop-blur-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-500/10 rounded-xl text-red-400">
              <Users size={24} />
            </div>
            <span className="flex items-center text-sm font-medium text-red-400 bg-red-500/10 px-2 py-1 rounded-lg">
              <TrendingUp size={14} className="mr-1" /> 5%
            </span>
          </div>
          <h3 className="text-zinc-400 text-sm font-medium">Total Daily Cases</h3>
          <p className="text-3xl font-bold text-white mt-1">1,248</p>
        </div>

        <div className="p-6 rounded-2xl border border-zinc-800/50 bg-zinc-900/40 backdrop-blur-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
              <Activity size={24} />
            </div>
            <span className="flex items-center text-sm font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
              <TrendingDown size={14} className="mr-1" /> 2%
            </span>
          </div>
          <h3 className="text-zinc-400 text-sm font-medium">Emergency Ratio</h3>
          <p className="text-3xl font-bold text-white mt-1">18%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Wait Times Chart */}
        <div className="p-6 rounded-2xl border border-zinc-800/50 bg-zinc-900/40 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-white mb-6">Average Wait Times by Day</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waitTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="day" stroke="#52525b" tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: '#27272a', opacity: 0.4}}
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                />
                <Bar dataKey="wait" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Patient Distribution Chart */}
        <div className="p-6 rounded-2xl border border-zinc-800/50 bg-zinc-900/40 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-white mb-6">Cases by Department</h3>
          <div className="h-64 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Custom Legend */}
            <div className="absolute right-0 flex flex-col gap-3">
              {departmentData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                  <span className="text-sm text-zinc-400">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Analytics;
