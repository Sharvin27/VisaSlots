const {
    default: makeWASocket,
    DisconnectReason,
    useMultiFileAuthState
} = require('@whiskeysockets/baileys');

require('dotenv').config();


const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const admin = require("firebase-admin");

// ✅ Load your Firebase Admin service account JSON key
// const serviceAccount = require("./firebase-key.json");


const fs = require("fs");

let firebaseConfig;

// First try loading from environment variable (Render)
if (process.env.FIREBASE_KEY) {
    firebaseConfig = JSON.parse(process.env.FIREBASE_KEY);
} else {
    // Fallback to local JSON file (for development)
    firebaseConfig = JSON.parse(fs.readFileSync("./firebase-key.json", "utf8"));
}

admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig)
});

// // ✅ Initialize Firebase Admin SDK
// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount)
// });

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

        const lowerText = text.toLowerCase();

        // Keywords that indicate slots are available
        const positiveKeywords = [
            "slot available",
            "slots available",
            "slot is available",
            "slots are available",
            "slots are open",
            "got slot",
            "slot opened",
            "slot open",
            "slots released",
            "slot release",
            "slots came",
            "slot dropped",
            "slots drop",
            "slot got",
            "slot is available",
            "booked slot",
        ];

        // Check if message includes any positive keyword
        const isSlotAlert = positiveKeywords.some(keyword => lowerText.includes(keyword));

        if (isSlotAlert) {
            // await sock.sendMessage(from, { text: 'pong!' });

            // ✅ Prepare push notification payload with both notification and data
            const message = {
                token: process.env.FCM_TOKEN, // ✅ Replace with your real FCM device token

                data: {
                    title: 'Visa Slot Found!',
                    body: 'Login now and book fast!',
                    type: 'slot_alert'
                },

                android: {
                    priority: "high"
                },

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

startBot();


// ✅ Add Express to keep Render Web Service alive
const express = require('express');
const app = express();

app.get('/', (_, res) => res.send('✅ WhatsApp bot is running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🟢 Express server running on port ${PORT}`);
});