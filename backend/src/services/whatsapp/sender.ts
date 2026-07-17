import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

/**
 * Send a WhatsApp message via Twilio.
 * Best-effort: logs errors but never throws so callers are never broken by a
 * messaging failure.
 */
export async function sendWhatsAppMessage(to: string, body: string): Promise<boolean> {
  if (!accountSid || !authToken) {
    console.warn('[whatsapp] Twilio credentials not set — skipping message send.');
    return false;
  }

  // Ensure the number has the whatsapp: prefix
  const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  try {
    const client = twilio(accountSid, authToken);
    const message = await client.messages.create({
      from: fromNumber,
      to: toNumber,
      body,
    });
    console.log(`[whatsapp] Message sent to ${toNumber} — SID: ${message.sid}`);
    return true;
  } catch (err) {
    console.error(`[whatsapp] Failed to send message to ${toNumber}:`, err);
    return false;
  }
}
