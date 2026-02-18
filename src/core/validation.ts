import type { Card, Print, ProposalPayload } from './types';

export function isValidSetCode(setCode: string): boolean {
  return /^[A-Z0-9]{2,8}-[A-Z0-9]{2,6}$/i.test(setCode);
}

export function validateCard(card: Partial<Card>): string[] {
  const errors: string[] = [];
  if (!card.name?.trim()) errors.push('Card name is required.');
  if (!card.type?.trim()) errors.push('Card type is required.');
  if (card.atk !== undefined && (card.atk < 0 || card.atk > 9999)) errors.push('ATK must be 0..9999');
  if (card.def !== undefined && (card.def < 0 || card.def > 9999)) errors.push('DEF must be 0..9999');
  if (card.level_rank_link !== undefined && (card.level_rank_link < 0 || card.level_rank_link > 13)) {
    errors.push('Level/Rank/Link must be 0..13');
  }
  return errors;
}

export function validatePrint(print: Partial<Print>): string[] {
  const errors: string[] = [];
  if (!print.setCode || !isValidSetCode(print.setCode)) errors.push('Invalid setCode format (expected ABC-123 style).');
  return errors;
}

export function validateProposalPayload(payload: ProposalPayload): string[] {
  const errors: string[] = [];
  if (!payload.diff?.newValues || Object.keys(payload.diff.newValues).length === 0) {
    errors.push('Proposal diff.newValues cannot be empty.');
  }
  if (payload.confidence !== undefined && payload.confidence < 0.15) {
    errors.push('Very low OCR confidence proposal must be manually reviewed.');
  }
  const maybeName = payload.diff.newValues.name;
  if (typeof maybeName === 'string' && maybeName.trim().length < 2) {
    errors.push('Name looks invalid/too short.');
  }
  return errors;
}
