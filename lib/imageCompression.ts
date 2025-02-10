import imageCompression from 'browser-image-compression';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function compressImage(file: File) {
 const options = {
    maxSizeMB: 2, // Increased from 1MB to 2MB
    maxWidthOrHeight: 2048, // Increased from 1920 to 2048
    useWebWorker: true,
    initialQuality: 0.8, // Added initial quality setting (0-1)
    preserveExif: true // Preserve image metadata
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
}

export async function uploadImage(file: File, path: string) {
  try {
    const compressedFile = await compressImage(file);
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, compressedFile);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

export interface UploadProgress {
  file: string;
  progress: number;
  status: 'compressing' | 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

export async function uploadMultipleImages(
  files: File[], 
  basePath: string,
  onProgress?: (progress: UploadProgress[]) => void
) {
  const progress: UploadProgress[] = files.map(file => ({
    file: file.name,
    progress: 0,
    status: 'compressing'
  }));

  const updateProgress = (index: number, update: Partial<UploadProgress>) => {
    progress[index] = { ...progress[index], ...update };
    onProgress?.(progress);
  };

  const uploadPromises = files.map(async (file, index) => {
    try {
      // Compress image
      updateProgress(index, { status: 'compressing', progress: 0 });
      const compressedFile = await compressImage(file);
      updateProgress(index, { progress: 50 });

      // Upload to Firebase
      updateProgress(index, { status: 'uploading' });
      const path = `${basePath}/${Date.now()}-${index}-${file.name}`;
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, compressedFile);
      const downloadURL = await getDownloadURL(snapshot.ref);

      updateProgress(index, { 
        status: 'completed', 
        progress: 100,
        url: downloadURL 
      });

      return downloadURL;
    } catch (error: any) {
      updateProgress(index, { 
        status: 'error',
        error: error.message,
        progress: 0 
      });
      throw error;
    }
  });

  return Promise.all(uploadPromises);
}
