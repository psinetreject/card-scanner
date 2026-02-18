import type { Alias, Card, MatchCandidate, MatchResult, Print, ScanInput } from './types';
import { diceCoefficient } from './fuzzy';

export class MatchingService {
  constructor(private cards: Card[], private prints: Print[], private aliases: Alias[]) {}

  match(input: ScanInput): MatchResult {
    const candidates: MatchCandidate[] = [];

    if (input.extractedSetCode) {
      const normalized = input.extractedSetCode.toUpperCase().trim();
      this.prints
        .filter((p) => p.setCode.toUpperCase() === normalized)
        .forEach((print) => {
          const card = this.cards.find((c) => c.id === print.cardId);
          if (card) {
            candidates.push({ card, print, score: 0.98, reason: 'set_code' });
          }
        });
    }

    if (input.extractedName) {
      const name = input.extractedName;
      for (const card of this.cards) {
        const score = diceCoefficient(name, card.name);
        if (score > 0.45) {
          candidates.push({ card, score: 0.45 + score * 0.45, reason: 'ocr_name' });
        }
      }

      for (const alias of this.aliases) {
        const score = diceCoefficient(name, alias.aliasText);
        if (score > 0.5) {
          const card = this.cards.find((c) => c.id === alias.cardId);
          if (card) {
            candidates.push({ card, score: 0.42 + score * 0.42, reason: 'alias' });
          }
        }
      }
    }

    const deduped = new Map<string, MatchCandidate>();
    for (const candidate of candidates) {
      const key = `${candidate.card.id}:${candidate.print?.printId ?? 'base'}`;
      const prior = deduped.get(key);
      if (!prior || candidate.score > prior.score) {
        deduped.set(key, candidate);
      }
    }

    const sorted = [...deduped.values()].sort((a, b) => b.score - a.score);
    const top = sorted[0];
    return {
      top,
      alternatives: sorted.slice(1, 5),
      needsConfirmation: !top || top.score < 0.84,
    };
  }
}
