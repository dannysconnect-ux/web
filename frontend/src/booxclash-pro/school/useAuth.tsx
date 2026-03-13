// src/hooks/useAuth.tsx
import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../firebase'; // Import from your config file
import { doc, getDoc } from 'firebase/firestore';

interface AuthUser extends User {
  schoolId?: string;
  role?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, fetch extra details (like schoolId) from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const customUser: AuthUser = {
              ...firebaseUser,
              schoolId: data.schoolId || null,
              role: data.role || 'teacher'
            };
            setUser(customUser);
          } else {
            // User exists in Auth but not DB (rare edge case)
            setUser(firebaseUser as AuthUser);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUser(firebaseUser as AuthUser);
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}