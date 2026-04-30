import { useEffect, useState } from 'react';
import { useEmergencyStore } from '../store/useEmergencyStore';

const CRASH_THRESHOLD = 60; // Increased threshold to require a very hard shake/impact
const COOLDOWN_MS = 5000;

export const useCrashDetection = () => {
  const [isActive, setIsActive] = useState(false);
  const [lastCrashTime, setLastCrashTime] = useState(0);
  const triggerEmergency = useEmergencyStore(state => state.triggerEmergency);

  useEffect(() => {
    if (!isActive) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const { acceleration } = event;
      if (!acceleration) return;

      const { x, y, z } = acceleration;
      
      // Calculate total acceleration magnitude (excluding gravity if acceleration is provided without gravity)
      // Note: DeviceMotionEvent.acceleration is generally without gravity, but fallback to accelerationIncludingGravity might be needed on older devices.
      const accX = x || 0;
      const accY = y || 0;
      const accZ = z || 0;
      
      const magnitude = Math.sqrt(accX * accX + accY * accY + accZ * accZ);

      if (magnitude > CRASH_THRESHOLD) {
        const now = Date.now();
        if (now - lastCrashTime > COOLDOWN_MS) {
          console.log('Crash detected! Magnitude:', magnitude);
          setLastCrashTime(now);
          triggerEmergency();
        }
      }
    };

    // Request permission for iOS 13+ devices
    const requestPermission = async () => {
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        try {
          const permissionState = await (DeviceMotionEvent as any).requestPermission();
          if (permissionState === 'granted') {
            window.addEventListener('devicemotion', handleMotion);
          }
        } catch (error) {
          console.error('Error requesting devicemotion permission:', error);
        }
      } else {
        window.addEventListener('devicemotion', handleMotion);
      }
    };

    requestPermission();

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [isActive, lastCrashTime, triggerEmergency]);

  return { isActive, setIsActive };
};
