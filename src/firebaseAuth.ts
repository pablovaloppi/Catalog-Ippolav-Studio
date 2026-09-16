import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { app } from './firebase';

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
