import { LocationData, Contact } from '../store/useEmergencyStore';

const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? '' 
  : 'https://lifesensorx.onrender.com';

export const sendEmergencySMS = async (contacts: Contact[], location: LocationData) => {
  try {
    const response = await fetch(`${BACKEND_URL}/send-alert`, {
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
        errorMessage = `Server responded with status ${response.status}. Please make sure the backend server is running on port 5000.`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json().catch(() => {
      throw new Error('Invalid response received from server. Check if the backend is running properly.');
    });
    
    return data;
  } catch (error: any) {
    console.error('SMS API Error:', error);
    throw error;
  }
};

export const fetchNearbyHospitals = async (lat: number | null, lng: number | null, query: string | null = null) => {
  try {
    const url = query 
      ? `${BACKEND_URL}/nearby-hospitals?query=${encodeURIComponent(query)}`
      : `${BACKEND_URL}/nearby-hospitals?lat=${lat}&lng=${lng}`;

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
        errorMessage = `Server responded with status ${response.status}. Please make sure the backend server is running on port 5000.`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json().catch(() => {
      throw new Error('Invalid response received from server. Check if the backend is running properly.');
    });

    return data.results;
  } catch (error: any) {
    console.error('Hospitals API Error:', error);
    throw error;
  }
};

