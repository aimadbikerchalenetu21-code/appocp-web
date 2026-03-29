import {
  collection, addDoc, updateDoc, doc, setDoc, getDocs,
  onSnapshot, query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const FIREBASE_API_KEY = 'AIzaSyBqptWexrHqhfgo0o0QdF0Qns1ev35IrBM';

export const createResponsableAccount = async (email, password) => {
  const res = await fetch(
    `https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=${FIREBASE_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }) }
  );
  const data = await res.json();
  if (data.error) {
    if (data.error.message === 'EMAIL_EXISTS') throw new Error('EMAIL_EXISTS');
    throw new Error(data.error.message);
  }
  const uid = data.localId;
  await setDoc(doc(db, 'responsables', uid), { email, uid, createdAt: serverTimestamp() });
  return { uid, email };
};

export const registerAgent = async ({ uid, name, email }) => {
  await setDoc(doc(db, 'agents', uid), { uid, name, email, role: 'agent', createdAt: serverTimestamp() });
};

export const createTask = async (taskData, createdBy) => {
  return await addDoc(collection(db, 'tasks'), {
    ...taskData, createdBy, status: 'pending', createdAt: serverTimestamp(),
  });
};

export const updateTaskStatus = async (taskId, status, extraData = {}) => {
  const ref = doc(db, 'tasks', taskId);
  const update = { status, ...extraData };
  if (status === 'in-progress') update.startedAt = serverTimestamp();
  if (status === 'completed')   update.completedAt = serverTimestamp();
  if (status === 'blocked')     update.blockedAt = serverTimestamp();
  await updateDoc(ref, update);
};

export const subscribeToResponsableTasks = (email, callback) => {
  const q = query(collection(db, 'tasks'), where('assignedTo.email', '==', email));
  return onSnapshot(q, (snap) => {
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    callback(docs);
  });
};

export const subscribeToAgentTasks = (uid, callback) => {
  const q = query(collection(db, 'tasks'), where('createdBy.uid', '==', uid));
  return onSnapshot(q, (snap) => {
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    callback(docs);
  });
};

export const createNotification = async (agentUid, data) => {
  await addDoc(collection(db, 'notifications'), {
    userId: agentUid, ...data, read: false, createdAt: serverTimestamp(),
  });
};

export const subscribeToNotifications = (uid, callback) => {
  const q = query(collection(db, 'notifications'), where('userId', '==', uid));
  return onSnapshot(q, (snap) => {
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    callback(docs);
  });
};

export const markNotificationRead = async (id) => {
  await updateDoc(doc(db, 'notifications', id), { read: true });
};

export const getAllAgentNames = async () => {
  const snap = await getDocs(collection(db, 'agents'));
  return snap.docs.map((d) => d.data());
};
