import type { GameState, InventoryItem, PlayerState, WeaponDef } from '../types';
import { CLASS_DB, PROTAGONIST_CLASS } from '../data/classes';
import { EQUIPMENT_DB } from '../data/equipment';
import { POTION_DB } from '../data/potions';
import { buildBodySkillRuntime } from '../data/skills';
import { getRandomWeaponByTier, getWeaponDef } from '../data/weapons';
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

  const p001 = POTION_DB['IT-POT-001'];
  const p002 = POTION_DB['IT-POT-002'];
  const initialInventory = [
    { id: `INIT-POT001-${Math.random().toString(36).slice(2,6)}`, name: p001.templateName, type: p001.itemType, quantity: 2, equipStatus: 'Inventory' as const, stateChanges: p001.stateChanges, effectSummary: p001.effectSummary },
    { id: `INIT-POT002-${Math.random().toString(36).slice(2,6)}`, name: p002.templateName, type: p002.itemType, quantity: 2, equipStatus: 'Inventory' as const, stateChanges: p002.stateChanges, effectSummary: p002.effectSummary },
  ];

  return {
    runId,
    phase: 'INIT',
    floor: 1,
    maxFloor: 20,
    players: null,
    inventory: initialInventory,
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
    pendingBodySkillDrop: null,
  };
}

export function initializePlayer(classId: string, name: string, index: number): PlayerState {
  const cls = CLASS_DB[classId];
  if (!cls) throw new Error(`Unknown class: ${classId}`);

  const player: PlayerState = {
    name: name || `角色${index + 1}`,
    classId,
    className: cls.className,
    role: 'companion',
    isProtagonist: false,
    hp: cls.baseHp,
    maxHp: cls.baseHp,
    baseMaxHp: cls.baseHp,
    sp: cls.baseSp,
    maxSp: cls.baseSp,
    baseMaxSp: cls.baseSp,
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
    weaponSkillSlots: [],
    bodySkillSlots: [null, null],
    protagonistWeaponId: null,
    statPoints: 0,
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

export function initializeProtagonist(name: string): PlayerState {
  const starterWeapon = getRandomWeaponByTier(1) ?? getWeaponDef('WPN-IRON-SWORD');
  if (!starterWeapon) throw new Error('Missing starter protagonist weapon');

  const player: PlayerState = {
    name: name || '主角',
    classId: PROTAGONIST_CLASS.id,
    className: PROTAGONIST_CLASS.className,
    role: 'protagonist',
    isProtagonist: true,
    hp: PROTAGONIST_CLASS.baseHp,
    maxHp: PROTAGONIST_CLASS.baseHp,
    baseMaxHp: PROTAGONIST_CLASS.baseHp,
    sp: PROTAGONIST_CLASS.baseSp,
    maxSp: PROTAGONIST_CLASS.baseSp,
    baseMaxSp: PROTAGONIST_CLASS.baseSp,
    des: PROTAGONIST_CLASS.baseDes,
    str: PROTAGONIST_CLASS.autoStats.STR,
    agi: PROTAGONIST_CLASS.autoStats.AGI,
    wil: PROTAGONIST_CLASS.autoStats.WIL,
    drPercent: 0,
    skillDrPercent: 0,
    flatDr: 0,
    ampPercent: 0,
    drU: 0,
    drL: 0,
    upperDurability: 100,
    lowerDurability: 100,
    isControlled: false,
    controlTurns: 0,
    controlImmunity: false,
    controlImmunityTurns: 0,
    statusEffects: [],
    skills: [],
    weaponSkillSlots: [],
    bodySkillSlots: [null, null],
    protagonistWeaponId: starterWeapon.id,
    statPoints: 0,
    backgroundTags: [],
    narrativeTags: [],
    absoluteCounter: assignAbsoluteCounter(),
    isAlive: true,
    isBD: false,
    equippedWeapon: createWeaponInventoryItem(starterWeapon),
    equippedUpper: null,
    equippedLower: null,
  };

  synthesizeProtagonistSkills(player);
  recalculatePlayerStats(player);
  return player;
}

export function createInventoryItemFromDef(def: any): any {
  return {
    id: `INIT-${def.id}-${Math.random().toString(36).slice(2, 6)}`,
    templateId: def.id,
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

export function createWeaponInventoryItem(
  def: WeaponDef,
  equipStatus: InventoryItem['equipStatus'] = 'Equipped',
): InventoryItem {
  return {
    id: `${equipStatus === 'Equipped' ? 'INIT' : 'WPN'}-${def.id}-${Math.random().toString(36).slice(2, 6)}`,
    templateId: def.id,
    name: def.name,
    type: 'weapon',
    quantity: 1,
    equipStatus,
    equipSlot: 'Weapon',
    durability: 100,
    durabilityMax: 100,
    atk: def.atk,
    ampPercent: def.ampPercent,
    flatDr: def.flatDr,
  };
}

function getBodySkillLevel(player: PlayerState, skillId: string): number {
  return player.bodySkillSlots.find((slot) => slot?.skillId === skillId)?.level ?? 0;
}

export function synthesizeProtagonistSkills(player: PlayerState): void {
  if (!player.isProtagonist) return;

  const cooldownById = new Map<string, number>(
    player.skills.map((skill) => [skill.id, skill.currentCooldown ?? 0]),
  );

  const weaponDef = player.protagonistWeaponId ? getWeaponDef(player.protagonistWeaponId) : undefined;
  const weaponSkills = weaponDef
    ? weaponDef.skills.map((skill) => ({ ...skill, currentCooldown: cooldownById.get(skill.id) ?? 0 }))
    : [];

  const bodySkills = player.bodySkillSlots
    .filter((slot): slot is NonNullable<typeof slot> => slot !== null)
    .map((slot) => {
      const skill = buildBodySkillRuntime(slot.skillId, slot.level);
      return { ...skill, currentCooldown: cooldownById.get(skill.id) ?? 0 };
    });

  const painResistBonus = getBodySkillLevel(player, 'BSK-PAIN-RESIST') * 12;
  player.maxHp = player.baseMaxHp + painResistBonus;
  player.maxSp = player.baseMaxSp;
  player.hp = Math.min(player.hp, player.maxHp);
  player.sp = Math.min(player.sp, player.maxSp);
  player.weaponSkillSlots = weaponSkills;
  player.skills = [...weaponSkills, ...bodySkills];
}

export function recalculatePlayerStats(player: PlayerState): void {
  if (player.baseMaxHp === undefined) player.baseMaxHp = player.maxHp;
  if (player.baseMaxSp === undefined) player.baseMaxSp = player.maxSp;
  if (player.isProtagonist) synthesizeProtagonistSkills(player);

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

export function equipProtagonistWeapon(
  player: PlayerState,
  weaponItem: InventoryItem,
): InventoryItem | null {
  if (!player.isProtagonist || weaponItem.type !== 'weapon' || !weaponItem.templateId) {
    return null;
  }

  const weaponDef = getWeaponDef(weaponItem.templateId);
  if (!weaponDef) return null;

  const previousWeapon = player.equippedWeapon
    ? { ...player.equippedWeapon, equipStatus: 'Inventory' as const }
    : null;

  player.equippedWeapon = {
    ...createWeaponInventoryItem(weaponDef),
    id: weaponItem.id,
  };
  player.protagonistWeaponId = weaponDef.id;
  recalculatePlayerStats(player);
  return previousWeapon;
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
    if (!data) return null;
    return hydrateGameState(JSON.parse(data));
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

function hydratePlayer(player: PlayerState, index: number): PlayerState {
  player.role = player.role ?? (player.isProtagonist ? 'protagonist' : 'companion');
  player.isProtagonist = player.isProtagonist ?? player.classId === PROTAGONIST_CLASS.id;
  player.baseMaxHp = player.baseMaxHp ?? player.maxHp;
  player.baseMaxSp = player.baseMaxSp ?? player.maxSp;
  player.weaponSkillSlots = player.weaponSkillSlots ?? [];
  player.bodySkillSlots = player.bodySkillSlots ?? [null, null];
  player.protagonistWeaponId = player.protagonistWeaponId ?? (player.isProtagonist ? player.equippedWeapon?.templateId ?? 'WPN-IRON-SWORD' : null);
  player.statPoints = player.statPoints ?? 0;
  player.controlImmunity = player.controlImmunity ?? false;
  player.controlImmunityTurns = player.controlImmunityTurns ?? 0;
  player.statusEffects = player.statusEffects ?? [];
  player.backgroundTags = player.backgroundTags ?? [];
  player.narrativeTags = player.narrativeTags ?? [];
  player.skills = player.skills ?? [];

  if (!player.isProtagonist) {
    player.role = 'companion';
    player.weaponSkillSlots = [];
    player.bodySkillSlots = [null, null];
    player.protagonistWeaponId = null;
    player.statPoints = 0;
  }

  if (!player.absoluteCounter) player.absoluteCounter = assignAbsoluteCounter();
  if (!player.equippedWeapon && player.isProtagonist) {
    const weaponDef = getWeaponDef(player.protagonistWeaponId ?? 'WPN-IRON-SWORD');
    if (weaponDef) player.equippedWeapon = createWeaponInventoryItem(weaponDef);
  }

  recalculatePlayerStats(player);
  if (!player.name) player.name = `角色${index + 1}`;
  return player;
}

function hydrateGameState(state: GameState): GameState {
  state.pendingBodySkillDrop = state.pendingBodySkillDrop ?? null;
  if (state.players) {
    state.players = [
      hydratePlayer(state.players[0], 0),
      hydratePlayer(state.players[1], 1),
    ];
  }
  return state;
}
