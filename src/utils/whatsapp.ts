import { LocationData } from "../store/useEmergencyStore";

export const generateWhatsAppLink = (phone: string, location: LocationData) => {
  // Clean phone number (remove everything except digits)
  const cleanPhone = phone.replace(/\D/g, '');
  
  // WhatsApp wa.me links require country code without +
  // If the number is 10 digits, we assume it's Indian and prepend 91
  const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  
  let message = `🚨 Emergency Alert!
A possible accident has been detected.
I may need immediate assistance.\n\n`;
  
  if (location.latitude && location.longitude) {
    const mapsLink = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
    message += `📍 My current location:\n${mapsLink}\n\n`;
  } else {
    message += `📍 My location could not be determined.\n\n`;
  }

  message += `Please reach out or send help immediately.`;

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${finalPhone}?text=${encodedMessage}`;
};
