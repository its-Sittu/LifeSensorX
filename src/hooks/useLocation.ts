import { useState, useEffect, useRef, useCallback } from 'react';

export interface LocationData {
  latitude: number | null;
  longitude: number | null;
}

export type LocationStatus = 'idle' | 'loading' | 'active' | 'denied' | 'error' | 'unavailable';

export const useLocation = () => {
  const [location, setLocation] = useState<LocationData>({ latitude: null, longitude: null });
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMsg('Geolocation is not supported by your browser');
      return;
    }

    setStatus('loading');
    setErrorMsg(null);

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    };

    const handleSuccess = (position: GeolocationPosition) => {
      const newLoc = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setLocation(newLoc);
      setStatus('active');
      setErrorMsg(null);
      // Save for persistence
      localStorage.setItem('last_known_location', JSON.stringify(newLoc));
    };

    const handleError = (error: GeolocationPositionError) => {
      console.warn('Geolocation Error:', error);
      
      if (error.code === error.PERMISSION_DENIED) {
        setStatus('denied');
        setErrorMsg('Location access denied. Please allow to continue.');
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        setStatus('unavailable');
        setErrorMsg('Please turn on your device location (GPS) to continue.');
      } else if (error.code === error.TIMEOUT) {
        setStatus('unavailable');
        setErrorMsg('Location request timed out. Please check your GPS signal.');
      } else {
        setStatus('error');
        setErrorMsg('An unknown location error occurred.');
      }
    };

    // 1. Immediate fetch
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);

    // 2. Start continuous tracking
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, options);
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setStatus('idle');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Check for existing permissions on mount
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        if (result.state === 'granted') {
          startTracking();
        }
        result.onchange = () => {
          if (result.state === 'granted') {
            startTracking();
          } else if (result.state === 'denied') {
            setStatus('denied');
          }
        };
      });
    }
    
    // Load last known location from cache immediately
    const saved = localStorage.getItem('last_known_location');
    if (saved) {
      try {
        setLocation(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse cached location');
      }
    }
  }, [startTracking]);

  return {
    location,
    status,
    errorMsg,
    startTracking,
    stopTracking
  };
};
