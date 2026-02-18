import { useMemo } from 'react';
import { WebCameraService } from '../../services/cameraWeb';
import { TesseractOcrService } from '../../services/ocrTesseract';
import { IndexedDbStorageService } from '../../services/storageIndexedDb';
import { MockSyncService } from '../../services/sync';
import { BundleService } from '../../services/bundleService';
import { LocalMatchingAdapter } from '../../services/matchingAdapter';
import { MockAuthService } from '../../services/auth';
import { MockModerationService } from '../../services/moderation';

export function useServices() {
  return useMemo(() => {
    const storage = new IndexedDbStorageService();
    return {
      storage,
      camera: new WebCameraService(),
      ocr: new TesseractOcrService(),
      sync: new MockSyncService(),
      bundle: new BundleService(storage),
      matcher: new LocalMatchingAdapter(storage),
      auth: new MockAuthService(),
      moderation: new MockModerationService(),
    };
  }, []);
}
