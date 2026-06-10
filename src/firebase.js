// Import the core Firebase tools
import { initializeApp } from "firebase/app";

// Import the specific services we will use (Database & Authentication)
import { getDatabase } from "firebase/database";

// 🌟 NEW: Import the Auth service
import { getAuth } from "firebase/auth";

// 🛑 REPLACE THIS ENTIRE firebaseConfig OBJECT WITH YOUR COPIED CODE 🛑
const firebaseConfig = {
  apiKey: "AIzaSyDoQbd-4NEy06CPRebys3BWYL-ojTL1msE",
  authDomain: "pinpoint-travel-map-6731d.firebaseapp.com",
  databaseURL: "https://pinpoint-travel-map-6731d-default-rtdb.firebaseio.com",
  projectId: "pinpoint-travel-map-6731d",
  storageBucket: "pinpoint-travel-map-6731d.firebasestorage.app",
  messagingSenderId: "497738752405",
  appId: "1:497738752405:web:c2244fe2b1b4f761b6969c"
};
// 🛑 ------------------------------------------------------------- 🛑

// Initialize Firebase with your secret keys
const app = initializeApp(firebaseConfig);

// Initialize the Database and Auth services so we can use them in App.jsx
export const db = getDatabase(app);
export const auth = getAuth(app); // 🌟 NEW: Export auth to use in App.jsx