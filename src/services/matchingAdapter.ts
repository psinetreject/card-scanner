import { MatchingService } from '../core/matching';
import type { ScanInput } from '../core/types';
import type { IMatchingService, IStorageService } from './interfaces';

export class LocalMatchingAdapter implements IMatchingService {
  constructor(private storage: IStorageService) {}

  async run(input: ScanInput) {
    const [cards, prints, aliases] = await Promise.all([
      this.storage.getCacheCards(),
      this.storage.getCachePrints(),
      this.storage.getCacheAliases(),
    ]);
    const service = new MatchingService(cards, prints, aliases);
    return service.match(input);
  }
}
