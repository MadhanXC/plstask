"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { UserData, UserRole } from "@/types/user";

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role?: UserRole) => Promise<void>;
  signIn: (email: string, password: string, attemptedRole: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Set up auth state observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData({
              uid: user.uid,
              email: user.email!,
              name: data.name,
              role: data.role || 'user',
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const ensureUserDocument = async (user: User, name: string, role: UserRole = 'user') => {
    const userDocRef = doc(db, "users", user.uid);
    
    try {
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        const userData = {
          email: user.email,
          name,
          role,
          createdAt: new Date(),
        };
        await setDoc(userDocRef, userData);
        return userData;
      }
      
      return userDoc.data();
    } catch (error) {
      console.error("Error ensuring user document:", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string, role: UserRole = 'user') => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userData = await ensureUserDocument(userCredential.user, name, role);
      setUser(userCredential.user);
      setUserData({
        uid: userCredential.user.uid,
        email: userCredential.user.email!,
        name: userData.name,
        role: userData.role || 'user',
      });
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please sign in instead.');
      }
      throw new Error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string, attemptedRole: UserRole) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const userDocRef = doc(db, "users", userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await signOut(auth);
        throw new Error("Account not properly set up. Please contact support.");
      }

      const userData = userDoc.data();
      const actualRole = userData.role || 'user';

      if (attemptedRole === 'admin' && actualRole !== 'admin') {
        await signOut(auth);
        throw new Error("Invalid admin credentials. Please use the User Account tab.");
      } else if (attemptedRole === 'user' && actualRole === 'admin') {
        await signOut(auth);
        throw new Error("Please use the Admin Account tab to sign in.");
      }

      setUser(userCredential.user);
      setUserData({
        uid: userCredential.user.uid,
        email: userCredential.user.email!,
        name: userData.name,
        role: actualRole,
      });
    } catch (error: any) {
      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error("Error signing out after failed sign in:", signOutError);
      }

      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error("Invalid email id or password. Please try again.");
      }
      
      if (error.message.includes("Please use the")) {
        throw error;
      }
      
      throw new Error("Invalid email id or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setUserData(null);
    } catch (error) {
      console.error("Error during logout:", error);
      throw new Error("Failed to log out. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, signUp, signIn, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);