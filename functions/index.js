require("dotenv").config();
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// OTP settings
const OTP_EXPIRY = 300; // 5 minutes
const OTP_RATE_LIMIT = 60; // 1 OTP per 60 seconds

// Send OTP Cloud Function
exports.sendOtp = onRequest({ cors: true }, async (req, res) => {
  logger.info("[sendOtp] Request received:", { method: req.method, body: req.body, apiKey: process.env.ARKESEL_API_KEY });
  if (req.method !== "POST") {
    logger.error("[sendOtp] Invalid method:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { phone, studentDocId } = req.body;

  if (!phone || !studentDocId) {
    logger.error("[sendOtp] Missing required fields:", { phone, studentDocId });
    return res.status(400).json({ error: "Phone and studentDocId are required" });
  }

  logger.info(`[OTP] Processing for docId=${studentDocId}, phone=${phone}`);

  try {
    const otpRef = db.collection("otps").doc(studentDocId);
    const otpSnap = await otpRef.get();
    const now = Date.now();

    // Rate limit check
    if (otpSnap.exists) {
      const lastCreatedAt = otpSnap.data().createdAt?.toMillis();
      if (lastCreatedAt && (now - lastCreatedAt) / 1000 < OTP_RATE_LIMIT) {
        const waitTime = OTP_RATE_LIMIT - Math.floor((now - lastCreatedAt) / 1000);
        logger.info(`[OTP] Rate limit hit, wait ${waitTime} seconds`);
        return res.status(429).json({
          error: `Please wait ${waitTime} seconds before requesting a new OTP.`,
        });
      }
    }

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    logger.info(`[OTP] Generated code: ${otpCode}`);

    // Save OTP in Firestore
    try {
      await otpRef.set({
        otp: otpCode,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      logger.info(`[OTP] Saved to Firestore for docId=${studentDocId}`);
    } catch (firestoreErr) {
      logger.error(`[OTP][Firestore Error]`, { error: firestoreErr.message, stack: firestoreErr.stack });
      return res.status(500).json({ error: "Failed to save OTP in Firestore" });
    }

    // Send SMS via Arkesel
    try {
      logger.info("[OTP] Sending SMS via Arkesel", { phone, apiKey: process.env.ARKESEL_API_KEY });
      const response = await axios.get("https://sms.arkesel.com/sms/api", {
        params: {
          action: "send-sms",
          api_key: process.env.ARKESEL_API_KEY,
          to: phone,
          from: "Acolatse",
          sms: `Your OTP code is ${otpCode}. It expires in 5 minutes.`,
        },
      });
      logger.info("[OTP] SMS sent:", { response: response.data });
      res.json({ success: true });
    } catch (smsErr) {
      logger.error("[OTP][SMS Error]", {
        message: smsErr.message,
        response: smsErr.response?.data,
        status: smsErr.response?.status,
      });
      return res.status(500).json({ error: "Failed to send OTP via SMS" });
    }
  } catch (err) {
    logger.error("[OTP][Unexpected Error]", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Unexpected error occurred" });
  }
});

// Send Announcement SMS Cloud Function
exports.sendSms = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: "Phone and message are required" });
  }

  logger.info(`[SMS] Sending announcement to phone=${phone}`);

  try {
    const response = await axios.get("https://sms.arkesel.com/sms/api", {
      params: {
        action: "send-sms",
        api_key: process.env.ARKESEL_API_KEY,
        to: phone,
        from: "AcolatseVodziHall",
        sms: message,
      },
    });
    logger.info("[SMS] Sent:", { response: response.data });
    res.json({ success: true });
  } catch (smsErr) {
    logger.error("[SMS][Error]", {
      message: smsErr.message,
      response: smsErr.response?.data,
      status: smsErr.response?.status,
    });
    return res.status(500).json({ error: "Failed to send SMS" });
  }
});

// Cleanup Expired OTPs (Scheduled Function)
exports.cleanupExpiredOtps = onSchedule("every 1 minutes", async () => {
  const now = Date.now();
  try {
    const snapshot = await db.collection("otps").get();
    const deletePromises = snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      const createdAt = data.createdAt?.toMillis();
      if (createdAt && (now - createdAt) / 1000 > OTP_EXPIRY) {
        await db.collection("otps").doc(docSnap.id).delete();
        logger.info(`[OTP Cleanup] Deleted expired OTP for docId: ${docSnap.id}`);
      }
    });
    await Promise.all(deletePromises);
  } catch (cleanupErr) {
    logger.error("[OTP Cleanup Error]", { error: cleanupErr.message, stack: cleanupErr.stack });
  }
});