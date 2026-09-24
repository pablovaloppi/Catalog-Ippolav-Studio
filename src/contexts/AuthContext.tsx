import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { auth } from '../firebaseAuth';
import { setAnalyticsExclusion } from '../services/analyticsService';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check if user is an admin by querying the admins collection
        try {
          const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
          const hasAdminAccess = adminDoc.exists() || currentUser.email === 'pablovaloppi@gmail.com';
          setIsAdmin(hasAdminAccess);
          if (hasAdminAccess) {
            setAnalyticsExclusion(true);
          }
        } catch (error) {
          console.error("Error checking admin status", error);
          const hasAdminAccess = currentUser.email === 'pablovaloppi@gmail.com';
          setIsAdmin(hasAdminAccess);
          if (hasAdminAccess) {
            setAnalyticsExclusion(true);
          }
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

