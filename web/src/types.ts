// ============================================================
// Core Type Definitions for Dungeon TRPG
// ============================================================

// --- Enums & Literals ---

export type Phase =
  | 'INIT'
  | 'CUSTOM'
  | 'EXPLORE'
  | 'COMBAT'
  | 'EVENT'
  | 'REST'
  | 'SHOP'
  | 'SPECIAL'
  | 'END';

export type MonsterTier = 'A' | 'B' | 'C';

export type DurabilityTarget = '上' | '下' | '雙' | '無';

export type EquipSlot = 'Weapon' | 'Upper' | 'Lower' | 'Accessory';

export type EquipStatus = 'Equipped' | 'Inventory' | 'Broken';

export type ItemType =
  | 'weapon'
  | 'armor_upper'
  | 'armor_lower'
  | 'accessory'
  | 'material'
  | 'potion';

export type CounterType = 'normal' | 'absolute';

// --- Skill ---

export interface Skill {
  id: string;
  name: string;
  type: '普攻' | '技能';
  spCost: number;
  effectSummary: string;
  hitRule: string;
  cooldown: number;
  // runtime
  currentCooldown?: number;
}

// --- Monster Skill ---

export interface MonsterSkill {
  id: string;
  name: string;
  control: boolean;
  desSpImpactLevel: '低' | '中' | '高' | '極高';
  durabilityTarget: DurabilityTarget;
  hitRule: string;
  effectSummary: string;
  baseHit?: number; // parsed from hitRule
}

// --- Class Definition (DB) ---

export interface SPWeightRule {
  condition: string;
  hitMod: number;
}

export interface DurabilityDRProfile {
  drU: number;
  drL: number;
  tierSteps: {
    '100_80': number;
    '79_60': number;
    '59_30': number;
    '30_0': number;
  };
  repairMaterial: string[];
}

export interface GrowthRule {
  description: string;
  stats: Record<string, string>;
}

export interface ClassDef {
  id: string;
  className: string;
  roleTags: string[];
  autoStats: { STR: number; AGI: number; WIL: number };
  baseHp: number;
  baseSp: number;
  baseDes: number;
  spWeightRule: SPWeightRule[];
  skillList: Skill[];
  growthRule: GrowthRule;
  newSkillRule: { chance: string; unlockList: string[] };
  durabilityDRProfile: DurabilityDRProfile;
  backgroundGuidelines: { theme: string };
  jailbreakGuidelines?: {
    appearanceBias: string;
    bodyBias: string;
    theme: string;
  };
}

// --- Monster Definition (DB) ---

export interface MonsterDef {
  id: string;
  templateName: string;
  tier: MonsterTier;
  familyTag: string;
  baseStats: {
    hp: number;
    atk: number;
    hit: number;
    evade: number;
  };
  skillSet: MonsterSkill[];
  behaviorRules: string[];
  jailbreakBehavior?: string[];
  hiddenTrigger: {
    condition: string;
    chance: string; // "5%" or "10%"
    result: string;
  } | null;
  scalingHint: string;
}

// --- Event Definition (DB) ---

export interface EventOption {
  id: string;
  label: string;
  requiredCheck: string;
  successEffects: string;
  failEffects: string;
}

export interface EventDef {
  id: string;
  templateName: string;
  phase: string;
  triggerContext: string;
  eventType: string;
  descriptionStub: string[];
  jailbreakDescription?: string[];
  options: EventOption[];
  combatSpawn: { monsterId: string; count: number } | null;
  stateChanges: string[];
}

// --- Equipment Definition (DB) ---

export interface EquipmentDef {
  id: string;
  templateName: string;
  itemType: ItemType;
  atk?: number;
  drU: number;
  drL: number;
  durabilityMax: number;
  tierSteps: {
    '100_80': number;
    '79_60': number;
    '59_30': number;
    '30_0': number;
  };
  repairNeeds: string[];
  equipSlot: EquipSlot;
  notes: string;
  jailbreakNotes?: string;
}

// --- Potion/Item Definition (DB) ---

export interface PotionDef {
  id: string;
  templateName: string;
  itemType: ItemType;
  effectSummary: string;
  stateChanges: Record<string, number>;
  shopPrice: number;
  usePhase: Phase[];
  notes: string;
  jailbreakNotes?: string;
}

// --- Counter Definition (DB) ---

export interface CounterDef {
  id: string;
  monsterFamily: string[];
  targetClass: string[];
  counterType: CounterType;
  numericalEffects: {
    hitRate?: number;
    damage?: number;
    desDelta?: number;
    spDelta?: number;
    drDelta?: number;
    duration: string;
  };
  narrativePreferenceTags: string[];
  counterReason: string[];
  jailbreakReason?: string[];
  backgroundHooks: string[];
}

// --- Special Progression (DB) ---

export interface SpecialProgressionDef {
  id: string;
  name: string;
  applicablePhase: string;
  entrySource: string;
  baseTurnLimit: number;
  structure: Record<
    string,
    {
      focus: string;
      allowedActions: string[];
      notes?: string;
    }
  >;
  earlyExit: {
    description: string;
    checkType: string;
    checkRule: string;
    successTransition: string;
  };
  postLimitTransition?: {
    onExceed: string;
    description: string;
  };
  possibleOutcomes?: Record<string, string>;
  narrativeTags: string[];
  systemNotes?: string[];
}

// --- Runtime State ---

export interface InventoryItem {
  id: string;
  name: string;
  type: ItemType;
  quantity: number;
  equipStatus: EquipStatus;
  equipSlot?: EquipSlot;
  durability?: number;
  durabilityMax?: number;
  atk?: number;
  drU?: number;
  drL?: number;
  tierSteps?: {
    '100_80': number;
    '79_60': number;
    '59_30': number;
    '30_0': number;
  };
}

export interface PlayerState {
  name: string;
  classId: string;
  className: string;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  des: number;
  str: number;
  agi: number;
  wil: number;
  drPercent: number;
  drU: number;
  drL: number;
  upperDurability: number;
  lowerDurability: number;
  isControlled: boolean;
  controlTurns: number;
  controlImmunity: boolean;
  controlImmunityTurns: number;
  statusEffects: StatusEffect[];
  skills: Skill[];
  backgroundTags: string[];
  narrativeTags: string[];
  absoluteCounter: string | null; // family_tag
  isAlive: boolean;
  isBD: boolean; // Bad End state
  equippedWeapon: InventoryItem | null;
  equippedUpper: InventoryItem | null;
  equippedLower: InventoryItem | null;
  // Biography fields
  race?: string;
  age?: string;
  appearance?: string;
  background?: string;
  biography?: string;
}

export interface StatusEffect {
  name: string;
  duration: number;
  effect: string;
}

export interface EnemyState {
  instanceId: string; // e.g. "A-1_1"
  defId: string; // reference to MonsterDef.id
  templateName: string;
  tier: MonsterTier;
  familyTag: string;
  hp: number;
  maxHp: number;
  atk: number;
  hit: number;
  evade: number;
  isControlled: boolean;
  controlTurns: number;
  statusEffects: StatusEffect[];
  skills: MonsterSkill[];
  behaviorRules: string[];
  hiddenTrigger: MonsterDef['hiddenTrigger'];
  isAlive: boolean;
  // combat tracking
  controlResistCount: number; // for anti-stunlock
}

export interface DiceResult {
  purpose: string;
  attribute?: string;
  threshold: number;
  roll: number;
  success: boolean;
  effects: string;
}

export interface CombatAction {
  type: 'attack' | 'skill' | 'defend' | 'item' | 'flee';
  skillId?: string;
  itemId?: string;
  targetId?: string; // enemy instanceId
  playerIndex: number; // 0 or 1
}

export interface TurnAction {
  entityId: string;
  entityName: string;
  isPlayer: boolean;
  playerIndex?: number;
  agi: number;
}

export interface CombatState {
  turnOrder: TurnAction[];
  roundNumber: number;
  expectedRounds: number; // soft turn limit
  softPenalty: number; // evade penalty
  pendingResults: CombatTurnResult[];
  isComplete: boolean;
  waitingForPlayer: number | null; // which player needs input, null = enemy turn
}

export interface CombatTurnResult {
  actorName: string;
  actorIsPlayer: boolean;
  targetName: string;
  action: string;
  diceResults: DiceResult[];
  damageDealt: number;
  hpChange: number;
  spChange: number;
  desChange: number;
  upperChange: number;
  lowerChange: number;
  controlApplied: boolean;
  controlDuration: number;
  narrative: string; // filled by AI
}

export interface GameLogEntry {
  timestamp: number;
  phase: Phase;
  floor: number;
  round?: number;
  type: 'system' | 'combat' | 'event' | 'narrative' | 'dice' | 'state_change';
  text: string;
  diceResult?: DiceResult;
}

export interface GameState {
  runId: string;
  phase: Phase;
  floor: number;
  maxFloor: number;
  players: [PlayerState, PlayerState] | null;
  inventory: InventoryItem[];
  gold: number;
  enemies: EnemyState[];
  combat: CombatState | null;
  currentEvent: EventDef | null;
  shopFloors: [number, number]; // 2 random merchant floors
  shopVisited: boolean[];
  dbCache: Record<string, string>;
  currentRestrictions: {
    disabledActions: string[];
    diceModifiers: string[];
  };
  specialTurn: number | null;
  specialMaxTurn: number | null;
  nsgEnabled: boolean;
  runCustomNotes: string;
  log: GameLogEntry[];
  stateHistory: GameStateSnapshot[];
  narrativeHistory: NarrativeEntry[];
}

export interface GameStateSnapshot {
  timestamp: number;
  round: number;
  floor: number;
  phase: Phase;
  state: string; // JSON serialized partial state
}

export interface NarrativeEntry {
  timestamp: number;
  phase: Phase;
  floor: number;
  summary: string; // compressed summary for AI context
  fullText: string;
}

// --- Config ---

export interface GameConfig {
  apiKey: string;
  modelId: string;
  modelName: string;
  nsgEnabled: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  contextLength: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
}
