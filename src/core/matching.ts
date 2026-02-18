import type { Alias, Card, ImageFeature, MatchCandidate, MatchResult, Print, ScanInput } from './types';
import { diceCoefficient } from './fuzzy';
import { hammingHex } from './imageHash';

export class MatchingService {
  constructor(private cards: Card[], private prints: Print[], private aliases: Alias[], private imageFeatures: ImageFeature[]) {}

  match(input: ScanInput): MatchResult {
    const visualCandidates = this.visualStage(input.visualHashFull, input.visualHashArt);
    const assisted = this.applyOcrAssist(visualCandidates, input.extractedSetCode, input.extractedName);
    const sorted = assisted.sort((a, b) => b.score - a.score);
    const top = sorted[0];
    return { top, alternatives: sorted.slice(1, 6), needsConfirmation: !top || top.score < 0.78 };
  }

  private visualStage(hashFull?: string, hashArt?: string): MatchCandidate[] {
    if (!hashFull && !hashArt) return [];
    const grouped = new Map<string, { full?: number; art?: number; cardId?: string; printId?: string }>();

    for (const f of this.imageFeatures) {
      const key = `${f.cardId ?? 'none'}:${f.printId ?? 'none'}`;
      const entry = grouped.get(key) ?? { cardId: f.cardId, printId: f.printId };
      if (hashFull && f.roiType === 'full_card') entry.full = hammingHex(hashFull, f.phash);
      if (hashArt && f.roiType === 'art_box') entry.art = hammingHex(hashArt, f.phash);
      grouped.set(key, entry);
    }

    const scored = [...grouped.values()]
      .map((g) => {
        const distFull = g.full ?? 64;
        const distArt = g.art ?? 64;
        const weightedDist = distFull * 0.65 + distArt * 0.35;
        const score = Math.max(0, 1 - weightedDist / 64);
        return { ...g, score, weightedDist };
      })
      .sort((a, b) => a.weightedDist - b.weightedDist)
      .slice(0, 20);

    return scored
      .map((s) => {
        const card = this.cards.find((c) => c.id === s.cardId);
        const print = s.printId ? this.prints.find((p) => p.printId === s.printId) : undefined;
        if (!card) return undefined;
        return { card, print, score: s.score, reason: 'visual' as const, details: `visual distance=${s.weightedDist.toFixed(2)}` };
      })
      .filter(Boolean) as MatchCandidate[];
  }

  private applyOcrAssist(candidates: MatchCandidate[], setCode?: string, name?: string): MatchCandidate[] {
    if (candidates.length === 0) {
      // fallback, still allow OCR-only manual assist if visual failed
      return this.ocrFallback(name, setCode);
    }

    for (const c of candidates) {
      if (setCode && c.print?.setCode?.toUpperCase() === setCode.toUpperCase()) {
        c.score = Math.min(1, c.score + 0.12);
        c.details = `${c.details}; set-code-confirmed`;
      } else if (setCode && c.print?.setCode && c.print.setCode.toUpperCase() !== setCode.toUpperCase()) {
        c.score = Math.max(0, c.score - 0.12);
        c.details = `${c.details}; set-code-conflict`;
      }

      if (name) {
        const n = diceCoefficient(name, c.card.name);
        if (n > 0.75) c.score = Math.min(1, c.score + 0.08);
      }
    }

    const max = Math.max(...candidates.map((x) => x.score));
    const second = [...candidates.map((x) => x.score)].sort((a, b) => b - a)[1] ?? 0;
    const gapBoost = Math.max(0, max - second) * 0.15;
    for (const c of candidates) if (c.score === max) c.score = Math.min(1, c.score + gapBoost);
    return candidates;
  }

  private ocrFallback(name?: string, setCode?: string): MatchCandidate[] {
    const results: MatchCandidate[] = [];
    if (setCode) {
      const p = this.prints.find((x) => x.setCode.toUpperCase() === setCode.toUpperCase());
      if (p) {
        const card = this.cards.find((c) => c.id === p.cardId);
        if (card) results.push({ card, print: p, score: 0.58, reason: 'set_code', details: 'visual unavailable; OCR assist fallback' });
      }
    }
    if (name) {
      for (const card of this.cards) {
        const s = diceCoefficient(name, card.name);
        if (s > 0.55) results.push({ card, score: 0.4 + s * 0.25, reason: 'ocr_name', details: 'visual unavailable; OCR fallback' });
      }
      for (const alias of this.aliases) {
        const s = diceCoefficient(name, alias.aliasText);
        if (s > 0.6) {
          const card = this.cards.find((c) => c.id === alias.cardId);
          if (card) results.push({ card, score: 0.38 + s * 0.24, reason: 'alias', details: 'visual unavailable; alias fallback' });
        }
      }
    }
    return results;
  }
}
