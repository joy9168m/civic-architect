import { useState, useEffect } from 'react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [needsRegistration, setNeedsRegistration] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
            setNeedsRegistration(false);
          } else {
            setNeedsRegistration(true);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUserData(null);
        setNeedsRegistration(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const register = async (role: 'citizen' | 'admin' | 'dev') => {
    if (!user) return;
    const finalRole = user.email === 'sourish3108dps@gmail.com' ? 'dev' : role;
    const newUserData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: finalRole,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', user.uid), newUserData);
    setUserData(newUserData);
    setNeedsRegistration(false);
  };

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  return { user, userData, loading, needsRegistration, login, logout, register };
}
