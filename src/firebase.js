// messenger-app/src/firebase.js

import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAwDRFKfH3K7KahtJMVvvM0HBxB4eKzYwc",
  authDomain: "messenger-chat-c605f.firebaseapp.com",
  databaseURL: "https://messenger-chat-c605f-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "messenger-chat-c605f",
  storageBucket: "messenger-chat-c605f.firebasestorage.app",
  messagingSenderId: "476706574952",
  appId: "1:476706574952:web:8620248a3e0520ce8621dd",
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const auth = getAuth(app);
export const storage = getStorage(app);