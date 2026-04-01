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
  | 'badEnd'
  | 'END';

export type MonsterTier = 'A' | 'B' | 'C';

export type DurabilityTarget = string;

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
export type SkillTargeting = 'self' | 'ally_single' | 'ally_all' | 'enemy_single' | 'enemy_all';
export type SkillActivation = 'active' | 'passive';
export type SkillCategory = 'class' | 'weapon' | 'body';
export type BodySkillCategory = 'passive' | 'self' | 'enemy' | 'ally';
export type PlayerRole = 'protagonist' | 'companion';
export type EffectStat = 'wil' | 'agi' | 'str' | 'hit' | 'evade' | 'hp' | 'skillDr' | 'amp' | 'desGain';
export type StatusEffectMechanic = 'statMod' | 'dot' | 'buff';
export type StatusEffectCategory = 'buff' | 'debuff' | 'blessing' | 'curse';

export interface SkillStatusPayload {
  name: string;
  duration?: number | null;
  effect: string;
  type: StatusEffectMechanic;
  category?: StatusEffectCategory;
  expiresOnBattleEnd?: boolean;
  removalCondition?: string;
  expiresAtFloor?: number | null;
  targetStat?: EffectStat;
  amount?: number;
}

export interface SkillFormula {
  damageMultiplier?: number;
  flatDamageBonus?: number;
  hitBonus?: number;
  baseHeal?: number;
  healScalingStat?: 'str' | 'agi' | 'wil';
  healScalingFactor?: number;
  restoreSp?: number;
  restoreSpScalingStat?: 'str' | 'agi' | 'wil';
  restoreSpScalingFactor?: number;
  restoreDes?: number;
  restoreDesScalingStat?: 'str' | 'agi' | 'wil';
  restoreDesScalingFactor?: number;
  lifeStealPercent?: number;
  ignoreDefense?: boolean;
  ignoreDrPercent?: boolean;
  controlTurns?: number;
  selfEffect?: SkillStatusPayload;
  targetEffect?: SkillStatusPayload;
}

// --- Skill ---

export interface Skill {
  id: string;
  name: string;
  type: string;
  spCost: number;
  effectSummary: string;
  hitRule: string;
  cooldown: number;
  targeting?: SkillTargeting;
  activation?: SkillActivation;
  category?: SkillCategory;
  level?: number;
  maxLevel?: number;
  formula?: SkillFormula;
  // runtime
  currentCooldown?: number;
}

// --- Monster Skill ---

export interface MonsterSkill {
  id: string;
  name: string;
  control: boolean;
  desSpImpactLevel: string;
  durabilityTarget: DurabilityTarget;
  hitRule: string;
  effectSummary: string;
  baseHit?: number; // parsed from hitRule
  cooldown: number;
  currentCooldown?: number;

  // --- Explicit Numerical Values ---
  damageMultiplier?: number; // ?瑕拿??嚗?閮?1.0
  controlTurns?: number;     // ?批?????賂??身 1
  desImpactAmount?: number;  // 蝎曄Ⅱ??DES 霈???憒??芣?靘? fallback ?啗?璈
  spDrainAmount?: number;    // 蝎曄Ⅱ??SP 霈???憒??芣?靘? fallback ?啗?璈
  durabilityDamage?: number; // 鋆???摨行皜蝷?

  specialEffects?: {
    type: StatusEffectMechanic;
    category?: StatusEffectCategory;
    expiresOnBattleEnd?: boolean;
    removalCondition?: string;
    targetStat?: 'wil' | 'agi' | 'str' | 'hit' | 'evade' | 'hp' | 'skillDr' | 'amp';
    amount: number;
    duration?: number | null;
  }[];
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
  initialEquipment?: string[];
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

export interface WeaponDef {
  id: string;
  name: string;
  tier: number;
  atk: number;
  ampPercent?: number;
  flatDr?: number;
  notes?: string;
  skills: [Skill, Skill];
}

export interface BodySkillDef {
  id: string;
  name: string;
  category: BodySkillCategory;
  effectSummary: string;
  maxLevel: number;
  targeting?: SkillTargeting;
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
  successStatusEffects?: SkillStatusPayload[];
  failStatusEffects?: SkillStatusPayload[];
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

export interface EquipSideEffect {
  trigger: 'onAttack' | 'onSkill' | 'onDefend' | 'onTurnEnd' | 'onTurnStart';
  effectType: 'hp' | 'sp' | 'des' | 'agi' | 'str' | 'wil';
  amount: number; // e.g. -5, +10
  description: string;
}

// --- Equipment Definition (DB) ---

export interface EquipmentDef {
  id: string;
  templateName: string;
  itemType: ItemType;
  atk?: number;
  ampPercent?: number; // % damage multiplier (e.g., 10 for +10%)
  flatDr?: number; // Flat damage reduction
  drU: number;
  drL: number;
  sideEffects?: EquipSideEffect[];
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
  templateId?: string;
  id: string;
  name: string;
  type: ItemType;
  quantity: number;
  equipStatus: EquipStatus;
  equipSlot?: EquipSlot;
  durability?: number;
  durabilityMax?: number;
  atk?: number;
  ampPercent?: number;
  flatDr?: number;
  drU?: number;
  drL?: number;
  sideEffects?: EquipSideEffect[];
  tierSteps?: {
    '100_80': number;
    '79_60': number;
    '59_30': number;
    '30_0': number;
  };
  stateChanges?: Record<string, number>;
  effectSummary?: string;
}

export interface BodySkillSlot {
  skillId: string;
  level: number;
}

export interface PlayerState {
  name: string;
  classId: string;
  className: string;
  role: PlayerRole;
  isProtagonist: boolean;
  hp: number;
  maxHp: number;
  baseMaxHp: number;
  sp: number;
  maxSp: number;
  baseMaxSp: number;
  des: number;
  str: number;
  agi: number;
  wil: number;
  drPercent: number; // calculated from drU + drL + tierSteps
  skillDrPercent: number; // DR from skills/status (multiplicative)
  flatDr: number; // Flat damage reduction
  ampPercent: number; // % damage multiplier
  drU: number;
  drL: number;
  upperDurability: number;
  lowerDurability: number;
  isControlled: boolean;
  controlTurns: number;
  controlSource?: string;
  outfitBreakControlTriggered: boolean;
  controlImmunity: boolean;
  controlImmunityTurns: number;
  statusEffects: StatusEffect[];
  skills: Skill[];
  weaponSkillSlots: Skill[];
  bodySkillSlots: [BodySkillSlot | null, BodySkillSlot | null];
  protagonistWeaponId: string | null;
  statPoints: number;
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
  duration?: number | null;
  effect: string;
  category?: StatusEffectCategory;
  expiresOnBattleEnd?: boolean;
  removalCondition?: string;
  expiresAtFloor?: number | null;
  // --- For explicit stat mods ---
  type?: StatusEffectMechanic;
  targetStat?: EffectStat;
  amount?: number;
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
  drPercent: number;
  skillDrPercent: number;
  flatDr: number;
  ampPercent: number;
  hit: number;
  evade: number;
  isControlled: boolean;
  controlTurns: number;
  controlSource?: string;
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
  companionBDTriggered?: boolean; // companion just hit DES=100 this turn
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

export interface PendingBodySkillDrop {
  skillId: string;
  sourceFloor: number;
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
  exploreRestCount: number;
  pendingBodySkillDrop: PendingBodySkillDrop | null;
  endReason?: 'protagonist_hp' | 'protagonist_des';
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
