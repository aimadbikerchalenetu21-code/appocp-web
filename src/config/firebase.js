import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBqptWexrHqhfgo0o0QdF0Qns1ev35IrBM',
  authDomain: 'web-app-881a8.firebaseapp.com',
  projectId: 'web-app-881a8',
  storageBucket: 'web-app-881a8.firebasestorage.app',
  messagingSenderId: '1088855776731',
  appId: '1:1088855776731:web:7927d68a51776e5c15dbfe',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
