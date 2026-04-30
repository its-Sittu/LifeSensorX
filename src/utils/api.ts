import { LocationData, Contact } from '../store/useEmergencyStore';

const BACKEND_URL = 'https://lifesensorx.onrender.com';

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
