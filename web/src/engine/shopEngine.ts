import type { InventoryItem, WeaponDef } from '../types';
import { getRandomWeaponByTier, getWeaponTierForFloor } from '../data/weapons';

// Shop engine

// ============================================================
// Shop Engine - merchant scheduling, inventory, pricing
// ============================================================

function createShopWeaponItem(def: WeaponDef, floor: number): InventoryItem {
  return {
    id: `SH-W-${floor}-${def.id}`,
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

export function determineShopFloors(): [number, number] {
  const pool: number[] = [];
  for (let i = 6; i <= 18; i++) pool.push(i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return [pool[0], pool[1]].sort((a, b) => a - b) as [number, number];
}

export function generateShopInventory(floor: number): { item: InventoryItem; price: number }[] {
  const quality = floor >= 15 ? '高階' : floor >= 8 ? '精製' : '旅用';
  const weaponDef = getRandomWeaponByTier(getWeaponTierForFloor(floor));
  const weaponItem = weaponDef
    ? createShopWeaponItem(weaponDef, floor)
    : {
        id: `SH-W-${floor}`,
        name: `${quality}武器`,
        type: 'weapon' as const,
        quantity: 1,
        equipStatus: 'Inventory' as const,
        equipSlot: 'Weapon' as const,
        atk: 10 + Math.floor(floor * 1.2),
        durability: 100,
        durabilityMax: 100,
        tierSteps: { '100_80': 0, '79_60': -2, '59_30': -5, '30_0': -8 },
      };

  const items: { item: InventoryItem; price: number }[] = [
    { item: { id: `SH-HP-${floor}`, name: `${quality}生命藥水`, type: 'potion', quantity: 3, equipStatus: 'Inventory' }, price: Math.round(15 * (1 + floor * 0.1)) },
    { item: { id: `SH-SP-${floor}`, name: `${quality}精神安定劑`, type: 'potion', quantity: 2, equipStatus: 'Inventory' }, price: Math.round(25 * (1 + floor * 0.1)) },
    { item: { id: `SH-M1-${floor}`, name: '修補布', type: 'material', quantity: 5, equipStatus: 'Inventory' }, price: 10 },
    { item: { id: `SH-M2-${floor}`, name: '粗製皮革', type: 'material', quantity: 3, equipStatus: 'Inventory' }, price: 15 },
    { item: weaponItem, price: Math.round((30 + getWeaponTierForFloor(floor) * 14) * (1 + floor * 0.15)) },
    { item: { id: `SH-AU-${floor}`, name: `${quality}護胸`, type: 'armor_upper', quantity: 1, equipStatus: 'Inventory', equipSlot: 'Upper', drU: 10 + Math.floor(floor * 0.8), durability: 100, durabilityMax: 100, tierSteps: { '100_80': 0, '79_60': -2, '59_30': -5, '30_0': -8 } }, price: Math.round(25 * (1 + floor * 0.15)) },
  ];
  return items;
}
