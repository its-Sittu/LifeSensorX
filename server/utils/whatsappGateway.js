const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

let sock = null;
let latestQrString = null;
let latestQrDataUrl = null;
let isConnected = false;
let connectedUser = null;
let isInitializing = false;

const authDir = path.join(__dirname, '..', 'auth_info_baileys');

// Ensure auth dir exists
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

async function startWhatsAppGateway() {
  if (isInitializing) return;
  isInitializing = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307], isLatest: true }));

    console.log(`[WhatsApp Gateway] Starting Baileys v${version.join('.')} (isLatest: ${isLatest})`);

    const logger = pino({ level: 'silent' });

    sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      printQRInTerminal: true,
      logger,
      browser: ['LifeSensorX Emergency Gateway', 'Chrome', '1.0.0'],
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        latestQrString = qr;
        try {
          latestQrDataUrl = await QRCode.toDataURL(qr);
          console.log(`\n==================================================`);
          console.log(`📲 [WhatsApp Gateway] NEW QR CODE GENERATED!`);
          console.log(`👉 Open http://localhost:5000/api/whatsapp/qr to scan`);
          console.log(`==================================================\n`);
        } catch (qrErr) {
          console.error('[WhatsApp Gateway] QR generation error:', qrErr);
        }
      }

      if (connection === 'close') {
        isConnected = false;
        connectedUser = null;
        isInitializing = false;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(`[WhatsApp Gateway] Connection closed (status: ${statusCode}). Reconnecting: ${shouldReconnect}`);

        if (statusCode === DisconnectReason.loggedOut) {
          console.log('[WhatsApp Gateway] Logged out. Clearing session files...');
          latestQrString = null;
          latestQrDataUrl = null;
          try {
            fs.rmSync(authDir, { recursive: true, force: true });
            fs.mkdirSync(authDir, { recursive: true });
          } catch (e) {}
        }

        if (shouldReconnect) {
          setTimeout(() => {
            isInitializing = false;
            startWhatsAppGateway();
          }, 3000);
        }
      } else if (connection === 'open') {
        isConnected = true;
        isInitializing = false;
        latestQrString = null;
        latestQrDataUrl = null;
        connectedUser = sock.user?.id || 'Connected';
        console.log(`\n==================================================`);
        console.log(`✅ [WhatsApp Gateway] WHATSAPP CONNECTED SUCCESSFULLY!`);
        console.log(`👤 Connected as: ${connectedUser}`);
        console.log(`🚀 Ready to send automatic emergency crash alerts!`);
        console.log(`==================================================\n`);
      }
    });

  } catch (error) {
    console.error('[WhatsApp Gateway] Initialization error:', error.message);
  }
}

/**
 * Send Emergency WhatsApp message to any Indian or International Phone Number
 * @param {string[]} phoneNumbers List of phone numbers (e.g., ["8789812990", "+918318077801"])
 * @param {string} message The text message containing live location and crash details
 */
async function sendEmergencyWhatsAppMessage(phoneNumbers, message) {
  if (!isConnected || !sock) {
    return {
      success: false,
      reason: 'NOT_CONNECTED',
      message: 'WhatsApp Gateway is not linked yet. Scan QR at /api/whatsapp/qr'
    };
  }

  const results = [];

  for (const rawPhone of phoneNumbers) {
    try {
      const cleanDigits = String(rawPhone).replace(/\D/g, '');
      let fullNumber = cleanDigits;

      // Ensure Indian country code 91 if 10-digit number
      if (cleanDigits.length === 10) {
        fullNumber = `91${cleanDigits}`;
      }

      const jid = `${fullNumber}@s.whatsapp.net`;
      console.log(`[WhatsApp Gateway] Auto-dispatching emergency message to JID: ${jid}`);

      const sentMsg = await sock.sendMessage(jid, { text: message });
      console.log(`[WhatsApp Gateway] Message delivered to ${fullNumber}, Message ID: ${sentMsg.key?.id}`);
      results.push({ number: fullNumber, success: true, messageId: sentMsg.key?.id });
    } catch (err) {
      console.warn(`[WhatsApp Gateway] Failed to send to ${rawPhone}:`, err.message);
      results.push({ number: rawPhone, success: false, error: err.message });
    }
  }

  const anySuccess = results.some(r => r.success);
  return {
    success: anySuccess,
    count: results.length,
    results
  };
}

function getWhatsAppGatewayStatus() {
  return {
    isConnected,
    connectedUser,
    hasQr: Boolean(latestQrDataUrl)
  };
}

function getLatestQrDataUrl() {
  return latestQrDataUrl;
}

module.exports = {
  startWhatsAppGateway,
  sendEmergencyWhatsAppMessage,
  getWhatsAppGatewayStatus,
  getLatestQrDataUrl
};
