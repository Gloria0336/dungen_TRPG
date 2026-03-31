import type { InventoryItem, EnemyState, PlayerState, WeaponDef } from '../types';
import { getAllBodySkills } from '../data/skills';
import { getRandomWeaponByTier, getWeaponTierForFloor } from '../data/weapons';
import { percentCheck, randomInt } from './diceEngine';
import { CLASS_DB } from '../data/classes';
import { POTION_DB } from '../data/potions';

// ============================================================
// Loot Engine - drops, gold, growth after combat victory
// ============================================================

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

  const cats = ['weapon', 'armor_upper', 'material', 'potion'] as const;
  const cat = cats[Math.floor(Math.random() * cats.length)];
  const quality = floor >= 15 ? '高階' : floor >= 8 ? '精製' : '粗製';
  const id = `DROP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  if (cat === 'weapon') {
    const weaponDef = getRandomWeaponByTier(getWeaponTierForFloor(floor));
    if (weaponDef) {
      return createWeaponDrop(weaponDef, id);
    }
    return {
      id,
      name: `${quality}武器`,
      type: 'weapon',
      quantity: 1,
      equipStatus: 'Inventory',
      equipSlot: 'Weapon',
      durability: 100,
      durabilityMax: 100,
      atk: randomInt(8, 12) + Math.floor(floor * 0.8),
      tierSteps: { '100_80': 0, '79_60': -2, '59_30': -5, '30_0': -8 },
    };
  }

  if (cat === 'armor_upper') {
    return {
      id,
      name: `${quality}護甲`,
      type: 'armor_upper',
      quantity: 1,
      equipStatus: 'Inventory',
      equipSlot: 'Upper',
      durability: 100,
      durabilityMax: 100,
      drU: randomInt(8, 14) + Math.floor(floor * 0.5),
      tierSteps: { '100_80': 0, '79_60': -2, '59_30': -5, '30_0': -8 },
    };
  }

  if (cat === 'material') {
    return {
      id,
      name: ['修補布', '粗製皮革', '金屬片'][Math.floor(Math.random() * 3)],
      type: 'material',
      quantity: randomInt(1, 2),
      equipStatus: 'Inventory',
    };
  }

  const potionEntries = Object.values(POTION_DB).filter((p) => p.itemType === 'potion');
  const def = potionEntries[Math.floor(Math.random() * potionEntries.length)];
  return {
    id,
    name: def.templateName,
    type: 'potion',
    quantity: 1,
    equipStatus: 'Inventory',
    stateChanges: def.stateChanges,
    effectSummary: def.effectSummary,
  };
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
    if (percentCheck(chance, '同伴習得技能').success) {
      const avail = classDef.newSkillRule.unlockList.filter((sid) => !player.skills.some((s) => s.id === sid));
      if (avail.length > 0) {
        player.skills.push({
          id: avail[0],
          name: avail[0].replace(/SK-\w+-/, ''),
          type: '技能',
          spCost: 20,
          effectSummary: '新技能尚未定義完整效果。',
          hitRule: '命中 65%',
          cooldown: 2,
        });
        changes.push(`習得新技能 ${avail[0]}`);
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
