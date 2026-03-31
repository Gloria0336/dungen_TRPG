import type { EnemyState, InventoryItem, ItemType, PlayerState, PotionDef, WeaponDef } from '../types';
import { CLASS_DB } from '../data/classes';
import { EQUIPMENT_DB } from '../data/equipment';
import { POTION_DB } from '../data/potions';
import { getAllBodySkills } from '../data/skills';
import { getRandomWeaponByTier } from '../data/weapons';
import { percentCheck, randomInt } from './diceEngine';

type LootBand = '1_5' | '6_10' | '11_15' | '16_19';
type LootTableKind = 'combat' | 'event_random' | 'event_common' | 'event_valuable';

interface WeightedReward {
  weight: number;
  create: (floor: number) => InventoryItem | null;
}

type LootTable = Record<LootTableKind, WeightedReward[]>;

const STACKABLE_ITEM_TYPES: ItemType[] = ['potion', 'material'];

const EVENT_ITEM_NAME_TO_TEMPLATE_ID: Record<string, string> = {
  治療藥水: 'IT-POT-001',
  解毒劑: 'IT-POT-ANTIDOTE',
  空瓶: 'IT-MAT-BOTTLE',
};

const UPPER_ARMOR_BY_BAND: Record<LootBand, string[]> = {
  '1_5': ['IT-ARM-U-001', 'IT-ARM-U-PRST', 'IT-ARM-U-MAGE', 'IT-ARM-U-FIGHT'],
  '6_10': ['IT-ARM-U-KNGT', 'IT-ARM-U-ASSN', 'IT-ARM-U-MSWD', 'IT-ARM-U-PIRT'],
  '11_15': ['IT-ARM-U-VAMP', 'IT-ARM-U-KNGT', 'IT-ARM-U-MSWD', 'IT-ARM-U-PIRT'],
  '16_19': ['IT-ARM-U-VAMP', 'IT-ARM-U-KNGT', 'IT-ARM-U-MSWD', 'IT-ARM-U-PIRT'],
};

const LOWER_ARMOR_BY_BAND: Record<LootBand, string[]> = {
  '1_5': ['IT-ARM-L-PRST', 'IT-ARM-L-MAGE', 'IT-ARM-L-FIGHT'],
  '6_10': ['IT-ARM-L-KNGT', 'IT-ARM-L-ASSN', 'IT-ARM-L-MSWD', 'IT-ARM-L-PIRT'],
  '11_15': ['IT-ARM-L-VINE', 'IT-ARM-L-KNGT', 'IT-ARM-L-MSWD', 'IT-ARM-L-PIRT'],
  '16_19': ['IT-ARM-L-VINE', 'IT-ARM-L-KNGT', 'IT-ARM-L-MSWD', 'IT-ARM-L-PIRT'],
};

function buildDropId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function createWeaponDrop(def: WeaponDef, id: string): InventoryItem {
  return {
    id,
    templateId: def.id,
    name: def.name,
    type: 'weapon',
    quantity: 1,
    equipStatus: 'Inventory',
    equipSlot: 'Weapon',
    durability: 100,
    durabilityMax: 100,
    atk: def.atk,
    ampPercent: def.ampPercent,
    flatDr: def.flatDr,
  };
}

function createPotionItem(def: PotionDef, quantity = 1, prefix = 'DROP'): InventoryItem {
  return {
    id: buildDropId(prefix),
    templateId: def.id,
    name: def.templateName,
    type: def.itemType,
    quantity,
    equipStatus: 'Inventory',
    stateChanges: def.stateChanges,
    effectSummary: def.effectSummary,
  };
}

function createEquipmentItem(templateId: string): InventoryItem | null {
  const def = EQUIPMENT_DB[templateId];
  if (!def) return null;

  return {
    id: buildDropId('EQ'),
    templateId: def.id,
    name: def.templateName,
    type: def.itemType,
    quantity: 1,
    equipStatus: 'Inventory',
    equipSlot: def.equipSlot,
    durability: def.durabilityMax,
    durabilityMax: def.durabilityMax,
    atk: def.atk,
    ampPercent: def.ampPercent,
    flatDr: def.flatDr,
    drU: def.drU,
    drL: def.drL,
    sideEffects: def.sideEffects,
    tierSteps: def.tierSteps,
  };
}

function createPotionById(templateId: string, quantity = 1): InventoryItem | null {
  const def = POTION_DB[templateId];
  if (!def) return null;
  return createPotionItem(def, quantity, 'POT');
}

function createMaterialById(templateId: string, quantity = 1): InventoryItem | null {
  const def = POTION_DB[templateId];
  if (!def || def.itemType !== 'material') return null;
  return createPotionItem(def, quantity, 'MAT');
}

function createWeaponByTierRange(minTier: number, maxTier: number): InventoryItem | null {
  const tier = randomInt(minTier, maxTier);
  const def = getRandomWeaponByTier(tier);
  return def ? createWeaponDrop(def, buildDropId('WPN')) : null;
}

function createBandArmorDrop(
  band: LootBand,
  armorType: 'armor_upper' | 'armor_lower',
): InventoryItem | null {
  const ids = armorType === 'armor_upper' ? UPPER_ARMOR_BY_BAND[band] : LOWER_ARMOR_BY_BAND[band];
  return createEquipmentItem(randomFrom(ids));
}

function getLootBand(floor: number): LootBand {
  if (floor <= 5) return '1_5';
  if (floor <= 10) return '6_10';
  if (floor <= 15) return '11_15';
  return '16_19';
}

function pickWeightedReward(entries: WeightedReward[], floor: number): InventoryItem | null {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.create(floor);
    }
  }

  return entries[entries.length - 1]?.create(floor) ?? null;
}

const FLOOR_LOOT_TABLES: Record<LootBand, LootTable> = {
  '1_5': {
    combat: [
      { weight: 28, create: () => createPotionById('IT-POT-001') },
      { weight: 18, create: () => createPotionById('IT-POT-002') },
      { weight: 10, create: () => createPotionById('IT-POT-ANTIDOTE') },
      { weight: 16, create: () => createMaterialById('IT-MAT-001', randomInt(1, 2)) },
      { weight: 10, create: () => createMaterialById('IT-MAT-002', 1) },
      { weight: 8, create: () => createMaterialById('IT-MAT-BOTTLE', randomInt(1, 2)) },
      { weight: 6, create: (floor) => createBandArmorDrop(getLootBand(floor), 'armor_upper') },
      { weight: 4, create: (floor) => createBandArmorDrop(getLootBand(floor), 'armor_lower') },
    ],
    event_random: [
      { weight: 32, create: () => createPotionById('IT-POT-001') },
      { weight: 20, create: () => createPotionById('IT-POT-002') },
      { weight: 14, create: () => createPotionById('IT-POT-ANTIDOTE') },
      { weight: 18, create: () => createMaterialById('IT-MAT-001', randomInt(1, 2)) },
      { weight: 10, create: () => createMaterialById('IT-MAT-BOTTLE', 1) },
      { weight: 6, create: (floor) => createBandArmorDrop(getLootBand(floor), 'armor_upper') },
    ],
    event_common: [
      { weight: 38, create: () => createPotionById('IT-POT-001') },
      { weight: 18, create: () => createPotionById('IT-POT-ANTIDOTE') },
      { weight: 22, create: () => createMaterialById('IT-MAT-001', randomInt(1, 2)) },
      { weight: 14, create: () => createMaterialById('IT-MAT-002', 1) },
      { weight: 8, create: () => createMaterialById('IT-MAT-BOTTLE', 1) },
    ],
    event_valuable: [
      { weight: 20, create: () => createWeaponByTierRange(1, 2) },
      { weight: 22, create: (floor) => createBandArmorDrop(getLootBand(floor), 'armor_upper') },
      { weight: 16, create: (floor) => createBandArmorDrop(getLootBand(floor), 'armor_lower') },
      { weight: 18, create: () => createPotionById('IT-POT-003') },
      { weight: 12, create: () => createMaterialById('IT-MAT-002', randomInt(1, 2)) },
      { weight: 12, create: () => createMaterialById('IT-MAT-BOTTLE', 2) },
    ],
  },
  '6_10': {
    combat: [
      { weight: 20, create: () => createPotionById('IT-POT-001') },
      { weight: 18, create: () => createPotionById('IT-POT-002') },
      { weight: 10, create: () => createPotionById('IT-POT-ANTIDOTE') },
      { weight: 10, create: () => createPotionById('IT-POT-REP-01') },
      { weight: 14, create: () => createMaterialById('IT-MAT-001', randomInt(1, 2)) },
      { weight: 10, create: () => createMaterialById('IT-MAT-002', randomInt(1, 2)) },
      { weight: 8, create: () => createMaterialById('IT-MAT-INS-01', 1) },
      { weight: 5, create: (floor) => createBandArmorDrop(getLootBand(floor), 'armor_upper') },
      { weight: 5, create: (floor) => createBandArmorDrop(getLootBand(floor), 'armor_lower') },
    ],
    event_random: [
      { weight: 24, create: () => createPotionById('IT-POT-001') },
      { weight: 18, create: () => createPotionById('IT-POT-002') },
      { weight: 14, create: () => createPotionById('IT-POT-ANTIDOTE') },
      { weight: 10, create: () => createPotionById('IT-POT-REP-01') },
      { weight: 16, create: () => createMaterialById('IT-MAT-002', randomInt(1, 2)) },
      { weight: 10, create: () => createMaterialById('IT-MAT-INS-01', 1) },
      { weight: 8, create: (floor) => createBandArmorDrop(getLootBand(floor), 'armor_upper') },
    ],
    event_common: [
      { weight: 24, create: () => createPotionById('IT-POT-002') },
      { weight: 18, create: () => createPotionById('IT-POT-ANTIDOTE') },
      { weight: 16, create: () => createPotionById('IT-POT-001') },
      { weight: 16, create: () => createMaterialById('IT-MAT-002', randomInt(1, 2)) },
      { weight: 12, create: () => createMaterialById('IT-MAT-INS-01', 1) },
      { weight: 14, create: () => createMaterialById('IT-MAT-BOTTLE', randomInt(1, 2)) },
    ],
    event_valuable: [
      { weight: 22, create: () => createWeaponByTierRange(2, 3) },
      { weight: 18, create: (floor) => createBandArmorDrop(getLootBand(floor), 'armor_upper') },
      { weight: 16, create: (floor) => createBandArmorDrop(getLootBand(floor), 'armor_lower') },
      { weight: 14, create: () => createPotionById('IT-POT-003') },
      { weight: 14, create: () => createPotionById('IT-POT-REP-01') },
      { weight: 8, create: () => createMaterialById('IT-MAT-CRY-01', 1) },
      { weight: 8, create: () => createMaterialById('IT-MAT-INS-01', randomInt(1, 2)) },
    ],
  },
  '11_15': {
    combat: [
      { weight: 18, create: () => createPotionById('IT-POT-002') },
      { weight: 12, create: () => createPotionById('IT-POT-003') },
      { weight: 12, create: () => createPotionById('IT-POT-REP-01') },
      { weight: 12, create: () => createPotionById('IT-POT-ANTIDOTE') },
      { weight: 12, create: () => createMaterialById('IT-MAT-INS-01', randomInt(1, 2)) },
      { weight: 12, create: () => createMaterialById('IT-MAT-CRY-01', 1) },
      { weight: 10, create: () => createMaterialById('IT-MAT-SNK-01', 1) },
      { weight: 6, create: (floor) => createBandArmorDrop(getLootBand(floor), 'armor_upper') },
      { weight: 6, create: (floor) => createBandArmorDrop(getLootBand(floor), 'armor_lower') },
    ],
    event_random: [
      { weight: 18, create: () => createPotionById('IT-POT-002') },
      { weight: 18, create: () => createPotionById('IT-POT-003') },
      { weight: 14, create: () => createPotionById('IT-POT-REP-01') },
      { weight: 14, create: () => createPotionById('IT-POT-ANTIDOTE') },
      { weight: 12, create: () => createMaterialById('IT-MAT-INS-01', randomInt(1, 2)) },
      { weight: 12, create: () => createMaterialById('IT-MAT-CRY-01', 1) },
      { weight: 12, create: (floor) => createBandArmorDrop(getLootBand(floor), 'armor_upper') },
    ],
    event_common: [
      { weight: 20, create: () => createPotionById('IT-POT-003') },
      { weight: 18, create: () => createPotionById('IT-POT-ANTIDOTE') },
      { weight: 16, create: () => createPotionById('IT-POT-REP-01') },
      { weight: 16, create: () => createMaterialById('IT-MAT-CRY-01', 1) },
      { weight: 16, create: () => createMaterialById('IT-MAT-SNK-01', 1) },
      { weight: 14, create: () => createMaterialById('IT-MAT-BOTTLE', 2) },
    ],
    event_valuable: [
      { weight: 24, create: () => createWeaponByTierRange(3, 4) },
      { weight: 18, create: (floor) => createBandArmorDrop(getLootBand(floor), 'armor_upper') },
      { weight: 16, create: (floor) => createBandArmorDrop(getLootBand(floor), 'armor_lower') },
      { weight: 14, create: () => createPotionById('IT-POT-MOTH-01') },
      { weight: 14, create: () => createMaterialById('IT-MAT-SNK-01', 1) },
      { weight: 14, create: () => createMaterialById('IT-MAT-CRY-01', randomInt(1, 2)) },
    ],
  },
  '16_19': {
    combat: [
      { weight: 12, create: () => createPotionById('IT-POT-003') },
      { weight: 12, create: () => createPotionById('IT-POT-REP-01') },
      { weight: 12, create: () => createPotionById('IT-POT-MOTH-01') },
      { weight: 10, create: () => createPotionById('IT-POT-ANTIDOTE') },
      { weight: 12, create: () => createMaterialById('IT-MAT-CRY-01', randomInt(1, 2)) },
      { weight: 12, create: () => createMaterialById('IT-MAT-SNK-01', randomInt(1, 2)) },
      { weight: 8, create: () => createMaterialById('IT-MAT-BOTTLE', randomInt(1, 2)) },
      { weight: 11, create: (floor) => createBandArmorDrop(getLootBand(floor), 'armor_upper') },
      { weight: 11, create: (floor) => createBandArmorDrop(getLootBand(floor), 'armor_lower') },
    ],
    event_random: [
      { weight: 16, create: () => createPotionById('IT-POT-003') },
      { weight: 16, create: () => createPotionById('IT-POT-REP-01') },
      { weight: 14, create: () => createPotionById('IT-POT-MOTH-01') },
      { weight: 12, create: () => createPotionById('IT-POT-ANTIDOTE') },
      { weight: 14, create: () => createMaterialById('IT-MAT-CRY-01', randomInt(1, 2)) },
      { weight: 12, create: () => createMaterialById('IT-MAT-SNK-01', 1) },
      { weight: 16, create: (floor) => createBandArmorDrop(getLootBand(floor), 'armor_upper') },
    ],
    event_common: [
      { weight: 18, create: () => createPotionById('IT-POT-003') },
      { weight: 16, create: () => createPotionById('IT-POT-ANTIDOTE') },
      { weight: 16, create: () => createPotionById('IT-POT-REP-01') },
      { weight: 16, create: () => createMaterialById('IT-MAT-SNK-01', randomInt(1, 2)) },
      { weight: 16, create: () => createMaterialById('IT-MAT-CRY-01', randomInt(1, 2)) },
      { weight: 18, create: () => createMaterialById('IT-MAT-BOTTLE', 2) },
    ],
    event_valuable: [
      { weight: 28, create: () => createWeaponByTierRange(4, 5) },
      { weight: 20, create: (floor) => createBandArmorDrop(getLootBand(floor), 'armor_upper') },
      { weight: 18, create: (floor) => createBandArmorDrop(getLootBand(floor), 'armor_lower') },
      { weight: 14, create: () => createPotionById('IT-POT-MOTH-01') },
      { weight: 10, create: () => createMaterialById('IT-MAT-SNK-01', randomInt(1, 2)) },
      { weight: 10, create: () => createMaterialById('IT-MAT-CRY-01', randomInt(1, 2)) },
    ],
  },
};

export function addItemToInventory(inventory: InventoryItem[], item: InventoryItem): InventoryItem {
  if (STACKABLE_ITEM_TYPES.includes(item.type)) {
    const existing = inventory.find((entry) =>
      entry.type === item.type &&
      (entry.templateId ? entry.templateId === item.templateId : entry.name === item.name),
    );

    if (existing) {
      existing.quantity += item.quantity;
      return existing;
    }
  }

  inventory.push(item);
  return item;
}

export function findInventoryItemByTemplateId(
  inventory: InventoryItem[],
  templateId: string,
): InventoryItem | undefined {
  return inventory.find((item) => item.templateId === templateId && item.quantity > 0);
}

export function removeItemFromInventory(
  inventory: InventoryItem[],
  templateId: string,
  quantity = 1,
): boolean {
  const item = findInventoryItemByTemplateId(inventory, templateId);
  if (!item || item.quantity < quantity) return false;

  item.quantity -= quantity;
  if (item.quantity <= 0) {
    const index = inventory.indexOf(item);
    if (index >= 0) inventory.splice(index, 1);
  }
  return true;
}

export function createFixedEventItem(itemName: string, quantity = 1): InventoryItem | null {
  const templateId = EVENT_ITEM_NAME_TO_TEMPLATE_ID[itemName];
  if (!templateId) return null;

  const potionItem = createPotionById(templateId, quantity);
  if (potionItem) return potionItem;

  return createMaterialById(templateId, quantity);
}

export function hasEventRequirement(inventory: InventoryItem[], requirementText: string): boolean {
  const match = requirementText.match(/需持有\s+(.+)/);
  if (!match) return true;

  const itemName = match[1].trim();
  const templateId = EVENT_ITEM_NAME_TO_TEMPLATE_ID[itemName];
  if (!templateId) return false;

  return Boolean(findInventoryItemByTemplateId(inventory, templateId));
}

export function consumeEventItem(inventory: InventoryItem[], itemName: string, quantity = 1): boolean {
  const templateId = EVENT_ITEM_NAME_TO_TEMPLATE_ID[itemName];
  if (!templateId) return false;
  return removeItemFromInventory(inventory, templateId, quantity);
}

export function rollEventItemDrop(floor: number, kind: Exclude<LootTableKind, 'combat'>): InventoryItem | null {
  return pickWeightedReward(FLOOR_LOOT_TABLES[getLootBand(floor)][kind], floor);
}

export function generateGoldDrop(enemies: EnemyState[], floor: number): number {
  let base = 0;
  for (const e of enemies) {
    if (e.tier === 'A') base += randomInt(5, 15);
    else if (e.tier === 'B') base += randomInt(15, 35);
    else base += randomInt(50, 100);
  }
  return Math.round(base * (1 + floor * 0.1));
}

export function rollItemDrop(floor: number): InventoryItem | null {
  const dropRoll = percentCheck(50, '戰利品掉落');
  if (!dropRoll.success) return null;
  return pickWeightedReward(FLOOR_LOOT_TABLES[getLootBand(floor)].combat, floor);
}

export function processGrowth(player: PlayerState, floor: number): string[] {
  const changes: string[] = [];
  if (player.isProtagonist) return changes;

  const classDef = CLASS_DB[player.classId];
  if (!classDef) return changes;

  const stats: ('str' | 'agi' | 'wil')[] = ['str', 'agi', 'wil'];
  const numBoosts = Math.random() < 0.4 ? 2 : 1;
  for (let i = 0; i < numBoosts; i++) {
    const stat = stats[Math.floor(Math.random() * stats.length)];
    if (Math.random() < 0.5 + floor * 0.02) {
      player[stat] += 1;
      changes.push(`${stat.toUpperCase()} +1`);
    }
  }

  const fm = 1 + Math.floor(floor / 5) * 0.3;
  const hpG = randomInt(2, Math.round(6 * fm));
  const spG = randomInt(2, Math.round(5 * fm));
  player.baseMaxHp += hpG;
  player.maxHp += hpG;
  player.hp += hpG;
  player.baseMaxSp += spG;
  player.maxSp += spG;
  player.sp += spG;
  changes.push(`最大HP +${hpG}`, `最大SP +${spG}`);

  if (classDef.newSkillRule) {
    const chance = parseInt(classDef.newSkillRule.chance);
    if (percentCheck(chance, '夥伴技能成長').success) {
      const avail = classDef.newSkillRule.unlockList.filter((sid) => !player.skills.some((s) => s.id === sid));
      if (avail.length > 0) {
        player.skills.push({
          id: avail[0],
          name: avail[0].replace(/SK-\w+-/, ''),
          type: '主動',
          spCost: 20,
          effectSummary: '新技能尚未定義完整效果。',
          hitRule: '命中 65%',
          cooldown: 2,
        });
        changes.push(`學會新技能 ${avail[0]}`);
      }
    }
  }

  return changes;
}

export function rollBodySkillDrop(floor: number): string | null {
  const chance = Math.min(55, 28 + floor);
  if (!percentCheck(chance, '身體技能掉落').success) return null;

  const skills = getAllBodySkills();
  const picked = skills[Math.floor(Math.random() * skills.length)];
  return picked?.id ?? null;
}
