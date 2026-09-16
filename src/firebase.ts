import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAsn7iuVc6HczgGo3Pa84VUJRm8_0UEfiY",
  authDomain: "ippolav-catalog.firebaseapp.com",
  projectId: "ippolav-catalog",
  storageBucket: "ippolav-catalog.firebasestorage.app",
  messagingSenderId: "850505594456",
  appId: "1:850505594456:web:1d2c0f27620d0f8cba3c2d"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

