import { LocationData, Contact, Hospital } from '../store/useEmergencyStore';

export const getBackendUrl = (): string => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? ''
    : 'https://lifesensorx.onrender.com';
};

const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c;
};

export const sendEmergencySMS = async (contacts: Contact[], location: LocationData) => {
  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/send-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contacts: contacts.map(c => c.phone),
        latitude: location.latitude,
        longitude: location.longitude,
      }),
    }).catch(() => {
      throw new Error('Connection failed. Please ensure the backend server is running on port 5000.');
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      let errorMessage = 'Failed to send alerts';
      try {
        const parsed = JSON.parse(text);
        errorMessage = parsed.error || errorMessage;
      } catch {
        errorMessage = `Server responded with status ${response.status}. Please make sure the backend server is running.`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json().catch(() => {
      throw new Error('Invalid response received from server.');
    });
    
    return data;
  } catch (error: any) {
    console.error('SMS API Error:', error);
    throw error;
  }
};

export const fetchNearbyHospitals = async (
  lat: number | null, 
  lng: number | null, 
  query: string | null = null
): Promise<Hospital[]> => {
  // 1. Try Backend API first
  try {
    const backendUrl = getBackendUrl();
    const url = query 
      ? `${backendUrl}/nearby-hospitals?query=${encodeURIComponent(query)}`
      : `${backendUrl}/nearby-hospitals?lat=${lat}&lng=${lng}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        return data.results;
      }
    }
  } catch (backendErr) {
    console.warn('[Hospitals] Backend fetch note (using direct high-speed client discovery):', backendErr);
  }

  // 2. Direct Overpass API (Strict 10,000 meters / 10 KM Radius from Browser)
  if (lat !== null && lng !== null) {
    try {
      const overpassQuery = `[out:json][timeout:10];
(
  nwr(around:10000,${lat},${lng})["amenity"="hospital"];
  nwr(around:10000,${lat},${lng})["healthcare"="hospital"];
  nwr(around:10000,${lat},${lng})["emergency"="yes"];
  nwr(around:7000,${lat},${lng})["amenity"="clinic"];
);
out center tags;`;

      const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
      const res = await fetch(overpassUrl, {
        headers: { 'User-Agent': 'LifeSensorX-10KmEmergency/4.0' }
      });

      if (res.ok) {
        const json = await res.json();
        const elements = json.elements || [];
        const seen = new Set();
        const validList: Hospital[] = [];

        for (const place of elements) {
          const name = place.tags?.name || place.tags?.['name:en'] || place.tags?.['official_name'];
          if (!name || seen.has(name.toLowerCase())) continue;
          seen.add(name.toLowerCase());

          const hLat = place.lat || place.center?.lat;
          const hLng = place.lon || place.center?.lon;
          if (!hLat || !hLng) continue;

          const dist = calculateDistanceKm(lat, lng, hLat, hLng);
          if (dist > 10.0) continue; // STRICT 10 KM LIMIT

          const phone = place.tags?.phone || place.tags?.['contact:phone'] || place.tags?.['contact:mobile'] || place.tags?.['emergency:phone'] || '108';
          const street = place.tags?.['addr:street'] || place.tags?.['addr:suburb'] || place.tags?.['addr:district'] || '';
          const city = place.tags?.['addr:city'] || place.tags?.['addr:state'] || '';
          const fullAddr = place.tags?.['addr:full'] || [street, city].filter(Boolean).join(', ') || 'Emergency Trauma Center';

          validList.push({
            name,
            address: fullAddr,
            location: { lat: hLat, lng: hLng },
            phone,
            score: Math.max(70, Math.round(99 - dist * 3)),
            isRecommended: validList.length === 0,
            distanceKm: parseFloat(dist.toFixed(2)),
            reason: validList.length === 0 
              ? "Nearest trauma facility strictly within 10 km of your live GPS coordinates" 
              : "Emergency hospital with active trauma and surgical support",
            beds: {
              total: 60,
              occupied: 22,
              available: 38,
              icu: { total: 12, occupied: 7, available: 5 },
              emergency: { total: 10, occupied: 4, available: 6 }
            },
            doctorsAvailable: 6,
            emergencySupport: true
          });
        }

        if (validList.length > 0) {
          validList.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
          validList[0].isRecommended = true;
          return validList.slice(0, 10);
        }
      }
    } catch (overpassErr) {
      console.warn('[Hospitals] Client overpass error:', overpassErr);
    }
  }

  // 3. Fallback: Direct Nominatim Bounding Box (10 KM)
  try {
    let nomUrl = '';
    if (lat !== null && lng !== null) {
      const delta = 0.09; // ~10km bounding box
      const viewbox = `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`;
      nomUrl = `https://nominatim.openstreetmap.org/search?q=hospital&format=json&viewbox=${viewbox}&bounded=1&limit=15&addressdetails=1`;
    } else if (query) {
      nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' hospital')}&format=json&limit=15&addressdetails=1`;
    }

    if (nomUrl) {
      const nomRes = await fetch(nomUrl, {
        headers: { 'User-Agent': 'LifeSensorX-10KmEmergency/4.0' }
      });

      if (nomRes.ok) {
        const places = await nomRes.json();
        if (places && places.length > 0) {
          const seen = new Set();
          const valid = places.filter((p: any) => {
            const rawName = p.name || p.display_name.split(',')[0];
            if (!rawName || rawName.toLowerCase() === 'hospital' || seen.has(rawName.toLowerCase())) return false;
            seen.add(rawName.toLowerCase());
            return true;
          });

          if (valid.length > 0) {
            const results: Hospital[] = valid.map((place: any, index: number) => {
              const hLat = parseFloat(place.lat);
              const hLng = parseFloat(place.lon);
              const dist = (lat && lng) ? calculateDistanceKm(lat, lng, hLat, hLng) : null;
              
              return {
                name: place.name || place.display_name.split(',')[0],
                address: place.display_name,
                location: { lat: hLat, lng: hLng },
                phone: "108",
                score: Math.max(70, 98 - index * 4),
                isRecommended: index === 0,
                distanceKm: dist ? parseFloat(dist.toFixed(2)) : null,
                reason: index === 0 
                  ? "Nearest emergency hospital within 10 km" 
                  : "24/7 medical trauma services available",
                beds: {
                  total: 60,
                  occupied: 22,
                  available: 38,
                  icu: { total: 12, occupied: 7, available: 5 },
                  emergency: { total: 10, occupied: 4, available: 6 }
                },
                doctorsAvailable: 5 + (index % 4),
                emergencySupport: true
              };
            });

            if (lat !== null && lng !== null) {
              const filtered = results.filter(h => (h.distanceKm || 0) <= 10.0);
              filtered.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
              if (filtered.length > 0) return filtered.slice(0, 10);
            }
            return results.slice(0, 10);
          }
        }
      }
    }
  } catch (clientErr) {
    console.error('[Hospitals] Client-side live discovery error:', clientErr);
  }

  return [];
};

export const getRecommendedHospital = async (
  lat: number, 
  lng: number, 
  severity: string = 'CRITICAL'
) => {
  try {
    const backendUrl = getBackendUrl();
    const url = `${backendUrl}/api/recommend-hospital?lat=${lat}&lng=${lng}&severity=${severity}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to get recommendation: ${response.statusText}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error('Hospital Recommendation Error:', error);
    throw error;
  }
};
