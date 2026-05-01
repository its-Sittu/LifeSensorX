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

  // Auto-start tracking if permission was previously granted or last_known_location exists
  useEffect(() => {
    const saved = localStorage.getItem('last_known_location');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.latitude && parsed.longitude) {
          setLocation(parsed);
          // Don't auto-start tracking here to avoid permission prompts on mount, 
          // but we could if we check permissions API
        }
      } catch (e) {
        console.error('Failed to parse cached location', e);
      }
    }
    
    // Check if we can auto-start
    const checkPermission = async () => {
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          if (result.state === 'granted') {
            startTracking();
          }
          result.onchange = () => {
            if (result.state === 'granted') startTracking();
          };
        } catch (e) {
          console.log('Permissions API not supported or failed');
        }
      }
    };
    checkPermission();
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

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    const success = (position: GeolocationPosition) => {
      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      console.log('Location acquired:', newLocation);
      setLocation(newLocation);
      setStatus('active');
      localStorage.setItem('last_known_location', JSON.stringify(newLocation));
    };

    const error = (err: GeolocationPositionError) => {
      console.warn('Geolocation error:', err.message);
      // If HTML5 Geolocation fails, use IP fallback
      if (err.code !== err.PERMISSION_DENIED) {
        fetchIpLocationFallback();
      } else {
        setStatus('denied');
        setErrorMsg('Location access denied by user.');
      }
    };

    // First attempt a quick get current position for immediate response
    navigator.geolocation.getCurrentPosition(success, error, options);

    // Then start the watch for live updates
    watchIdRef.current = navigator.geolocation.watchPosition(success, error, options);
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
