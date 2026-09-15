import { uploadImageMock } from './mock/mockStorage';

export interface StorageService {
  uploadImage(file: File): Promise<string>;
  uploadFile(file: File): Promise<string>;
}

class UnifiedStorageService implements StorageService {
  async uploadImage(file: File): Promise<string> {
    return uploadImageMock(file);
  }

  async uploadFile(file: File): Promise<string> {
    return uploadImageMock(file);
  }
}

export const storageService = new UnifiedStorageService();
