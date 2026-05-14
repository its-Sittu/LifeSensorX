/**
 * Sends SMS to user's emergency contacts via Fast2SMS API.
 */
import axios from 'axios';

interface EmergencyContact {
  name: string;
  phone: string;
}

export async function notifyContacts(
  patientName: string,
  contacts: EmergencyContact[],
  lat: number,
  lng: number,
  address: string
): Promise<void> {
  try {
    const apiKey = process.env.FAST2SMS_KEY;
    if (!apiKey) throw new Error('Fast2SMS API key missing');

    const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
    const message = `EMERGENCY! ${patientName} is in critical condition. Location: ${address}. Maps: ${mapsLink}`;

    // Fast2SMS supports multiple numbers comma separated
    const numbers = contacts.slice(0, 5).map(c => c.phone).join(',');
    
    if (!numbers) {
      console.log(`[${new Date().toISOString()}] No emergency contacts to notify.`);
      return;
    }

    await axios.get('https://www.fast2sms.com/dev/bulkV2', {
      params: {
        authorization: apiKey,
        route: 'v3',
        sender_id: 'TXTIND',
        message: message,
        language: 'unicode', // for hindi/regional
        numbers: numbers,
      }
    });

    console.log(`[${new Date().toISOString()}] Emergency contacts notified successfully`);
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Failed to notify emergency contacts:`, error.message);
  }
}
