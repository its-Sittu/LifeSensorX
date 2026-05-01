import React, { useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ContactsManager from './components/ContactsManager';
import HospitalList from './components/HospitalList';
import EmergencyModal from './components/EmergencyModal';
import LocationMap from './components/LocationMap';
import LocationPermissionModal from './components/LocationPermissionModal';
import { ShieldAlert, MapPin } from 'lucide-react';
import { useLocation } from './hooks/useLocation';
import { useEmergencyStore } from './store/useEmergencyStore';

const App: React.FC = () => {
  // Use the new, robust location hook
  const { status, location, errorMsg, startTracking } = useLocation();
  const setEmergencyLocation = useEmergencyStore(state => state.setLocation);

  // Sync the local hook location with the global emergency store
  useEffect(() => {
    if (location.latitude && location.longitude) {
      setEmergencyLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        error: null
      });
    }
  }, [location.latitude, location.longitude, setEmergencyLocation]);

  // Warm up the backend API on load
  useEffect(() => {
    fetch('https://lifesensorx.onrender.com').catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-blue-500/30">
      
      {/* Location Permission Modal - Now blocks app until active */}
      <LocationPermissionModal 
        status={status} 
        errorMsg={errorMsg}
        onAllow={startTracking} 
      />

      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/5 blur-[150px] rounded-full" />
      </div>

      {/* Main Responsive Container */}
      <div className="relative z-10 max-w-7xl mx-auto min-h-screen flex flex-col px-4 py-8 md:py-12">
        
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <ShieldAlert size={22} className="text-white drop-shadow-lg" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-cyan-400">Life</span>SensorX <span className="text-[10px] text-zinc-600 font-mono align-top ml-1">v1.2</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={startTracking}
              className="p-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white transition-colors"
              title="Refresh Location"
            >
              <MapPin size={14} />
            </button>
            <div className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center">
              <div className={`w-2 h-2 rounded-full ${
                status === 'active' 
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse' 
                  : status === 'loading'
                  ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-bounce'
                  : 'bg-red-500'
              }`} />
            </div>
          </div>
        </header>

        {/* Responsive Content Area */}
        <main className="flex-1 flex flex-col lg:grid lg:grid-cols-3 gap-8 pb-8">
          <div className="lg:col-span-2 flex flex-col gap-8 h-full">
            <Dashboard />
            <LocationMap status={status} location={location} errorMsg={errorMsg} />
          </div>
          <div className="flex flex-col gap-8 lg:col-span-1 h-full">
            <ContactsManager />
            <HospitalList />
          </div>
        </main>

      </div>

      {/* Modals */}
      <EmergencyModal />
    </div>
  );
};

export default App;
