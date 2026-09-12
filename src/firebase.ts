import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

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
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.error("Firebase Login Error:", error);
    if (error.code === 'auth/unauthorized-domain') {
      alert(`Este dominio no está autorizado en Firebase. \n\nDebes agregar "${window.location.hostname}" en la lista de dominios autorizados en la Consola de Firebase -> Authentication -> Settings -> Authorized domains.`);
    } else {
      alert(`Error al iniciar sesión: ${error.message}`);
    }
    throw error;
  }
};
export const logout = () => signOut(auth);

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
