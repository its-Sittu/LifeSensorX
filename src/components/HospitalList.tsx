import React from 'react';
import { HeartPulse, Navigation } from 'lucide-react';

const mockHospitals = [
  { id: 1, name: "City General Hospital", distance: "1.2", time: "5 min" },
  { id: 2, name: "Metro Trauma Center", distance: "3.4", time: "12 min" },
  { id: 3, name: "Westside Emergency", distance: "5.1", time: "18 min" },
];

const HospitalList: React.FC = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Nearby Hospitals</h3>
        <HeartPulse size={18} className="text-red-400" />
      </div>

      <div className="flex flex-col gap-2">
        {mockHospitals.map(hospital => (
          <div key={hospital.id} className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white mb-1">{hospital.name}</p>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span>{hospital.distance} miles</span>
                <span className="w-1 h-1 rounded-full bg-zinc-600" />
                <span>~{hospital.time} drive</span>
              </div>
            </div>
            
            <button className="w-10 h-10 rounded-full bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-blue-400 hover:bg-zinc-700 transition-colors">
              <Navigation size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HospitalList;
