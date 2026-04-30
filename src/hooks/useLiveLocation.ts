import { useState, useEffect, useRef } from 'react';

type LocationStatus = 'idle' | 'loading' | 'active' | 'error' | 'denied';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
}

export const useLiveLocation = () => {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [location, setLocation] = useState<LocationState>({ latitude: null, longitude: null });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const watchIdRef = useRef<number | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('last_known_location');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.latitude && parsed.longitude) {
          setLocation(parsed);
        }
      } catch (e) {
        console.error('Failed to parse cached location', e);
      }
    }
  }, []);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMsg('Geolocation is not supported by your browser');
      return;
    }

    setStatus('loading');
    setErrorMsg(null);

    // Clear any existing watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLocation(newLocation);
        setStatus('active');
        localStorage.setItem('last_known_location', JSON.stringify(newLocation));
      },
      (error) => {
        // If HTML5 Geolocation fails (common on desktops without GPS/Wi-Fi), use IP fallback
        if (error.code !== error.PERMISSION_DENIED) {
          fetchIpLocationFallback();
        } else {
          setStatus('denied');
          setErrorMsg('Location access denied by user.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 8000, // 8 seconds before trying fallback
        maximumAge: 0,
      }
    );
  };

  const fetchIpLocationFallback = async () => {
    try {
      setStatus('loading');
      setErrorMsg('GPS failed, trying Network Location...');
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      if (data.latitude && data.longitude) {
        const newLocation = {
          latitude: data.latitude,
          longitude: data.longitude,
        };
        setLocation(newLocation);
        setStatus('active');
        localStorage.setItem('last_known_location', JSON.stringify(newLocation));
      } else {
        throw new Error('Invalid IP location data');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg('Could not determine location from GPS or Network.');
    }
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    // Only change status if we were actively tracking or loading
    if (status === 'active' || status === 'loading') {
      setStatus('idle');
    }
  };

  const denyLocation = () => {
    stopTracking();
    setStatus('denied');
    setErrorMsg('User explicitly denied location access.');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    status,
    location,
    errorMsg,
    startTracking,
    stopTracking,
    denyLocation
  };
};
