import { LocationData, Contact, Hospital } from '../store/useEmergencyStore';

export const getBackendUrl = (): string => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? ''
    : 'https://lifesensorx.onrender.com';
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
  try {
    const backendUrl = getBackendUrl();
    const url = query 
      ? `${backendUrl}/nearby-hospitals?query=${encodeURIComponent(query)}`
      : `${backendUrl}/nearby-hospitals?lat=${lat}&lng=${lng}`;

    const response = await fetch(url).catch(() => {
      throw new Error('Connection failed. Please ensure the backend server is running on port 5000.');
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      let errorMessage = 'Failed to fetch hospitals';
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

    return data.results || [];
  } catch (error: any) {
    console.error('Hospitals API Error:', error);
    throw error;
  }
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
