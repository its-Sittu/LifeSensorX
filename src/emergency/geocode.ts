/**
 * Reverse Geocoding helper using Google Maps Geocoding API.
 * Converts {lat, lng} to a human-readable Hindi address.
 */
import axios from 'axios';

export async function getHindiAddress(lat: number, lng: number): Promise<string> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_KEY;
    if (!apiKey) throw new Error('Google Maps API key missing');

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=hi&key=${apiKey}`;
    const response = await axios.get(url);

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      console.log(`[${new Date().toISOString()}] Reverse Geocoding successful`);
      return response.data.results[0].formatted_address;
    }
    throw new Error(`Geocoding failed with status: ${response.data.status}`);
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Reverse Geocoding failed:`, error.message);
    return `Location: ${lat}, ${lng}`; // Fallback address
  }
}
