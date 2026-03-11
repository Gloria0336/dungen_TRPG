import type { GameState, PlayerState } from '../types';
import { CLASS_DB } from '../data/classes';
import { EQUIPMENT_DB } from '../data/equipment';
import { determineShopFloors } from './shopEngine';
import { assignAbsoluteCounter } from './counterEngine';
import { calculateDR } from './combatEngine';

// ============================================================
// State Manager - game state CRUD, save/load, rollback
// ============================================================

const STORAGE_KEY = 'dungen_trpg_save';

export function createNewRun(): GameState {
  const runId = `R-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const shopFloors = determineShopFloors();

  return {
    runId,
    phase: 'INIT',
    floor: 1,
    maxFloor: 20,
    players: null,
    inventory: [],
    gold: 0,
    enemies: [],
    combat: null,
    currentEvent: null,
    shopFloors,
    shopVisited: [false, false, false],
    dbCache: {},
    currentRestrictions: { disabledActions: [], diceModifiers: [] },
    specialTurn: null,
    specialMaxTurn: null,
    nsgEnabled: true,
    runCustomNotes: '',
    log: [],
    stateHistory: [],
    narrativeHistory: [],
    exploreRestCount: 0,
  };
}

export function initializePlayer(classId: string, name: string, index: number): PlayerState {
  const cls = CLASS_DB[classId];
  if (!cls) throw new Error(`Unknown class: ${classId}`);

  const player: PlayerState = {
    name: name || `角色${index + 1}`,
    classId,
    className: cls.className,
    hp: cls.baseHp,
    maxHp: cls.baseHp,
    sp: cls.baseSp,
    maxSp: cls.baseSp,
    des: cls.baseDes,
    str: cls.autoStats.STR,
    agi: cls.autoStats.AGI,
    wil: cls.autoStats.WIL,
    drPercent: 0,
    skillDrPercent: 0,
    flatDr: 0,
    ampPercent: 0,
    drU: cls.durabilityDRProfile.drU,
    drL: cls.durabilityDRProfile.drL,
    upperDurability: 100,
    lowerDurability: 100,
    isControlled: false,
    controlTurns: 0,
    controlImmunity: false,
    controlImmunityTurns: 0,
    statusEffects: [],
    skills: cls.skillList.map(s => ({ ...s, currentCooldown: 0 })),
    backgroundTags: [],
    narrativeTags: [],
    absoluteCounter: assignAbsoluteCounter(),
    isAlive: true,
    isBD: false,
    equippedWeapon: null,
    equippedUpper: null,
    equippedLower: null,
  };

  // Add initial equipment if defined
  if (cls.initialEquipment) {
    for (const eqId of cls.initialEquipment) {
      const def = EQUIPMENT_DB[eqId];
      if (def) {
        const item = createInventoryItemFromDef(def);
        if (def.equipSlot === 'Weapon') player.equippedWeapon = item;
        else if (def.equipSlot === 'Upper') player.equippedUpper = item;
        else if (def.equipSlot === 'Lower') player.equippedLower = item;
      }
    }
  }

  player.drPercent = calculateDR(player);
  recalculatePlayerStats(player);
  return player;
}

export function createInventoryItemFromDef(def: any): any {
  return {
    id: `INIT-${def.id}-${Math.random().toString(36).slice(2, 6)}`,
    name: def.templateName,
    type: def.itemType,
    quantity: 1,
    equipStatus: 'Equipped',
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

export function recalculatePlayerStats(player: PlayerState): void {
  // Reset flat bonuses
  player.flatDr = 0;
  player.ampPercent = 0;

  // Sum up from equipment
  const equips = [player.equippedWeapon, player.equippedUpper, player.equippedLower];
  for (const eq of equips) {
    if (eq) {
      if (eq.flatDr) player.flatDr += eq.flatDr;
      if (eq.ampPercent) player.ampPercent += eq.ampPercent;
    }
  }

  // Update DR based on durabilities and equips
  player.drPercent = calculateDR(player);
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Save failed:', e);
  }
}

export function loadGame(): GameState | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function deleteSave(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasSave(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

export function addLogEntry(
  state: GameState,
  type: GameState['log'][0]['type'],
  text: string
): void {
  state.log.push({
    timestamp: Date.now(),
    phase: state.phase,
    floor: state.floor,
    type,
    text,
  });
  // Keep log manageable (raised limit for FULL log viewing)
  if (state.log.length > 50000) {
    state.log = state.log.slice(-48000);
  }
}

export function createSnapshot(state: GameState): void {
  state.stateHistory.push({
    timestamp: Date.now(),
    round: state.combat?.roundNumber ?? 0,
    floor: state.floor,
    phase: state.phase,
    state: JSON.stringify({
      players: state.players,
      inventory: state.inventory,
      gold: state.gold,
      enemies: state.enemies,
    }),
  });
  if (state.stateHistory.length > 50) {
    state.stateHistory = state.stateHistory.slice(-30);
  }
}
