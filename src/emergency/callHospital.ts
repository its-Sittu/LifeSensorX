/**
 * Twilio voice call and SMS to the selected hospital.
 */
import twilio from 'twilio';

export async function callHospital(
  phone: string,
  patientName: string,
  address: string,
  lat: number,
  lng: number
): Promise<void> {
  try {
    const accountSid = process.env.TWILIO_SID;
    const authToken = process.env.TWILIO_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE;

    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error('Twilio credentials missing');
    }

    const client = twilio(accountSid, authToken);

    const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
    const smsMessage = `EMERGENCY! ${patientName} is in critical condition. Location: ${address}. Maps: ${mapsLink}. Kripya ambulance bhejein.`;
    
    // Voice Message in Hindi
    const voiceMessage = `Apata-kaleen sthiti! ${patientName} gambheer sthiti mein hain. Pata hai: ${address}. Kripya turant ambulance bhejein.`;
    
    // TwiML for repeated message with Polly.Aditi
    const twiml = `
      <Response>
        <Say voice="Polly.Aditi" language="hi-IN">${voiceMessage}</Say>
        <Pause length="1"/>
        <Say voice="Polly.Aditi" language="hi-IN">${voiceMessage}</Say>
      </Response>
    `;

    // Fire both SMS and Call simultaneously without awaiting sequentially
    const smsPromise = client.messages.create({
      body: smsMessage,
      from: twilioPhone,
      to: phone
    }).then(() => console.log(`[${new Date().toISOString()}] Hospital SMS sent successfully`))
      .catch((err) => console.error(`[${new Date().toISOString()}] Hospital SMS failed:`, err.message));

    const callPromise = client.calls.create({
      twiml: twiml,
      to: phone,
      from: twilioPhone
    }).then(() => console.log(`[${new Date().toISOString()}] Hospital Voice Call initiated successfully`))
      .catch((err) => console.error(`[${new Date().toISOString()}] Hospital Voice Call failed:`, err.message));

    await Promise.all([smsPromise, callPromise]);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] callHospital failed:`, error.message);
    // Even if it fails, we don't throw to prevent blocking the rest of the workflow
  }
}
