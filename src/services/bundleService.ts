import type { BundleIncludeOptions, IBundleService, IStorageService, LocalBundle } from './interfaces';

export class BundleService implements IBundleService {
  constructor(private storage: IStorageService) {}

  async exportToFile(include: BundleIncludeOptions): Promise<void> {
    const bundle = await this.storage.exportSnapshot(include);
    const content = JSON.stringify(bundle, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `ygo-scanner-bundle-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importFromFile(file: File, mode: 'replace' | 'merge'): Promise<void> {
    const text = await file.text();
    const bundle = JSON.parse(text) as LocalBundle;
    await this.storage.importSnapshot(bundle, mode);
  }
}
