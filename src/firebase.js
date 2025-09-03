import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDH3jb1PAoDNVxgrAtsRVPJWrp6pLOi53I",
  authDomain: "blind-date-web-84b3d.firebaseapp.com",
  projectId: "blind-date-web-84b3d",
  storageBucket: "blind-date-web-84b3d.firebasestorage.app",
  messagingSenderId: "107099904535",
  appId: "1:107099904535:web:1b673c730ff2cb23455a52",
  measurementId: "G-CL2CXF73CJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);