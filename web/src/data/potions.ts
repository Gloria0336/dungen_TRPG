import type { PotionDef, Phase } from '../types';

export const POTION_DB: Record<string, PotionDef> = {
  'IT-POT-001': {
    id: 'IT-POT-001',
    templateName: '微型生命藥水',
    itemType: 'potion',
    effectSummary: '回復 20 HP',
    stateChanges: { hp_delta: 20 },
    shopPrice: 15,
    usePhase: ['EXPLORE', 'REST', 'SHOP'] as Phase[],
    notes: '最基礎的治療物資',
    jailbreakNotes: '混有高度興奮成分，飲用後全身潮紅，身體變得極其敏感。',
  },
  'IT-POT-002': {
    id: 'IT-POT-002',
    templateName: '精神安定劑',
    itemType: 'potion',
    effectSummary: '回復 30 SP，DES -5',
    stateChanges: { sp_delta: 30, des_delta: -5 },
    shopPrice: 25,
    usePhase: ['EXPLORE', 'REST', 'SHOP'] as Phase[],
    notes: '穩定施法者或高壓力角色的重要藥劑',
    jailbreakNotes: '實際上是高度催淫的藥劑，用來將理智轉化為純粹的快感。',
  },
  'IT-MAT-001': {
    id: 'IT-MAT-001',
    templateName: '修補布',
    itemType: 'material',
    effectSummary: '用於修補布甲或輕甲',
    stateChanges: {},
    shopPrice: 10,
    usePhase: ['REST', 'SHOP'] as Phase[],
    notes: '防具維修耗材',
  },
  'IT-MAT-002': {
    id: 'IT-MAT-002',
    templateName: '粗製皮革',
    itemType: 'material',
    effectSummary: '用於修補中型護甲',
    stateChanges: {},
    shopPrice: 15,
    usePhase: ['REST', 'SHOP'] as Phase[],
    notes: '防具維修耗材',
  },
};

export function getPotionDef(id: string): PotionDef | undefined {
  return POTION_DB[id];
}
