import type { EquipmentDef } from '../types';

export const EQUIPMENT_DB: Record<string, EquipmentDef> = {
  'IT-ARM-U-001': {
    id: 'IT-ARM-U-001',
    templateName: '輕型護胸',
    itemType: 'armor_upper',
    drU: 14,
    drL: 0,
    durabilityMax: 100,
    tierSteps: { '100_80': 0, '79_60': -2, '59_30': -5, '30_0': -8 },
    repairNeeds: ['修補布x1'],
    equipSlot: 'Upper',
    notes: '輕甲，適合高機動或技能型職業',
    jailbreakNotes: '緊貼胸部的剪裁，使其更像是某種情趣束具而非護具。',
  },
  'IT-WEP-001': {
    id: 'IT-WEP-001',
    templateName: '初級鐵劍',
    itemType: 'weapon',
    atk: 10,
    drU: 0,
    drL: 0,
    durabilityMax: 100,
    tierSteps: { '100_80': 0, '79_60': -2, '59_30': -5, '30_0': -8 },
    repairNeeds: ['鐵礦石x1'],
    equipSlot: 'Weapon',
    notes: '基本武器',
    jailbreakNotes: '冰冷的劍身常用於調教，或作為暫時的擴張器材。',
  },
};

export function getEquipmentDef(id: string): EquipmentDef | undefined {
  return EQUIPMENT_DB[id];
}
