import type { Alias, Card, FeaturePack, ImageFeature, Print } from '../core/types';

const now = new Date().toISOString();

export const seedCards: Card[] = [
  { id: 'c1', name: 'Blue-Eyes White Dragon', type: 'Monster', attribute: 'LIGHT', level_rank_link: 8, atk: 3000, def: 2500, text: 'This legendary dragon is a powerful engine of destruction.', archetype: 'Blue-Eyes', imageKey: 'img-blueeyes', updatedAt: now, version: 1 },
  { id: 'c2', name: 'Dark Magician', type: 'Monster', attribute: 'DARK', level_rank_link: 7, atk: 2500, def: 2100, text: 'The ultimate wizard in terms of attack and defense.', archetype: 'Dark Magician', imageKey: 'img-darkmagician', updatedAt: now, version: 1 },
  { id: 'c3', name: 'Mystical Space Typhoon', type: 'Spell', text: 'Target 1 Spell/Trap on the field; destroy that target.', updatedAt: now, version: 1, imageKey: 'img-mst' },
  { id: 'c4', name: 'Elemental HERO Stratos', type: 'Monster', attribute: 'WIND', level_rank_link: 4, atk: 1800, def: 300, text: 'When this card is Normal or Special Summoned...', archetype: 'HERO', imageKey: 'img-stratos', updatedAt: now, version: 1 },
];

export const seedPrints: Print[] = [
  { printId: 'p1', cardId: 'c1', setCode: 'SDK-001', setName: 'Starter Deck Kaiba', rarity: 'Ultra Rare', edition: '1st', language: 'en', releaseDate: '2002-03-29', updatedAt: now, version: 1 },
  { printId: 'p2', cardId: 'c2', setCode: 'SDY-006', setName: 'Starter Deck Yugi', rarity: 'Ultra Rare', edition: 'Unlimited', language: 'en', releaseDate: '2002-03-29', updatedAt: now, version: 1 },
  { printId: 'p3', cardId: 'c3', setCode: 'MRL-047', setName: 'Magic Ruler', rarity: 'Super Rare', edition: '1st', language: 'en', releaseDate: '2002-09-16', updatedAt: now, version: 1 },
  { printId: 'p4', cardId: 'c4', setCode: 'CT07-EN006', setName: 'Collector Tin 2010', rarity: 'Secret Rare', edition: 'Limited', language: 'en', releaseDate: '2010-08-31', updatedAt: now, version: 1 },
];

export const seedAliases: Alias[] = [
  { aliasId: 'a1', cardId: 'c1', aliasText: 'Blue Eyes', locale: 'en', updatedAt: now, version: 1 },
  { aliasId: 'a2', cardId: 'c2', aliasText: 'DM', locale: 'en', updatedAt: now, version: 1 },
  { aliasId: 'a3', cardId: 'c3', aliasText: 'MST', locale: 'en', updatedAt: now, version: 1 },
  { aliasId: 'a4', cardId: 'c4', aliasText: 'Stratos', locale: 'en', updatedAt: now, version: 1 },
];

export const seedFeaturePacks: FeaturePack[] = [
  { packId: 'base-core', name: 'Base Core Pack', description: 'Starter offline pack for MVP demo cards.', bytesEstimate: 22000, status: 'installed', installedAt: now },
  { packId: 'set-expanded', name: 'Expanded Set Pack', description: 'Additional set-oriented features (mock).', bytesEstimate: 125000, status: 'available' },
];

export const seedImageFeatures: ImageFeature[] = [
  { featureId: 'f1', cardId: 'c1', printId: 'p1', phash: '8f0f0f0ff0f0f0f0', width: 320, height: 466, roiType: 'full_card', packId: 'base-core', updatedAt: now, version: 1 },
  { featureId: 'f2', cardId: 'c1', printId: 'p1', phash: 'f0f08f8f7070f0f0', width: 256, height: 192, roiType: 'art_box', packId: 'base-core', updatedAt: now, version: 1 },
  { featureId: 'f3', cardId: 'c2', printId: 'p2', phash: '00ff0f0ff0f00fff', width: 320, height: 466, roiType: 'full_card', packId: 'base-core', updatedAt: now, version: 1 },
  { featureId: 'f4', cardId: 'c2', printId: 'p2', phash: 'f0a0a0f0f0a0a0f0', width: 256, height: 192, roiType: 'art_box', packId: 'base-core', updatedAt: now, version: 1 },
  { featureId: 'f5', cardId: 'c3', printId: 'p3', phash: '3f3f0f0f0f0f3f3f', width: 320, height: 466, roiType: 'full_card', packId: 'base-core', updatedAt: now, version: 1 },
  { featureId: 'f6', cardId: 'c4', printId: 'p4', phash: 'f00ff00ff00ff00f', width: 320, height: 466, roiType: 'full_card', packId: 'base-core', updatedAt: now, version: 1 },
];
