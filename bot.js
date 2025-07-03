const {
    default: makeWASocket,
    DisconnectReason,
    useMultiFileAuthState
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const admin = require('./firebase');
const { isSlotAlertMessage } = require('./slotDetector');

require('dotenv').config();

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
        if (qr) {
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect =
                (lastDisconnect?.error instanceof Boom)
                    ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                    : true;

            console.log('Connection closed. Reconnecting...', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ Connected to WhatsApp!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const from = msg.key.remoteJid;

        if (isSlotAlertMessage(text)) {
            const message = {
                token: process.env.FCM_TOKEN,
                data: {
                    title: 'Visa Slot Found!',
                    body: text,
                    type: 'slot_alert'
                },
                android: { priority: "high" },
                apns: {
                    payload: {
                        aps: {
                            contentAvailable: true
                        }
                    }
                }
            };

            try {
                const response = await admin.messaging().send(message);
                console.log("✅ FCM Notification sent:", response);
            } catch (error) {
                console.error("❌ Error sending FCM:", error);
            }
        }
    });
}

module.exports = startBot;
