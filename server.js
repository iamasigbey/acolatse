require("dotenv").config();
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

// Initialize Firebase Admin with environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint to create anonymous user
app.post("/create-anonymous-user", async (req, res) => {
  const { idNumber } = req.body;
  if (!idNumber) {
    return res.status(400).json({ error: "idNumber is required" });
  }

  try {
    // Check if user already exists
    try {
      await admin.auth().getUser(idNumber);
      return res.status(400).json({ error: "User with this ID already exists" });
    } catch (err) {
      if (err.code !== "auth/user-not-found") {
        throw err;
      }
    }

    // Create anonymous user with idNumber as UID
    await admin.auth().createUser({
      uid: idNumber,
      displayName: idNumber,
      disabled: false,
    });
    console.log(`[Auth] Created anonymous user with UID: ${idNumber}`);
    res.json({ success: true });
  } catch (err) {
    console.error("[Auth][Error]", err);
    res.status(500).json({ error: "Failed to create anonymous user" });
  }
});

// Endpoint to delete user
app.post("/delete-user", async (req, res) => {
  const { idNumber } = req.body;
  if (!idNumber) {
    return res.status(400).json({ error: "idNumber is required" });
  }

  try {
    await admin.auth().deleteUser(idNumber);
    console.log(`[Auth] Deleted user with UID: ${idNumber}`);
    res.json({ success: true });
  } catch (err) {
    console.error("[Auth][Delete Error]", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));

// require("dotenv").config();
// const express = require("express");
// const axios = require("axios");
// const cors = require("cors");
// const admin = require("firebase-admin");

// // Initialize Firebase Admin with environment variable
// const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// const db = admin.firestore();

// const app = express();
// app.use(cors());
// app.use(express.json());

// // OTP settings
// const OTP_EXPIRY = 300; // 5 minutes
// const OTP_RATE_LIMIT = 60; // 1 OTP per 60 seconds

// // Arkesel API key from environment variable
// const ARKESEL_API_KEY = process.env.ARKESEL_API_KEY;

// // Endpoint to send OTP
// app.post("/send-otp", async (req, res) => {
//   const { phone, studentDocId } = req.body;

//   if (!phone || !studentDocId) {
//     return res.status(400).json({ error: "Phone and studentDocId are required" });
//   }

//   console.log(`[OTP] Request received for docId=${studentDocId}, phone=${phone}`);

//   try {
//     const otpRef = db.collection("otps").doc(studentDocId);
//     const otpSnap = await otpRef.get();
//     const now = Date.now();

//     // Rate limit check
//     if (otpSnap.exists) {
//       const lastCreatedAt = otpSnap.data().createdAt?.toMillis();
//       if (lastCreatedAt && (now - lastCreatedAt) / 1000 < OTP_RATE_LIMIT) {
//         const waitTime = OTP_RATE_LIMIT - Math.floor((now - lastCreatedAt) / 1000);
//         return res.status(429).json({
//           error: `Please wait ${waitTime} seconds before requesting a new OTP.`,
//         });
//       }
//     }

//     // Generate OTP
//     const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
//     console.log(`[OTP] Generated code: ${otpCode}`);

//     // Save OTP in Firestore
//     try {
//       await otpRef.set({
//         otp: otpCode,
//         createdAt: admin.firestore.FieldValue.serverTimestamp(),
//       });
//       console.log(`[OTP] Saved to Firestore`);
//     } catch (firestoreErr) {
//       console.error(`[OTP][Firestore Error]`, firestoreErr);
//       return res.status(500).json({ error: "Failed to save OTP in Firestore" });
//     }

//     // Send SMS via Arkesel
//     try {
//       const response = await axios.get("https://sms.arkesel.com/sms/api", {
//         params: {
//           action: "send-sms",
//           api_key: ARKESEL_API_KEY,
//           to: phone,
//           from: "Acolatse",
//           sms: `Your OTP code is ${otpCode}. It expires in 5 minutes.`,
//         },
//       });
//       console.log("[OTP] SMS sent:", response.data);
//     } catch (smsErr) {
//       console.error("[OTP][SMS Error]", smsErr.response?.data || smsErr.message);
//       return res.status(500).json({ error: "Failed to send OTP via SMS" });
//     }

//     res.json({ success: true });
//   } catch (err) {
//     console.error("[OTP][Unexpected Error]", err);
//     res.status(500).json({ error: "Unexpected error occurred" });
//   }
// });

// // Endpoint to send announcement SMS
// app.post("/send-sms", async (req, res) => {
//   const { phone, message } = req.body;

//   if (!phone || !message) {
//     return res.status(400).json({ error: "Phone and message are required" });
//   }

//   console.log(`[SMS] Sending announcement to phone=${phone}`);

//   try {
//     const response = await axios.get("https://sms.arkesel.com/sms/api", {
//       params: {
//         action: "send-sms",
//         api_key: ARKESEL_API_KEY,
//         to: phone,
//         from: "AcolatseVodziHall",
//         sms: message,
//       },
//     });
//     console.log("[SMS] Sent:", response.data);
//     res.json({ success: true });
//   } catch (smsErr) {
//     console.error("[SMS][Error]", smsErr.response?.data || smsErr.message);
//     res.status(500).json({ error: "Failed to send SMS" });
//   }
// });

// // Endpoint to create anonymous user
// app.post("/create-anonymous-user", async (req, res) => {
//   const { idNumber } = req.body;
//   if (!idNumber) {
//     return res.status(400).json({ error: "idNumber is required" });
//   }

//   try {
//     // Check if user already exists
//     try {
//       await admin.auth().getUser(idNumber);
//       return res.status(400).json({ error: "User with this ID already exists" });
//     } catch (err) {
//       if (err.code !== "auth/user-not-found") {
//         throw err;
//       }
//     }

//     // Create anonymous user with idNumber as UID
//     await admin.auth().createUser({
//       uid: idNumber,
//       displayName: idNumber,
//       disabled: false,
//     });
//     console.log(`[Auth] Created anonymous user with UID: ${idNumber}`);
//     res.json({ success: true });
//   } catch (err) {
//     console.error("[Auth][Error]", err);
//     res.status(500).json({ error: "Failed to create anonymous user" });
//   }
// });

// // Endpoint to delete user
// app.post("/delete-user", async (req, res) => {
//   const { idNumber } = req.body;
//   if (!idNumber) {
//     return res.status(400).json({ error: "idNumber is required" });
//   }

//   try {
//     await admin.auth().deleteUser(idNumber);
//     console.log(`[Auth] Deleted user with UID: ${idNumber}`);
//     res.json({ success: true });
//   } catch (err) {
//     console.error("[Auth][Delete Error]", err);
//     res.status(500).json({ error: "Failed to delete user" });
//   }
// });

// // Cleanup expired OTPs every minute
// const cleanupExpiredOtps = async () => {
//   const now = Date.now();
//   try {
//     const snapshot = await db.collection("otps").get();
//     snapshot.forEach(async (docSnap) => {
//       const data = docSnap.data();
//       const createdAt = data.createdAt?.toMillis();
//       if (createdAt && (now - createdAt) / 1000 > OTP_EXPIRY) {
//         await db.collection("otps").doc(docSnap.id).delete();
//         console.log(`[OTP Cleanup] Deleted expired OTP for docId: ${docSnap.id}`);
//       }
//     });
//   } catch (cleanupErr) {
//     console.error("[OTP Cleanup Error]", cleanupErr);
//   }
// };

// setInterval(cleanupExpiredOtps, 60 * 1000);

// app.listen(5000, () => console.log("Server running on port 5000"));


// const express = require("express");
// const axios = require("axios");
// const cors = require("cors");
// const admin = require("firebase-admin");

// // Initialize Firebase Admin with service account
// const serviceAccount = require("./blind-date-web-84b3d-firebase-adminsdk-fbsvc-bc9fde34c2.json");

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// const db = admin.firestore();

// const app = express();
// app.use(cors());
// app.use(express.json());

// // OTP settings
// const OTP_EXPIRY = 300; // 5 minutes
// const OTP_RATE_LIMIT = 60; // 1 OTP per 60 seconds

// // Endpoint to send OTP
// app.post("/send-otp", async (req, res) => {
//   const { phone, studentDocId } = req.body;

//   if (!phone || !studentDocId) {
//     return res.status(400).json({ error: "Phone and studentDocId are required" });
//   }

//   console.log(`[OTP] Request received for docId=${studentDocId}, phone=${phone}`);

//   try {
//     const otpRef = db.collection("otps").doc(studentDocId);
//     const otpSnap = await otpRef.get();
//     const now = Date.now();

//     // Rate limit check
//     if (otpSnap.exists) {
//       const lastCreatedAt = otpSnap.data().createdAt?.toMillis();
//       if (lastCreatedAt && (now - lastCreatedAt) / 1000 < OTP_RATE_LIMIT) {
//         const waitTime = OTP_RATE_LIMIT - Math.floor((now - lastCreatedAt) / 1000);
//         return res.status(429).json({
//           error: `Please wait ${waitTime} seconds before requesting a new OTP.`,
//         });
//       }
//     }

//     // Generate OTP
//     const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
//     console.log(`[OTP] Generated code: ${otpCode}`);

//     // Save OTP in Firestore
//     try {
//       await otpRef.set({
//         otp: otpCode,
//         createdAt: admin.firestore.FieldValue.serverTimestamp(),
//       });
//       console.log(`[OTP] Saved to Firestore`);
//     } catch (firestoreErr) {
//       console.error(`[OTP][Firestore Error]`, firestoreErr);
//       return res.status(500).json({ error: "Failed to save OTP in Firestore" });
//     }

//     // Send SMS via Arkesel
//     try {
//       const response = await axios.get("https://sms.arkesel.com/sms/api", {
//         params: {
//           action: "send-sms",
//           api_key: "VGhuaU54eUx6d1ltcnlwb0tleEg",
//           to: phone,
//           from: "BlindDate",
//           sms: `Your OTP code is ${otpCode}. It expires in 5 minutes.`,
//         },
//       });
//       console.log("[OTP] SMS sent:", response.data);
//     } catch (smsErr) {
//       console.error("[OTP][SMS Error]", smsErr.response?.data || smsErr.message);
//       return res.status(500).json({ error: "Failed to send OTP via SMS" });
//     }

//     res.json({ success: true });
//   } catch (err) {
//     console.error("[OTP][Unexpected Error]", err);
//     res.status(500).json({ error: "Unexpected error occurred" });
//   }
// });

// // Endpoint to create anonymous user
// app.post("/create-anonymous-user", async (req, res) => {
//   const { idNumber } = req.body;
//   if (!idNumber) {
//     return res.status(400).json({ error: "idNumber is required" });
//   }

//   try {
//     // Check if user already exists
//     try {
//       await admin.auth().getUser(idNumber);
//       return res.status(400).json({ error: "User with this ID already exists" });
//     } catch (err) {
//       if (err.code !== "auth/user-not-found") {
//         throw err;
//       }
//     }

//     // Create anonymous user with idNumber as UID
//     await admin.auth().createUser({
//       uid: idNumber,
//       displayName: idNumber,
//       disabled: false,
//     });
//     console.log(`[Auth] Created anonymous user with UID: ${idNumber}`);
//     res.json({ success: true });
//   } catch (err) {
//     console.error("[Auth][Error]", err);
//     res.status(500).json({ error: "Failed to create anonymous user" });
//   }
// });

// // Endpoint to delete user
// app.post("/delete-user", async (req, res) => {
//   const { idNumber } = req.body;
//   if (!idNumber) {
//     return res.status(400).json({ error: "idNumber is required" });
//   }

//   try {
//     await admin.auth().deleteUser(idNumber);
//     console.log(`[Auth] Deleted user with UID: ${idNumber}`);
//     res.json({ success: true });
//   } catch (err) {
//     console.error("[Auth][Delete Error]", err);
//     res.status(500).json({ error: "Failed to delete user" });
//   }
// });

// // Cleanup expired OTPs every minute
// const cleanupExpiredOtps = async () => {
//   const now = Date.now();
//   try {
//     const snapshot = await db.collection("otps").get();
//     snapshot.forEach(async (docSnap) => {
//       const data = docSnap.data();
//       const createdAt = data.createdAt?.toMillis();
//       if (createdAt && (now - createdAt) / 1000 > OTP_EXPIRY) {
//         await db.collection("otps").doc(docSnap.id).delete();
//         console.log(`[OTP Cleanup] Deleted expired OTP for docId: ${docSnap.id}`);
//       }
//     });
//   } catch (cleanupErr) {
//     console.error("[OTP Cleanup Error]", cleanupErr);
//   }
// };

// setInterval(cleanupExpiredOtps, 60 * 1000);

// app.listen(5000, () => console.log("OTP server running on port 5000"));

// // const express = require("express");
// // const axios = require("axios");
// // const cors = require("cors");
// // const admin = require("firebase-admin");

// // // Initialize Firebase Admin with service account
// // const serviceAccount = require("./blind-date-web-84b3d-firebase-adminsdk-fbsvc-bc9fde34c2.json");

// // admin.initializeApp({
// //   credential: admin.credential.cert(serviceAccount),
// // });

// // const db = admin.firestore();

// // const app = express();
// // app.use(cors());
// // app.use(express.json());

// // // OTP settings
// // const OTP_EXPIRY = 300; // 5 minutes
// // const OTP_RATE_LIMIT = 60; // 1 OTP per 60 seconds

// // // Endpoint to send OTP
// // app.post("/send-otp", async (req, res) => {
// //   const { phone, studentDocId } = req.body;

// //   if (!phone || !studentDocId) {
// //     return res.status(400).json({ error: "Phone and studentDocId are required" });
// //   }

// //   console.log(`[OTP] Request received for docId=${studentDocId}, phone=${phone}`);

// //   try {
// //     const otpRef = db.collection("otps").doc(studentDocId);
// //     const otpSnap = await otpRef.get();
// //     const now = Date.now();

// //     // Rate limit check
// //     if (otpSnap.exists) { // Changed from otpSnap.exists() to otpSnap.exists
// //       const lastCreatedAt = otpSnap.data().createdAt?.toMillis();
// //       if (lastCreatedAt && (now - lastCreatedAt) / 1000 < OTP_RATE_LIMIT) {
// //         const waitTime = OTP_RATE_LIMIT - Math.floor((now - lastCreatedAt) / 1000);
// //         return res.status(429).json({
// //           error: `Please wait ${waitTime} seconds before requesting a new OTP.`,
// //         });
// //       }
// //     }

// //     // Generate OTP
// //     const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
// //     console.log(`[OTP] Generated code: ${otpCode}`);

// //     // Save OTP in Firestore
// //     try {
// //       await otpRef.set({
// //         otp: otpCode,
// //         createdAt: admin.firestore.FieldValue.serverTimestamp(),
// //       });
// //       console.log(`[OTP] Saved to Firestore`);
// //     } catch (firestoreErr) {
// //       console.error(`[OTP][Firestore Error]`, firestoreErr);
// //       return res.status(500).json({ error: "Failed to save OTP in Firestore" });
// //     }

// //     // Send SMS via Arkesel
// //     try {
// //       const response = await axios.get("https://sms.arkesel.com/sms/api", {
// //         params: {
// //           action: "send-sms",
// //           api_key: "VGhuaU54eUx6d1ltcnlwb0tleEg",
// //           to: phone,
// //           from: "BlindDate",
// //           sms: `Your OTP code is ${otpCode}. It expires in 5 minutes.`,
// //         },
// //       });
// //       console.log("[OTP] SMS sent:", response.data);
// //     } catch (smsErr) {
// //       console.error("[OTP][SMS Error]", smsErr.response?.data || smsErr.message);
// //       return res.status(500).json({ error: "Failed to send OTP via SMS" });
// //     }

// //     res.json({ success: true });
// //   } catch (err) {
// //     console.error("[OTP][Unexpected Error]", err);
// //     res.status(500).json({ error: "Unexpected error occurred" });
// //   }
// // });

// // // Cleanup expired OTPs every minute
// // const cleanupExpiredOtps = async () => {
// //   const now = Date.now();
// //   try {
// //     const snapshot = await db.collection("otps").get();
// //     snapshot.forEach(async (docSnap) => {
// //       const data = docSnap.data();
// //       const createdAt = data.createdAt?.toMillis();
// //       if (createdAt && (now - createdAt) / 1000 > OTP_EXPIRY) {
// //         await db.collection("otps").doc(docSnap.id).delete();
// //         console.log(`[OTP Cleanup] Deleted expired OTP for docId: ${docSnap.id}`);
// //       }
// //     });
// //   } catch (cleanupErr) {
// //     console.error("[OTP Cleanup Error]", cleanupErr);
// //   }
// // };

// // setInterval(cleanupExpiredOtps, 60 * 1000);

// // app.listen(5000, () => console.log("OTP server running on port 5000"));