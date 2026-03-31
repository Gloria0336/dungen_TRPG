import type {
  PlayerState, EnemyState, CombatState, CombatTurnResult,
  CombatAction, TurnAction, DiceResult, MonsterSkill, GameState,
  StatusEffect,
} from '../types';
import { hitCheck, evadeCheck, percentCheck, getSPWeightMod, randomFloat, randomInt, parseBaseHit } from './diceEngine';
import { getCounterEffects } from './counterEngine';
import { CLASS_DB } from '../data/classes';
import { getSkillTargeting } from './skillTargeting';

// ============================================================
// Combat Engine - handles all combat calculations
// ============================================================

/** Determine turn order by AGI (high to low) */
export function determineTurnOrder(
  players: [PlayerState, PlayerState],
  enemies: EnemyState[]
): TurnAction[] {
  const actions: TurnAction[] = [];

  players.forEach((p, i) => {
    if (p.isAlive && !p.isBD) {
      actions.push({
        entityId: `player-${i}`,
        entityName: `${p.name} (${p.className})`,
        isPlayer: true,
        playerIndex: i,
        agi: p.agi,
      });
    }
  });

  enemies.forEach((e) => {
    if (e.isAlive) {
      actions.push({
        entityId: e.instanceId,
        entityName: e.templateName,
        isPlayer: false,
        agi: Math.floor(e.evade / 3), // Use evade as rough AGI proxy
      });
    }
  });

  // Sort by AGI descending, break ties randomly
  actions.sort((a, b) => b.agi - a.agi || (Math.random() > 0.5 ? 1 : -1));
  return actions;
}

/** Get expected rounds for soft turn penalty based on highest tier enemy */
export function getExpectedRounds(enemies: EnemyState[]): number {
  const hasTierC = enemies.some((e) => e.tier === 'C');
  const hasTierB = enemies.some((e) => e.tier === 'B');
  if (hasTierC) return 8;
  if (hasTierB) return 6;
  return 4;
}

/** Calculate base ATK */
export function calculateATK(player: PlayerState): number {
  const weaponATK = player.equippedWeapon?.atk ?? 0;
  return Math.floor(player.str / 2) + weaponATK;
}

/** Calculate raw damage with random factor */
export function calculateRawDamage(atk: number): number {
  return Math.round(atk * randomFloat(0.9, 1.1));
}

/** 
 * Calculate final damage applying the new formula:
 * (Raw DMG) * (1 + Amp%) * (1 - DR%) * (1 - SkillDR%) - FlatDR
 */
export function calculateFinalDamage(
  rawDamage: number,
  ampPercent: number,
  drPercent: number,
  skillDrPercent: number,
  flatDr: number
): number {
  const amped = rawDamage * (1 + ampPercent / 100);
  const reduced = amped * (1 - drPercent / 100) * (1 - skillDrPercent / 100);
  return Math.max(1, Math.round(reduced - flatDr));
}

/** Calculate DR% for a player based on durability tiers */
export function calculateDR(player: PlayerState): number {
  const classDef = CLASS_DB[player.classId];
  if (player.isProtagonist || !classDef) {
    let drU = 0;
    let drL = 0;

    if (player.equippedUpper?.drU) {
      const eq = player.equippedUpper;
      const dur = eq.durability ?? 100;
      const steps = eq.tierSteps;
      let value = eq.drU ?? 0;
      if (steps) {
        if (dur <= 30) value += steps['30_0'];
        else if (dur <= 59) value += steps['59_30'];
        else if (dur <= 79) value += steps['79_60'];
        else value += steps['100_80'];
      }
      drU += value;
    }

    if (player.equippedLower?.drL) {
      const eq = player.equippedLower;
      const dur = eq.durability ?? 100;
      const steps = eq.tierSteps;
      let value = eq.drL ?? 0;
      if (steps) {
        if (dur <= 30) value += steps['30_0'];
        else if (dur <= 59) value += steps['59_30'];
        else if (dur <= 79) value += steps['79_60'];
        else value += steps['100_80'];
      }
      drL += value;
    }

    return Math.max(0, drU + drL + getPassiveDRBonus(player));
  }

  const profile = classDef.durabilityDRProfile;
  let drU = profile.drU;
  let drL = profile.drL;

  // Apply tier step reductions for Upper
  const upper = player.upperDurability;
  if (upper <= 30) drU += profile.tierSteps['30_0'];
  else if (upper <= 59) drU += profile.tierSteps['59_30'];
  else if (upper <= 79) drU += profile.tierSteps['79_60'];
  else drU += profile.tierSteps['100_80'];

  // Apply tier step reductions for Lower
  const lower = player.lowerDurability;
  if (lower <= 30) drL += profile.tierSteps['30_0'];
  else if (lower <= 59) drL += profile.tierSteps['59_30'];
  else if (lower <= 79) drL += profile.tierSteps['79_60'];
  else drL += profile.tierSteps['100_80'];

  // Equipment-based DR overrides if equipped
  if (player.equippedUpper && player.equippedUpper.drU) {
    const eq = player.equippedUpper;
    const dur = eq.durability ?? 100;
    const steps = eq.tierSteps ?? profile.tierSteps;
    let eqDR = eq.drU ?? 0;
    if (dur <= 30) eqDR += steps['30_0'];
    else if (dur <= 59) eqDR += steps['59_30'];
    else if (dur <= 79) eqDR += steps['79_60'];
    drU = Math.max(drU, eqDR);
  }

  return Math.max(0, drU + drL + getPassiveDRBonus(player));
}

/** Apply durability damage to player */
export function applyDurabilityDamage(
  player: PlayerState,
  target: MonsterSkill['durabilityTarget'],
  amount?: number
): { upperChange: number; lowerChange: number } {
  let upperChange = 0;
  let lowerChange = 0;
  const normalizedTarget = String(target ?? '').trim();

  const applyEquipmentChange = (
    equip: PlayerState['equippedUpper'] | PlayerState['equippedLower'],
    change: number,
  ) => {
    if (!equip || typeof equip.durability !== 'number') return;
    const maxDurability = equip.durabilityMax ?? 100;
    equip.durability = Math.max(0, Math.min(maxDurability, Math.round(equip.durability + change)));
  };

  switch (normalizedTarget) {
    case 'upper':
    case 'UPPER':
    case '上':
      upperChange = -(amount ?? 5) * 1.3;
      player.upperDurability = Math.max(0, player.upperDurability + upperChange);
      applyEquipmentChange(player.equippedUpper, upperChange);
      break;
    case 'lower':
    case 'LOWER':
    case '下':
      lowerChange = -(amount ?? 5) * 1.3;
      player.lowerDurability = Math.max(0, player.lowerDurability + lowerChange);
      applyEquipmentChange(player.equippedLower, lowerChange);
      break;
    case 'both':
    case 'BOTH':
    case '雙':
      upperChange = -(amount ?? 3) * 1.3;
      lowerChange = -(amount ?? 3) * 1.3;
      player.upperDurability = Math.max(0, player.upperDurability + upperChange);
      player.lowerDurability = Math.max(0, player.lowerDurability + lowerChange);
      applyEquipmentChange(player.equippedUpper, upperChange);
      applyEquipmentChange(player.equippedLower, lowerChange);
      break;
    case 'none':
    case 'NONE':
    case '無':
    case '无':
    default:
      break;
  }
  
  // Round changes to nearest integer
  upperChange = Math.round(upperChange);
  lowerChange = Math.round(lowerChange);
  player.upperDurability = Math.round(player.upperDurability);
  player.lowerDurability = Math.round(player.lowerDurability);

  // Recalculate DR after durability change
  player.drPercent = calculateDR(player);
  return { upperChange, lowerChange };
}

/** Apply side effects of equipment based on trigger */
export function applyEquipmentSideEffects(
  player: PlayerState,
  trigger: 'onAttack' | 'onSkill' | 'onDefend' | 'onTurnEnd' | 'onTurnStart',
  resultObj: CombatTurnResult // To push changes and narratives
): void {
  const equips = [player.equippedWeapon, player.equippedUpper, player.equippedLower];
  for (const eq of equips) {
    if (!eq || !eq.sideEffects) continue;
    
    for (const effect of eq.sideEffects) {
      if (effect.trigger === trigger) {
        // Apply effect
        let changeHandled = false;
        switch (effect.effectType) {
          case 'hp':
            player.hp = Math.max(0, Math.min(player.maxHp, player.hp + effect.amount));
            resultObj.hpChange += effect.amount;
            changeHandled = true;
            break;
          case 'sp':
            player.sp = Math.max(0, Math.min(player.maxSp, player.sp + effect.amount));
            resultObj.spChange += effect.amount;
            changeHandled = true;
            break;
          case 'des':
            player.des = Math.max(0, Math.min(100, player.des + effect.amount));
            resultObj.desChange += effect.amount;
            changeHandled = true;
            break;
          case 'agi':
            player.agi = Math.max(0, player.agi + effect.amount);
            changeHandled = true;
            break;
          case 'str':
            player.str = Math.max(0, player.str + effect.amount);
            changeHandled = true;
            break;
          case 'wil':
            player.wil = Math.max(0, player.wil + effect.amount);
            changeHandled = true;
            break;
        }
        
        if (changeHandled) {
           const logMsg = `[鋆??臭???- ${eq.name}] ${effect.description}`;
           resultObj.diceResults.push({
             purpose: '裝備副作用',
             threshold: 0, roll: 0, success: true,
             effects: logMsg
           });
        }
      }
    }
  }
}

/** Sum all active statusEffect modifiers for a given stat */
export function getStatusEffectMod(
  effects: StatusEffect[],
  stat: 'hit' | 'evade' | 'agi' | 'str' | 'wil' | 'hp'
): number {
  return effects
    .filter(se => se.type === 'statMod' && se.targetStat === stat)
    .reduce((sum, se) => sum + (se.amount ?? 0), 0);
}

function getBodySkillLevel(player: PlayerState, skillId: string): number {
  return player.bodySkillSlots.find((slot) => slot?.skillId === skillId)?.level ?? 0;
}

function getPlayerSPWeightMod(player: PlayerState): number {
  if (player.isProtagonist) {
    if (player.sp >= player.maxSp * 0.75) return 5;
    if (player.sp >= player.maxSp * 0.3) return 0;
    return -8;
  }

  const classDef = CLASS_DB[player.classId];
  return classDef ? getSPWeightMod(player.sp, classDef.spWeightRule) : 0;
}

function getPassiveDRBonus(player: PlayerState): number {
  return player.isProtagonist ? getBodySkillLevel(player, 'BSK-IRON-BODY') * 4 : 0;
}

function getPassiveEvadeBonus(player: PlayerState): number {
  return player.isProtagonist ? getBodySkillLevel(player, 'BSK-SWIFT-STEP') * 12 : 0;
}

function getPassiveAmpBonus(player: PlayerState): number {
  if (!player.isProtagonist) return 0;
  const furyLevel = getBodySkillLevel(player, 'BSK-BATTLE-FURY');
  if (furyLevel <= 0) return 0;
  return player.hp <= player.maxHp / 2 ? furyLevel * 8 : 0;
}

function getPassiveSpRegen(player: PlayerState): number {
  return player.isProtagonist ? getBodySkillLevel(player, 'BSK-MANA-FLOW') * 4 : 0;
}

function getPlayerTotalAmp(player: PlayerState): number {
  return player.ampPercent + getPassiveAmpBonus(player);
}

type TurnTargetRef =
  | { playerIndex: number }
  | { enemyId: string };

type StatusEffectCarrier = {
  statusEffects: StatusEffect[];
  skillDrPercent?: number;
  ampPercent?: number;
  agi?: number;
  str?: number;
  wil?: number;
};

function targetHasRemainingTurn(
  combat: CombatState | null | undefined,
  target: TurnTargetRef
): boolean {
  if (!combat) return false;

  return combat.turnOrder.some((turn) => {
    if ('playerIndex' in target) {
      return turn.isPlayer && turn.playerIndex === target.playerIndex;
    }
    return !turn.isPlayer && turn.entityId === target.enemyId;
  });
}

function adjustDurationForTurnOrder(
  baseDuration: number,
  combat: CombatState | null | undefined,
  target: TurnTargetRef
): number {
  return targetHasRemainingTurn(combat, target) ? baseDuration : baseDuration + 1;
}

function applyStatusEffect(
  target: StatusEffectCarrier,
  effect: StatusEffect
): void {
  target.statusEffects.push(effect);

  if (effect.type === 'statMod' && effect.targetStat && effect.amount) {
    if (effect.targetStat === 'agi' && typeof target.agi === 'number') {
      target.agi = Math.max(0, target.agi + effect.amount);
    }
    if (effect.targetStat === 'wil' && typeof target.wil === 'number') {
      target.wil = Math.max(0, target.wil + effect.amount);
    }
    if (effect.targetStat === 'str' && typeof target.str === 'number') {
      target.str = Math.max(0, target.str + effect.amount);
    }
  }

  if (effect.type === 'buff' && effect.targetStat === 'skillDr' && effect.amount && typeof target.skillDrPercent === 'number') {
    target.skillDrPercent = Math.max(-80, Math.min(80, target.skillDrPercent + effect.amount));
  }

  if (effect.type === 'buff' && effect.targetStat === 'amp' && effect.amount && typeof target.ampPercent === 'number') {
    target.ampPercent = Math.max(-80, Math.min(200, target.ampPercent + effect.amount));
  }
}

function removeExpiredStatusEffect(
  target: StatusEffectCarrier,
  effect: StatusEffect
): void {
  if (effect.type === 'statMod' && effect.targetStat && effect.amount) {
    if (effect.targetStat === 'agi' && typeof target.agi === 'number') {
      target.agi = Math.max(0, target.agi - effect.amount);
    }
    if (effect.targetStat === 'wil' && typeof target.wil === 'number') {
      target.wil = Math.max(0, target.wil - effect.amount);
    }
    if (effect.targetStat === 'str' && typeof target.str === 'number') {
      target.str = Math.max(0, target.str - effect.amount);
    }
  }

  if (effect.type === 'buff' && effect.targetStat === 'skillDr' && effect.amount && typeof target.skillDrPercent === 'number') {
    target.skillDrPercent = Math.max(-80, Math.min(80, target.skillDrPercent - effect.amount));
  }

  if (effect.type === 'buff' && effect.targetStat === 'amp' && effect.amount && typeof target.ampPercent === 'number') {
    target.ampPercent = Math.max(-80, Math.min(200, target.ampPercent - effect.amount));
  }
}

function makeAdjustedStatusEffect(
  effect: NonNullable<PlayerState['skills'][number]['formula']>['selfEffect'],
  combat: CombatState | null | undefined,
  target: TurnTargetRef,
): StatusEffect | null {
  if (!effect) return null;
  return {
    ...effect,
    duration: adjustDurationForTurnOrder(effect.duration, combat, target),
  };
}

function applyFormulaSelfEffects(
  skill: PlayerState['skills'][number],
  player: PlayerState,
  result: CombatTurnResult,
  combat: CombatState | null | undefined,
  playerIndex: number,
): void {
  const formula = skill.formula;
  if (!formula) return;

  if (formula.baseHeal) {
    const scaling = formula.healScalingStat ? player[formula.healScalingStat] * (formula.healScalingFactor ?? 0) : 0;
    const healAmount = Math.round(formula.baseHeal + scaling);
    const beforeHp = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + healAmount);
    result.hpChange += player.hp - beforeHp;
  }

  if (formula.restoreSp) {
    const beforeSp = player.sp;
    player.sp = Math.min(player.maxSp, player.sp + formula.restoreSp);
    result.spChange += player.sp - beforeSp;
  }

  if (skill.id === 'SK-FIGHT-RAGE') {
    applyStatusEffect(player, {
      name: `${skill.name}自損`,
      duration: 1,
      effect: 'SkillDR -10',
      type: 'buff',
      targetStat: 'skillDr',
      amount: -10,
    });
  }

  const selfEffect = makeAdjustedStatusEffect(formula.selfEffect, combat, { playerIndex });
  if (selfEffect) applyStatusEffect(player, selfEffect);
}

function executeFormulaAttack(
  skill: PlayerState['skills'][number],
  player: PlayerState,
  target: EnemyState,
  playerIndex: number,
  spMod: number,
  combat: CombatState | null | undefined,
  result: CombatTurnResult,
): void {
  const formula = skill.formula ?? {};
  const baseHit = parseBaseHit(skill.hitRule);
  const hitMod = getStatusEffectMod(player.statusEffects, 'hit');
  const hitResult = hitCheck(
    baseHit,
    spMod,
    0,
    hitMod + (formula.hitBonus ?? 0),
    `${player.name}: ${skill.name} ?賭葉瑼Ｗ?`,
  );
  result.diceResults.push(hitResult);
  if (!hitResult.success) return;

  const atk = calculateATK(player) + (formula.flatDamageBonus ?? 0);
  const rawDmg = Math.round(calculateRawDamage(atk) * (formula.damageMultiplier ?? 1.25));
  const finalDmg = calculateFinalDamage(
    rawDmg,
    getPlayerTotalAmp(player),
    formula.ignoreDefense || formula.ignoreDrPercent ? 0 : target.drPercent,
    formula.ignoreDefense ? 0 : target.skillDrPercent,
    formula.ignoreDefense ? 0 : target.flatDr,
  );

  result.damageDealt = finalDmg;
  target.hp = Math.max(0, target.hp - finalDmg);
  if (target.hp <= 0) target.isAlive = false;

  if (formula.lifeStealPercent) {
    const heal = Math.max(1, Math.round(finalDmg * (formula.lifeStealPercent / 100)));
    const beforeHp = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + heal);
    result.hpChange += player.hp - beforeHp;
  }

  if (formula.restoreSp) {
    const beforeSp = player.sp;
    player.sp = Math.min(player.maxSp, player.sp + formula.restoreSp);
    result.spChange += player.sp - beforeSp;
  }

  const selfEffect = makeAdjustedStatusEffect(formula.selfEffect, combat, { playerIndex });
  if (selfEffect) applyStatusEffect(player, selfEffect);

  const targetEffect = makeAdjustedStatusEffect(formula.targetEffect, combat, { enemyId: target.instanceId });
  if (targetEffect) applyStatusEffect(target, targetEffect);

  if (formula.controlTurns) {
    const controlChance = 35 + player.wil * 2 + (skill.level ?? 1) * 5;
    const controlResult = percentCheck(controlChance - target.controlResistCount * 20, '?批瑼Ｗ?');
    result.diceResults.push(controlResult);
    if (controlResult.success) {
      target.isControlled = true;
      target.controlTurns = adjustDurationForTurnOrder(formula.controlTurns, combat, { enemyId: target.instanceId });
      target.controlSource = `${player.name}[${skill.name}]`;
      target.controlResistCount++;
      result.controlApplied = true;
      result.controlDuration = target.controlTurns;
    }
  }
}

/** Get DES/SP impact amount by level */
function getImpactAmount(level: MonsterSkill['desSpImpactLevel']): number {
  if (level === 'low') return randomInt(3, 8);
  if (level === 'high') return randomInt(15, 25);
  if (level === 'extreme') return randomInt(25, 40);
  return randomInt(8, 15);
}

/** Choose enemy action based on behavior rules */
export function chooseEnemyAction(
  enemy: EnemyState,
  players: [PlayerState, PlayerState]
): { skill: MonsterSkill; targetPlayerIndex: number } {
  const alive = players.map((p, i) => ({ p, i })).filter((x) => x.p.isAlive && !x.p.isBD);
  if (alive.length === 0) {
    return { skill: enemy.skills[0], targetPlayerIndex: 0 };
  }

  // Pick target randomly among alive players
  const target = alive[Math.floor(Math.random() * alive.length)];

  // Skill selection based on behavior
  // Filter skills that are not on cooldown
  const availableSkills = enemy.skills.filter(s => !s.currentCooldown || s.currentCooldown <= 0);
  if (availableSkills.length === 0) {
    // If all skills are on cooldown (shouldn't happen with basic attacks), fallback to first skill
    return { skill: enemy.skills[0], targetPlayerIndex: target.i };
  }

  let chosenSkill = availableSkills[0];
  const behaviorStr = enemy.behaviorRules.join(' ');

  if (behaviorStr.includes('?批') && !target.p.isControlled) {
    const controlSkill = availableSkills.find((s) => s.control);
    if (controlSkill) chosenSkill = controlSkill;
  } else if (behaviorStr.includes('?批') && target.p.isControlled) {
    const damageSkill = availableSkills.find((s) => !s.control) ?? availableSkills[0];
    chosenSkill = damageSkill;
  }

  // Boss ultimate logic
  const ultSkill = availableSkills.find((s) => s.id.includes('ULT'));
  if (ultSkill && enemy.tier === 'C') {
    const hpPercent = enemy.hp / enemy.maxHp;
    if (hpPercent < 0.4) chosenSkill = ultSkill;
  }

  return { skill: chosenSkill, targetPlayerIndex: target.i };
}

/** Process a single enemy's attack against a player */
export function processEnemyAttack(
  enemy: EnemyState,
  player: PlayerState,
  skill: MonsterSkill,
  counterHitMod: number = 0,
  softPenalty: number = 0,
  _nsgEnabled: boolean = true,
  combat?: CombatState,
  targetPlayerIndex?: number
): CombatTurnResult {
  const result: CombatTurnResult = {
    actorName: enemy.templateName,
    actorIsPlayer: false,
    targetName: `${player.name}(${player.className})`,
    action: skill.name,
    diceResults: [],
    damageDealt: 0,
    hpChange: 0,
    spChange: 0,
    desChange: 0,
    upperChange: 0,
    lowerChange: 0,
    controlApplied: false,
    controlDuration: 0,
    narrative: '',
  };

  // Hit check
  const baseHit = skill.baseHit ?? parseBaseHit(skill.hitRule);
  const isAutoHit = player.isControlled && skill.hitRule.includes('敹葉');

  let hitResult: DiceResult;
  if (isAutoHit) {
    hitResult = {
      purpose: `${skill.name} ?賭葉?文?`,
      threshold: 100,
      roll: 1,
      success: true,
      effects: '目標被控制，攻擊自動命中',
    };
  } else {
    // Player's hit debuff makes enemy more likely to land
    const playerHitDebuff = getStatusEffectMod(player.statusEffects, 'hit');
    const enemyHitMod = getStatusEffectMod(enemy.statusEffects, 'hit');
    hitResult = hitCheck(
      baseHit,
      0,
      counterHitMod,
      enemyHitMod - playerHitDebuff,
      `${enemy.templateName}: ${skill.name} ?賭葉?文?`
    );
  }
  result.diceResults.push(hitResult);

  if (!hitResult.success) {
    // Check player dodge (apply evade status effect mod)
    const evadeMod = getStatusEffectMod(player.statusEffects, 'evade');
    const evadeResult = evadeCheck(
      Math.floor(player.agi * 3) + evadeMod + getPassiveEvadeBonus(player),
      player.isControlled,
      softPenalty,
      `${player.name} ??文?`
    );
    result.diceResults.push(evadeResult);
    if (evadeResult.success) {
      return result; // Dodge success, no damage
    }
  }

  if (hitResult.success) {
    // Calculate damage
    const damageMultiplier = skill.damageMultiplier ?? 1.0;
    let rawDmg = calculateRawDamage(Math.round(enemy.atk * damageMultiplier));
    // Apply monster tier damage modifiers
    if (enemy.tier === 'A' || enemy.tier === 'B') {
        rawDmg *= 0.8; // -20%
    } else if (enemy.tier === 'C') {
        rawDmg *= 0.9; // -10%
    }
    const finalDmg = calculateFinalDamage(
      rawDmg, 
      enemy.ampPercent || 0, 
      player.drPercent, 
      player.skillDrPercent, 
      player.flatDr
    );
    result.damageDealt = finalDmg;
    result.hpChange = -finalDmg;
    player.hp = Math.max(0, player.hp - finalDmg);

    // DES/SP impact
    const desAmount = skill.desImpactAmount ?? getImpactAmount(skill.desSpImpactLevel);
    result.desChange = desAmount;
    player.des = Math.min(100, player.des + desAmount);

    // SP drain (proportional to impact if not explicitly set)
    const spDrain = skill.spDrainAmount ?? Math.floor(desAmount * 0.5);
    result.spChange = -spDrain;
    player.sp = Math.max(0, player.sp - spDrain);

    // Durability damage
    const durResult = applyDurabilityDamage(player, skill.durabilityTarget, skill.durabilityDamage);
    result.upperChange = durResult.upperChange;
    result.lowerChange = durResult.lowerChange;

    // Control effect
    if (skill.control && !player.controlImmunity) {
      const baseControlDuration = skill.controlTurns ?? 1;
      const controlDuration =
        typeof targetPlayerIndex === 'number'
          ? adjustDurationForTurnOrder(baseControlDuration, combat, { playerIndex: targetPlayerIndex })
          : baseControlDuration;
      result.controlApplied = true;
      result.controlDuration = controlDuration;
      player.isControlled = true;
      player.controlTurns = controlDuration;
      player.controlSource = `${enemy.templateName}?${skill.name}]`;
    }

    // Special Effects
    if (skill.specialEffects) {
      for (const effect of skill.specialEffects) {
        const adjustedDuration =
          typeof targetPlayerIndex === 'number'
            ? adjustDurationForTurnOrder(effect.duration, combat, { playerIndex: targetPlayerIndex })
            : effect.duration;
        if (effect.type === 'statMod' && effect.targetStat && effect.amount) {
          applyStatusEffect(player, {
            name: `${skill.name}????`,
            duration: adjustedDuration,
            effect: `${effect.targetStat.toUpperCase()} ${effect.amount > 0 ? '+' : ''}${effect.amount}`,
            type: effect.type,
            targetStat: effect.targetStat,
            amount: effect.amount,
          });
        }
        if (effect.type === 'dot' && effect.targetStat === 'hp' && effect.amount) {
          applyStatusEffect(player, {
            name: `${skill.name}??????`,
            duration: adjustedDuration,
            effect: `HP ${effect.amount}`,
            type: effect.type,
            targetStat: effect.targetStat,
            amount: effect.amount,
          });
        }
      }
    }

    // Check BD condition (HP or DES reaches 0/max)
    if (player.hp <= 0 || player.des >= 100) {
      if (!player.isBD && !player.isProtagonist && player.des >= 100 && player.hp > 0) {
        result.companionBDTriggered = true;
      }
      player.isBD = true;
      player.isAlive = player.hp > 0;
    }

    // Set skill cooldown after use
    if (skill.cooldown > 0) {
      skill.currentCooldown = skill.cooldown;
    }
  }

  return result;
}

/** Process a player's combat action */
function processPlayerActionSingle(
  action: CombatAction,
  player: PlayerState,
  enemies: EnemyState[],
  state: GameState
): CombatTurnResult {
  const result: CombatTurnResult = {
    actorName: `${player.name}(${player.className})`,
    actorIsPlayer: true,
    targetName: '',
    action: '',
    diceResults: [],
    damageDealt: 0,
    hpChange: 0,
    spChange: 0,
    desChange: 0,
    upperChange: 0,
    lowerChange: 0,
    controlApplied: false,
    controlDuration: 0,
    narrative: '',
  };

  if (player.isControlled) {
    result.action = '鋡急?塚??⊥?銵?';
    return result;
  }

  const spMod = getPlayerSPWeightMod(player);

  switch (action.type) {
    case 'attack': {
      // Basic attack
      const target = enemies.find((e) => e.instanceId === action.targetId && e.isAlive);
      if (!target) return result;

      result.targetName = target.templateName;
      result.action = '普通攻擊';

      const atk = calculateATK(player);
      const hitMod = getStatusEffectMod(player.statusEffects, 'hit');
      const hitResult = hitCheck(75, spMod, 0, hitMod, `${player.name} ?格?賭葉?文?`);
      result.diceResults.push(hitResult);

      if (hitResult.success) {
        let rawDmg = calculateRawDamage(atk);
        rawDmg = Math.round(rawDmg * 1.15); // +15% player damage
        
        const finalDmg = calculateFinalDamage(
          rawDmg,
          getPlayerTotalAmp(player),
          target.drPercent,
          target.skillDrPercent,
          target.flatDr
        );
        result.damageDealt = finalDmg;
        target.hp = Math.max(0, target.hp - finalDmg);
        if (target.hp <= 0) target.isAlive = false;
        
        applyEquipmentSideEffects(player, 'onAttack', result);
      }
      break;
    }

    case 'skill': {
      const skill = player.skills.find((s) => s.id === action.skillId);
      if (!skill) return result;

      const target = enemies.find((e) => e.instanceId === action.targetId && e.isAlive);

      result.action = skill.name;
      result.targetName = target?.templateName ?? '?芾澈';

      // Check SP cost
      if (player.sp < skill.spCost) {
        result.action = `${skill.name} - SP 不足`;
        return result;
      }

      // Check cooldown
      if (skill.currentCooldown && skill.currentCooldown > 0) {
        result.action = `${skill.name} - 冷卻中 ${skill.currentCooldown} 回合`;
        return result;
      }

      // Consume SP
      player.sp -= skill.spCost;
      result.spChange = -skill.spCost;

      // Set cooldown
      if (skill.cooldown > 0) {
        skill.currentCooldown = skill.cooldown;
      }

      if (skill.formula) {
        if (skill.targeting === 'self') {
          applyFormulaSelfEffects(skill, player, result, state.combat, action.playerIndex);
          applyEquipmentSideEffects(player, 'onSkill', result);
          break;
        }

        if (target) {
          executeFormulaAttack(skill, player, target, action.playerIndex, spMod, state.combat, result);
          applyEquipmentSideEffects(player, 'onSkill', result);
        }
        break;
      }

      // Auto-hit skills (heals, buffs)
      if (skill.hitRule.includes('敹葉') || skill.hitRule.includes('?芾澈')) {
        // Process effect
        if (skill.effectSummary.includes('?儔HP') || skill.effectSummary.includes('?儔')) {
          const healAmount = randomInt(15, 30);
          player.hp = Math.min(player.maxHp, player.hp + healAmount);
          result.hpChange = healAmount;
        }
        if (skill.effectSummary.includes('DR')) {
          const duration = adjustDurationForTurnOrder(1, state.combat, { playerIndex: action.playerIndex });
          applyStatusEffect(player, {
            name: `${skill.name}霅琿?`,
            duration,
            effect: 'SkillDR% +15',
            type: 'buff',
            targetStat: 'skillDr',
            amount: 15,
          });
        }
        if (skill.effectSummary.includes('?')) {
          const duration = adjustDurationForTurnOrder(1, state.combat, { playerIndex: action.playerIndex });
          applyStatusEffect(player, {
            name: '???',
            duration,
            effect: '???+30%',
            type: 'statMod',
            targetStat: 'evade',
            amount: 30,
          });
        }
        break;
      }

      // Attack skills
      if (target) {
        const baseHit = parseBaseHit(skill.hitRule);
        const hitMod = getStatusEffectMod(player.statusEffects, 'hit');
        const hitResult = hitCheck(baseHit, spMod, 0, hitMod, `${player.name}: ${skill.name} ?賭葉?文?`);
        result.diceResults.push(hitResult);

        if (hitResult.success) {
          const atk = calculateATK(player);
          const skillMultiplier = skill.spCost >= 20 ? 1.8 : 1.3;
          let rawDmg = Math.round(calculateRawDamage(atk) * skillMultiplier);
          rawDmg = Math.round(rawDmg * 1.15); // +15% player damage
          
          const finalDmg = calculateFinalDamage(
            rawDmg,
            getPlayerTotalAmp(player),
            target.drPercent,
            target.skillDrPercent,
            target.flatDr
          );
          
          result.damageDealt = finalDmg;
          target.hp = Math.max(0, target.hp - finalDmg);
          if (target.hp <= 0) target.isAlive = false;

          // Control effect on enemy
          if (skill.effectSummary.includes('?批')) {
            const controlChance = 30 + (player.wil * 2);
            const controlResult = percentCheck(
              controlChance - (target.controlResistCount * 20),
              '?批?文?'
            );
            result.diceResults.push(controlResult);
            if (controlResult.success) {
              target.isControlled = true;
              target.controlTurns = adjustDurationForTurnOrder(1, state.combat, { enemyId: target.instanceId });
              target.controlSource = `${player.name}?${skill.name}]`;
              target.controlResistCount++;
              result.controlApplied = true;
              result.controlDuration = target.controlTurns;
            }
          }
          
          if (skill.id === 'SK-ASSN-POIS') {
            const duration = adjustDurationForTurnOrder(3, state.combat, { enemyId: target.instanceId });
            applyStatusEffect(target, {
              name: `${skill.name}銝剜?`,
              duration,
              effect: '瘥???HP -10',
              type: 'dot',
              targetStat: 'hp',
              amount: -10,
            });
          }

          if (skill.id === 'SK-DIVA-SONG') {
            const duration = adjustDurationForTurnOrder(1, state.combat, { enemyId: target.instanceId });
            applyStatusEffect(target, {
              name: `${skill.name}撘勗?`,
              duration,
              effect: '?賭葉 -5',
              type: 'statMod',
              targetStat: 'hit',
              amount: -5,
            });
          }

          applyEquipmentSideEffects(player, 'onSkill', result);
        }
      }
      break;
    }

    case 'defend': {
      result.action = '?脩戌';
      result.targetName = '?芾澈';
      // Temporary Skill DR boost for this round
      const duration = adjustDurationForTurnOrder(1, state.combat, { playerIndex: action.playerIndex });
      applyStatusEffect(player, {
        name: '?脩戌憪踵?',
        duration,
        effect: 'SkillDR% +15',
        type: 'buff',
        targetStat: 'skillDr',
        amount: 15,
      });
      applyEquipmentSideEffects(player, 'onDefend', result);
      break;
    }

    case 'item': {
      // Find item in inventory
      const item = state.inventory.find(
        (i) => i.id === action.itemId && i.quantity > 0
      );
      if (!item) return result;

      result.action = `雿輻 ${item.name}`;
      result.targetName = '?芾澈';

      // Apply potion effects
      if (item.type === 'potion') {
        // Simple HP/SP recovery based on item name
        if (item.name.includes('?') || item.name.includes('HP')) {
          const heal = 20;
          player.hp = Math.min(player.maxHp, player.hp + heal);
          result.hpChange = heal;
        }
        if (item.name.includes('蝎曄?') || item.name.includes('SP')) {
          player.sp = Math.min(player.maxSp, player.sp + 30);
          result.spChange = 30;
          player.des = Math.max(0, player.des - 5);
          result.desChange = -5;
        }
        item.quantity--;
        if (item.quantity <= 0) {
          const idx = state.inventory.indexOf(item);
          if (idx >= 0) state.inventory.splice(idx, 1);
        }
      }
      break;
    }

    case 'flee': {
      result.action = '?岫??';
      const fleeResult = percentCheck(
        30 + player.agi * 3,
        '???文?'
      );
      result.diceResults.push(fleeResult);
      break;
    }
  }

  return result;
}

function createPlayerTurnResult(player: PlayerState): CombatTurnResult {
  return {
    actorName: `${player.name}(${player.className})`,
    actorIsPlayer: true,
    targetName: '',
    action: '',
    diceResults: [],
    damageDealt: 0,
    hpChange: 0,
    spChange: 0,
    desChange: 0,
    upperChange: 0,
    lowerChange: 0,
    controlApplied: false,
    controlDuration: 0,
    narrative: '',
  };
}

function applySupportSkillEffect(
  skill: PlayerState['skills'][number],
  target: PlayerState,
  result: CombatTurnResult,
  combat: CombatState | null | undefined,
  targetPlayerIndex: number
): void {
  if (skill.formula) {
    const formula = skill.formula;
    if (formula.baseHeal) {
      const scaling = formula.healScalingStat ? target[formula.healScalingStat] * (formula.healScalingFactor ?? 0) : 0;
      const healAmount = Math.round(formula.baseHeal + scaling);
      const beforeHp = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + healAmount);
      result.hpChange = target.hp - beforeHp;
    }

    const effect = makeAdjustedStatusEffect(formula.selfEffect, combat, { playerIndex: targetPlayerIndex });
    if (effect) applyStatusEffect(target, effect);
    return;
  }

  if (skill.effectSummary.includes('?儔HP') || skill.effectSummary.includes('?儔')) {
    const beforeHp = target.hp;
    const healAmount = randomInt(15, 30);
    target.hp = Math.min(target.maxHp, target.hp + healAmount);
    result.hpChange = target.hp - beforeHp;
  }

  if (skill.effectSummary.includes('DR')) {
    const duration = adjustDurationForTurnOrder(1, combat, { playerIndex: targetPlayerIndex });
    applyStatusEffect(target, {
      name: `${skill.name}霅琿?`,
      duration,
      effect: 'SkillDR% +15',
      type: 'buff',
      targetStat: 'skillDr',
      amount: 15,
    });
  }

  if (skill.effectSummary.includes('?') || skill.effectSummary.includes('餈湧')) {
    const duration = adjustDurationForTurnOrder(1, combat, { playerIndex: targetPlayerIndex });
    applyStatusEffect(target, {
      name: `${skill.name}餈湧??`,
      duration,
      effect: '餈湧??30%',
      type: 'statMod',
      targetStat: 'evade',
      amount: 30,
    });
  }
}

function buildEnemyAllSkillResult(
  skill: PlayerState['skills'][number],
  player: PlayerState,
  target: EnemyState,
  playerIndex: number,
  spMod: number,
  combat: CombatState | null | undefined,
  baseResult?: CombatTurnResult
): CombatTurnResult {
  const result = baseResult ?? createPlayerTurnResult(player);
  result.action = skill.name;
  result.targetName = target.templateName;

  if (skill.formula) {
    executeFormulaAttack(skill, player, target, playerIndex, spMod, combat, result);
    return result;
  }

  const baseHit = parseBaseHit(skill.hitRule);
  const hitMod = getStatusEffectMod(player.statusEffects, 'hit');
  const hitResult = hitCheck(baseHit, spMod, 0, hitMod, `${player.name}: ${skill.name} ?賭葉?文?`);
  result.diceResults.push(hitResult);

  if (!hitResult.success) return result;

  const atk = calculateATK(player);
  const skillMultiplier = skill.spCost >= 20 ? 1.8 : 1.3;
  let rawDmg = Math.round(calculateRawDamage(atk) * skillMultiplier);
  rawDmg = Math.round(rawDmg * 1.15);

  const finalDmg = calculateFinalDamage(
    rawDmg,
    getPlayerTotalAmp(player),
    target.drPercent,
    target.skillDrPercent,
    target.flatDr
  );

  result.damageDealt = finalDmg;
  target.hp = Math.max(0, target.hp - finalDmg);
  if (target.hp <= 0) target.isAlive = false;

  if (skill.effectSummary.includes('?批')) {
    const controlChance = 30 + (player.wil * 2);
    const controlResult = percentCheck(
      controlChance - (target.controlResistCount * 20),
      '?批?文?'
    );
    result.diceResults.push(controlResult);
    if (controlResult.success) {
      target.isControlled = true;
      target.controlTurns = adjustDurationForTurnOrder(1, combat, { enemyId: target.instanceId });
      target.controlSource = `${player.name}?${skill.name}]`;
      target.controlResistCount++;
      result.controlApplied = true;
      result.controlDuration = target.controlTurns;
    }
  }

  return result;
}

/** Process a player's combat action */
export function processPlayerAction(
  action: CombatAction,
  player: PlayerState,
  enemies: EnemyState[],
  state: GameState
): CombatTurnResult[] {
  if (action.type !== 'skill') {
    return [processPlayerActionSingle(action, player, enemies, state)];
  }

  const skill = player.skills.find((s) => s.id === action.skillId);
  if (!skill) {
    return [processPlayerActionSingle(action, player, enemies, state)];
  }

  const targeting = getSkillTargeting(skill);
  if (targeting === 'enemy_single' || targeting === 'self') {
    return [processPlayerActionSingle(action, player, enemies, state)];
  }

  const spMod = getPlayerSPWeightMod(player);
  const baseResult = createPlayerTurnResult(player);
  baseResult.action = skill.name;

  if (player.isControlled) {
    baseResult.action = '鋡急?塚??⊥?銵?';
    return [baseResult];
  }

  if (player.sp < skill.spCost) {
    baseResult.action = `${skill.name} - SP 不足`;
    return [baseResult];
  }

  if (skill.currentCooldown && skill.currentCooldown > 0) {
    baseResult.action = `${skill.name} - 冷卻中 ${skill.currentCooldown} 回合`;
    return [baseResult];
  }

  if (targeting === 'enemy_all') {
    const targets = enemies.filter((enemy) => enemy.isAlive);
    if (targets.length === 0) {
      baseResult.action = `${skill.name} - 沒有可用目標`;
      return [baseResult];
    }

    player.sp -= skill.spCost;
    baseResult.spChange = -skill.spCost;
    if (skill.cooldown > 0) skill.currentCooldown = skill.cooldown;

    const results = targets.map((target, index) =>
      buildEnemyAllSkillResult(
        skill,
        player,
        target,
        action.playerIndex,
        spMod,
        state.combat,
        index === 0 ? baseResult : undefined
      )
    );
    applyEquipmentSideEffects(player, 'onSkill', results[0]);
    return results;
  }

  const allyTargets =
    targeting === 'ally_all'
      ? (state.players ?? []).filter((target) => target.isAlive && !target.isBD)
      : (state.players ?? []).filter((target) => target.name === action.targetId && target.isAlive && !target.isBD);

  if (allyTargets.length === 0) {
    baseResult.action = `${skill.name} - 沒有可用目標`;
    return [baseResult];
  }

  player.sp -= skill.spCost;
  baseResult.spChange = -skill.spCost;
  if (skill.cooldown > 0) skill.currentCooldown = skill.cooldown;

  const results = allyTargets.map((target, index) => {
    const result = index === 0 ? baseResult : createPlayerTurnResult(player);
    result.action = skill.name;
    result.targetName = target.name;
    const targetIndex = (state.players ?? []).findIndex((candidate) => candidate.name === target.name);
    applySupportSkillEffect(skill, target, result, state.combat, targetIndex >= 0 ? targetIndex : 0);
    return result;
  });

  applyEquipmentSideEffects(player, 'onSkill', results[0]);
  return results;
}

/** Check hidden trigger for B/C class monsters */
export function checkHiddenTrigger(enemy: EnemyState, player: PlayerState): DiceResult | null {
  if (!enemy.hiddenTrigger) return null;
  if (!player.isControlled) return null;

  const chanceNum = parseInt(enemy.hiddenTrigger.chance);
  const result = percentCheck(chanceNum, `${enemy.templateName} ?梯?閫貊?文?`);
  return result;
}

/** Initialize combat state */
export function initCombat(
  players: [PlayerState, PlayerState],
  enemies: EnemyState[]
): CombatState {
  const turnOrder = determineTurnOrder(players, enemies);
  const expectedRounds = getExpectedRounds(enemies);

  return {
    turnOrder,
    roundNumber: 1,
    expectedRounds,
    softPenalty: 0,
    pendingResults: [],
    isComplete: false,
    waitingForPlayer: null,
  };
}

/** Advance the combat queue iteratively until a player needs input, a monster acts, or combat ends */
export function advanceCombat(state: GameState): CombatTurnResult[] {
  const combat = state.combat;
  if (!combat || combat.isComplete || !state.players) return [];

  const results: CombatTurnResult[] = [];

  while (true) {
    // Check victory / defeat immediately
    const allEnemiesDead = state.enemies.every((e) => !e.isAlive);
    // Protagonist defeat ends combat immediately (HP=0 or DES=100)
    const protagonist = state.players.find(p => p.isProtagonist);
    const protagonistDefeated = !!protagonist && (!protagonist.isAlive || protagonist.isBD);
    // Fallback: all players dead/BD (e.g. no protagonist present)
    const allPlayersDead = state.players.every((p) => !p.isAlive || p.isBD);
    if (allEnemiesDead || protagonistDefeated || allPlayersDead) {
      combat.isComplete = true;
      break;
    }

    // End of Round check
    if (combat.turnOrder.length === 0) {
      processEndOfRound(state.players, state.enemies, combat);
      if (combat.isComplete) break;

      combat.roundNumber++;
      combat.turnOrder = determineTurnOrder(state.players, state.enemies);
      continue;
    }

    // Process next action in queue
    const currentTurn = combat.turnOrder[0];

    // Pop from queue
    combat.turnOrder.shift();

    if (currentTurn.isPlayer) {
      const p = state.players[currentTurn.playerIndex!];

      // Skip if Dead or BD
      if (!p.isAlive || p.isBD) continue;

      if (p.isControlled) {
        // Auto-skip controlled player
        results.push({
          actorName: `${p.name}(${p.className})`,
          actorIsPlayer: true,
          targetName: '',
          action: '鋡急?塚??⊥?銵?',
          diceResults: [],
          damageDealt: 0, hpChange: 0, spChange: 0, desChange: 0,
          upperChange: 0, lowerChange: 0, controlApplied: false, controlDuration: 0,
          narrative: ''
        });
        continue;
      }

      // Needs player input
      combat.waitingForPlayer = currentTurn.playerIndex!;
      
      // We can apply 'onTurnStart' side effects here for players
      const dummyResult: CombatTurnResult = {
        actorName: `${p.name}(${p.className})`,
        actorIsPlayer: true,
        targetName: '?芾澈',
        action: '????', // A dummy action
        diceResults: [],
        damageDealt: 0, hpChange: 0, spChange: 0, desChange: 0,
        upperChange: 0, lowerChange: 0, controlApplied: false, controlDuration: 0,
        narrative: ''
      };
      applyEquipmentSideEffects(p, 'onTurnStart', dummyResult);
      if (dummyResult.diceResults.length > 0) {
        // Only push to combat queue if side effects actually triggered
        results.push(dummyResult);
      }
      
      break; // Pause engine for player input

    } else {
      // Enemy turn
      const enemy = state.enemies.find((e) => e.instanceId === currentTurn.entityId);
      if (!enemy || !enemy.isAlive) continue;

      combat.waitingForPlayer = null; // No player input needed

      if (enemy.isControlled) {
        results.push({
          actorName: enemy.templateName,
          actorIsPlayer: false,
          targetName: '',
          action: '鋡急?塚??⊥?銵?',
          diceResults: [],
          damageDealt: 0, hpChange: 0, spChange: 0, desChange: 0,
          upperChange: 0, lowerChange: 0, controlApplied: false, controlDuration: 0,
          narrative: ''
        });
      } else {
        const { skill, targetPlayerIndex } = chooseEnemyAction(enemy, state.players);
        const targetPlayer = state.players[targetPlayerIndex];
        const counter = getCounterEffects(enemy, targetPlayer, state.floor);

        const res = processEnemyAttack(
          enemy,
          targetPlayer,
          skill,
          counter?.hitMod ?? 0,
          combat.softPenalty,
          state.nsgEnabled,
          combat,
          targetPlayerIndex
        );

        if (counter) {
          res.diceResults.push({
            purpose: '蝔格??',
            threshold: 100, roll: 1, success: true,
            effects: `??文?: ${counter.reason} (${counter.level})`
          });
        }

        const hiddenRes = checkHiddenTrigger(enemy, targetPlayer);
        if (hiddenRes) res.diceResults.push(hiddenRes);

        results.push(res);
      }

      // We explicitly break here so the UI can process this ONE enemy action
      // and update the narrative/screen symmetrically before pulling the next token
      break;
    }
  }

  combat.pendingResults.push(...results);
  return results;
}


/** Process end of round: status effects, control timers, cooldowns, soft penalty */
export function processEndOfRound(
  players: [PlayerState, PlayerState],
  enemies: EnemyState[],
  combat: CombatState
): void {
  // Process player status effects
  for (const player of players) {
    if (player.isAlive && !player.isBD) {
      // End of round triggers
      const dummyResult: CombatTurnResult = {
        actorName: `${player.name}(${player.className})`,
        actorIsPlayer: true,
        targetName: '?芾澈',
        action: '??蝯?蝯?',
        diceResults: [],
        damageDealt: 0, hpChange: 0, spChange: 0, desChange: 0,
        upperChange: 0, lowerChange: 0, controlApplied: false, controlDuration: 0,
        narrative: ''
      };
      applyEquipmentSideEffects(player, 'onTurnEnd', dummyResult);
      if (dummyResult.diceResults.length > 0) {
        combat.pendingResults.push(dummyResult);
        
        // BD check in case side effect instantly kills/BDs player
        if (player.hp <= 0 || player.des >= 100) {
          if (!player.isBD && !player.isProtagonist && player.des >= 100 && player.hp > 0) {
            dummyResult.companionBDTriggered = true;
          }
          player.isBD = true;
          player.isAlive = player.hp > 0;
        }
      }
    }

    // Decrement control immunity
    if (player.controlImmunity) {
      player.controlImmunityTurns--;
      if (player.controlImmunityTurns <= 0) {
        player.controlImmunity = false;
      }
    }

    // Decrement control turns
    if (player.isControlled) {
      player.controlTurns--;
      if (player.controlTurns <= 0) {
        player.isControlled = false;
        player.controlSource = undefined;
        // Give 1 turn immunity after recovering
        player.controlImmunity = true;
        player.controlImmunityTurns = 1;
      }
    }

    // Process DOT (damage-over-time) effects
    for (const se of player.statusEffects) {
      if (se.type === 'dot' && se.targetStat === 'hp' && se.amount) {
        player.hp = Math.max(0, player.hp + se.amount); // amount is negative
        const dotResult: CombatTurnResult = {
          actorName: `${player.name}(${player.className})`,
          actorIsPlayer: true,
          targetName: '?芾澈',
          action: `${se.name} ???瑕拿`,
          diceResults: [{
            purpose: '???瑕拿',
            threshold: 0, roll: 0, success: true,
            effects: `${se.name}: HP ${se.amount}`
          }],
          damageDealt: Math.abs(se.amount),
          hpChange: se.amount, spChange: 0, desChange: 0,
          upperChange: 0, lowerChange: 0,
          controlApplied: false, controlDuration: 0,
          narrative: ''
        };
        combat.pendingResults.push(dotResult);

        // BD check after DOT
        if (player.hp <= 0 || player.des >= 100) {
          if (!player.isBD && !player.isProtagonist && player.des >= 100 && player.hp > 0) {
            dotResult.companionBDTriggered = true;
          }
          player.isBD = true;
          player.isAlive = player.hp > 0;
        }
      }
    }

    const spRegen = getPassiveSpRegen(player);
    if (spRegen > 0) {
      const beforeSp = player.sp;
      player.sp = Math.min(player.maxSp, player.sp + spRegen);
      if (player.sp > beforeSp) {
        combat.pendingResults.push({
          actorName: `${player.name}(${player.className})`,
          actorIsPlayer: true,
          targetName: '自身',
          action: '魔力流通',
          diceResults: [],
          damageDealt: 0,
          hpChange: 0,
          spChange: player.sp - beforeSp,
          desChange: 0,
          upperChange: 0,
          lowerChange: 0,
          controlApplied: false,
          controlDuration: 0,
          narrative: '',
        });
      }
    }

    // Decrement status effects
    player.statusEffects = player.statusEffects.filter((se) => {
      se.duration--;
      if (se.duration <= 0) {
        removeExpiredStatusEffect(player, se);
        return false;
      }
      return true;
    });

    // Decrement skill cooldowns
    for (const skill of player.skills) {
      if (skill.currentCooldown && skill.currentCooldown > 0) {
        skill.currentCooldown--;
      }
    }
  }

  // Process enemy control timers
  for (const enemy of enemies) {
    if (enemy.isControlled) {
      enemy.controlTurns--;
      if (enemy.controlTurns <= 0) {
        enemy.isControlled = false;
        enemy.controlSource = undefined;
      }
    }

    for (const se of enemy.statusEffects) {
      if (se.type === 'dot' && se.targetStat === 'hp' && se.amount) {
        enemy.hp = Math.max(0, enemy.hp + se.amount);
        const dotResult: CombatTurnResult = {
          actorName: enemy.templateName,
          actorIsPlayer: false,
          targetName: '',
          action: `${se.name} ?蹓???`,
          diceResults: [{
            purpose: '?蹓???',
            threshold: 0, roll: 0, success: true,
            effects: `${se.name}: HP ${se.amount}`
          }],
          damageDealt: Math.abs(se.amount),
          hpChange: se.amount, spChange: 0, desChange: 0,
          upperChange: 0, lowerChange: 0,
          controlApplied: false, controlDuration: 0,
          narrative: ''
        };
        combat.pendingResults.push(dotResult);

        if (enemy.hp <= 0) {
          enemy.isAlive = false;
        }
      }
    }

    enemy.statusEffects = enemy.statusEffects.filter((se) => {
      se.duration--;
      if (se.duration <= 0) {
        removeExpiredStatusEffect(enemy, se);
        return false;
      }
      return true;
    });

    // Decrement monster skill cooldowns
    for (const skill of enemy.skills) {
      if (skill.currentCooldown && skill.currentCooldown > 0) {
        skill.currentCooldown--;
      }
    }
  }

  // Soft turn penalty
  if (combat.roundNumber > combat.expectedRounds) {
    combat.softPenalty = (combat.roundNumber - combat.expectedRounds) * 3;
  }

  // Check combat end: all enemies dead or all players dead/BD
  const allEnemiesDead = enemies.every((e) => !e.isAlive);
  const allPlayersDead = players.every(
    (p) => !p.isAlive || p.isBD
  );

  if (allEnemiesDead || allPlayersDead) {
    combat.isComplete = true;
  }
}

/** Check if combat has been won by players */
export function isCombatVictory(enemies: EnemyState[]): boolean {
  return enemies.every((e) => !e.isAlive);
}


