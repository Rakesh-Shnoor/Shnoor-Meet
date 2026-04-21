import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCZvMJqqbXBhc92SzB4oH7cFoeOYXe3nYg",
  authDomain: "shnoor-meetings.firebaseapp.com",
  projectId: "shnoor-meetings",
  storageBucket: "shnoor-meetings.firebasestorage.app",
  messagingSenderId: "203026905637",
  appId: "1:203026905637:web:f7ca01ff4e14b7eeb91dcc",
  measurementId: "G-D0QS6GEJHW"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
