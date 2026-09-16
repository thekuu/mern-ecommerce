import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const storage = getStorage(app);

/**
 * Uploads a local image File to Firebase Cloud Storage and returns its public HTTPS download URL
 */
export async function uploadImageToFirebase(file: File, folder = 'products'): Promise<string> {
  const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const path = `${folder}/${Date.now()}_${cleanName}`;
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}
