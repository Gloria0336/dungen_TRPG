import type { InventoryItem, EnemyState, PlayerState } from '../types';
import { percentCheck, randomInt } from './diceEngine';
import { CLASS_DB } from '../data/classes';

// ============================================================
// Loot Engine - drops, gold, growth after combat victory
// ============================================================

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
  const dropRoll = percentCheck(50, '額外掉落判定');
  if (!dropRoll.success) return null;

  const cats = ['weapon', 'armor_upper', 'material', 'potion'] as const;
  const cat = cats[Math.floor(Math.random() * cats.length)];
  const q = floor >= 15 ? '精良' : floor >= 8 ? '強化' : '普通';
  const id = `DROP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  if (cat === 'weapon') {
    return { id, name: `${q}武器`, type: 'weapon', quantity: 1, equipStatus: 'Inventory', equipSlot: 'Weapon', durability: 100, durabilityMax: 100, atk: randomInt(8, 12) + Math.floor(floor * 0.8), tierSteps: { '100_80': 0, '79_60': -2, '59_30': -5, '30_0': -8 } };
  }
  if (cat === 'armor_upper') {
    return { id, name: `${q}護甲`, type: 'armor_upper', quantity: 1, equipStatus: 'Inventory', equipSlot: 'Upper', durability: 100, durabilityMax: 100, drU: randomInt(8, 14) + Math.floor(floor * 0.5), tierSteps: { '100_80': 0, '79_60': -2, '59_30': -5, '30_0': -8 } };
  }
  if (cat === 'material') {
    return { id, name: ['修補布', '粗製皮革', '金屬片'][Math.floor(Math.random() * 3)], type: 'material', quantity: randomInt(1, 2), equipStatus: 'Inventory' };
  }
  return { id, name: Math.random() > 0.5 ? '微型生命藥水' : '精神安定劑', type: 'potion', quantity: 1, equipStatus: 'Inventory' };
}

export function processGrowth(player: PlayerState, floor: number): string[] {
  const changes: string[] = [];
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
  player.maxHp += hpG; player.hp += hpG;
  player.maxSp += spG; player.sp += spG;
  changes.push(`最大HP +${hpG}`, `最大SP +${spG}`);

  // New skill
  if (classDef.newSkillRule) {
    const chance = parseInt(classDef.newSkillRule.chance);
    if (percentCheck(chance, '新技能學習').success) {
      const avail = classDef.newSkillRule.unlockList.filter(sid => !player.skills.some(s => s.id === sid));
      if (avail.length > 0) {
        player.skills.push({ id: avail[0], name: avail[0].replace(/SK-\w+-/, ''), type: '技能', spCost: 20, effectSummary: '新習得技能', hitRule: '基礎命中65%', cooldown: 2 });
        changes.push(`習得新技能: ${avail[0]}`);
      }
    }
  }
  return changes;
}
