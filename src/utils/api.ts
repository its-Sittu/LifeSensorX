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
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send alerts');
    }

    return data;
  } catch (error) {
    console.error('SMS API Error:', error);
    throw error;
  }
};

export const fetchNearbyHospitals = async (lat: number | null, lng: number | null, query: string | null = null) => {
  try {
    const url = query 
      ? `${BACKEND_URL}/nearby-hospitals?query=${encodeURIComponent(query)}`
      : `${BACKEND_URL}/nearby-hospitals?lat=${lat}&lng=${lng}`;

    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch hospitals');
    }

    return data.results;
  } catch (error) {
    console.error('Hospitals API Error:', error);
    throw error;
  }
};
