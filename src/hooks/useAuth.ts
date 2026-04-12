import { useState, useEffect } from 'react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);



  const login = () => setAuthModalOpen(true);
  const logout = () => signOut(auth);
  
  const loginWithGoogle = async (selectedRole: string = 'citizen') => {
    const userCred = await signInWithPopup(auth, googleProvider);
    const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
    if (!userDoc.exists()) {
      const email = userCred.user.email || '';
      const finalRole = email === 'joydeepmondal9168j@gmail.com' ? 'admin' :
                       email === 'sourish@gmail.com' ? 'dev' : selectedRole;
      const newUserData = {
        uid: userCred.user.uid,
        email: userCred.user.email,
        displayName: userCred.user.displayName || '',
        photoURL: userCred.user.photoURL || '',
        role: finalRole,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', userCred.user.uid), newUserData);
      setUserData(newUserData);
    }
  };
  
  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signupWithEmail = async (email: string, pass: string, name: string, selectedRole: string = 'citizen') => {
    const userCred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(userCred.user, { displayName: name });
    
    const finalRole = email === 'joydeepmondal9168j@gmail.com' ? 'admin' :
                     email === 'sourish@gmail.com' ? 'dev' : selectedRole;
                     
    const newUserData = {
      uid: userCred.user.uid,
      email: userCred.user.email,
      displayName: name,
      photoURL: userCred.user.photoURL || '',
      role: finalRole,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', userCred.user.uid), newUserData);
    setUserData(newUserData);
    setUser({ ...userCred.user, displayName: name } as FirebaseUser);
  };

  return { 
    user, userData, loading, 
    login, logout,
    isAuthModalOpen, setAuthModalOpen,
    loginWithGoogle, loginWithEmail, signupWithEmail
  };
}
