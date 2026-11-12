import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// From Firebase Console → Project settings → Your apps → Web app.
// (A Firebase web config isn't a secret — access is controlled by firestore.rules.)
const firebaseConfig = {
  apiKey: "AIzaSyA__hAnl7z3cjS-HPVK7RjcqqgvwBmIRMo",
  authDomain: "cfb-app-77d62.firebaseapp.com",
  projectId: "cfb-app-77d62",
  storageBucket: "cfb-app-77d62.firebasestorage.app",
  messagingSenderId: "240609478451",
  appId: "1:240609478451:web:e2aac50fd6b77b9c5c2046",
  measurementId: "G-DNVB9TZ6QD"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
