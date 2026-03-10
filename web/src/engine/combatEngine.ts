import type {
  PlayerState, EnemyState, CombatState, CombatTurnResult,
  CombatAction, TurnAction, DiceResult, MonsterSkill, GameState,
} from '../types';
import { hitCheck, evadeCheck, percentCheck, getSPWeightMod, randomFloat, randomInt, parseBaseHit } from './diceEngine';
import { CLASS_DB } from '../data/classes';

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

/** Calculate final damage after DR% */
export function calculateFinalDamage(rawDamage: number, drPercent: number): number {
  return Math.max(1, Math.round(rawDamage * (1 - drPercent / 100)));
}

/** Calculate DR% for a player based on durability tiers */
export function calculateDR(player: PlayerState): number {
  const classDef = CLASS_DB[player.classId];
  if (!classDef) return 0;

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

  return Math.max(0, drU + drL);
}

/** Apply durability damage to player */
export function applyDurabilityDamage(
  player: PlayerState,
  target: MonsterSkill['durabilityTarget'],
  amount?: number
): { upperChange: number; lowerChange: number } {
  let upperChange = 0;
  let lowerChange = 0;

  switch (target) {
    case '上':
      upperChange = -(amount ?? 5);
      player.upperDurability = Math.max(0, player.upperDurability + upperChange);
      break;
    case '下':
      lowerChange = -(amount ?? 5);
      player.lowerDurability = Math.max(0, player.lowerDurability + lowerChange);
      break;
    case '雙':
      upperChange = -(amount ?? 3);
      lowerChange = -(amount ?? 3);
      player.upperDurability = Math.max(0, player.upperDurability + upperChange);
      player.lowerDurability = Math.max(0, player.lowerDurability + lowerChange);
      break;
    case '無':
      break;
  }

  // Recalculate DR after durability change
  player.drPercent = calculateDR(player);
  return { upperChange, lowerChange };
}

/** Get DES/SP impact amount by level */
function getImpactAmount(level: MonsterSkill['desSpImpactLevel']): number {
  switch (level) {
    case '低': return randomInt(3, 8);
    case '中': return randomInt(8, 15);
    case '高': return randomInt(15, 25);
    case '極高': return randomInt(25, 40);
  }
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
  let chosenSkill = enemy.skills[0];
  const behaviorStr = enemy.behaviorRules.join(' ');

  if (behaviorStr.includes('控制') && !target.p.isControlled) {
    const controlSkill = enemy.skills.find((s) => s.control);
    if (controlSkill) chosenSkill = controlSkill;
  } else if (behaviorStr.includes('控制') && target.p.isControlled) {
    const damageSkill = enemy.skills.find((s) => !s.control) ?? enemy.skills[0];
    chosenSkill = damageSkill;
  }

  // Boss ultimate logic
  const ultSkill = enemy.skills.find((s) => s.id.includes('ULT'));
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
  _nsgEnabled: boolean = true
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
  const isAutoHit = player.isControlled && skill.hitRule.includes('必中');

  let hitResult: DiceResult;
  if (isAutoHit) {
    hitResult = {
      purpose: `${skill.name} 命中判定`,
      threshold: 100,
      roll: 1,
      success: true,
      effects: '目標被控制中，自動命中',
    };
  } else {
    hitResult = hitCheck(
      baseHit,
      0,
      counterHitMod,
      0,
      `${enemy.templateName}: ${skill.name} 命中判定`
    );
  }
  result.diceResults.push(hitResult);

  if (!hitResult.success) {
    // Check player dodge
    const evadeResult = evadeCheck(
      Math.floor(player.agi * 3),
      player.isControlled,
      softPenalty,
      `${player.name} 閃避判定`
    );
    result.diceResults.push(evadeResult);
    if (evadeResult.success) {
      return result; // Dodge success, no damage
    }
  }

  if (hitResult.success) {
    // Calculate damage
    const rawDmg = calculateRawDamage(enemy.atk);
    const finalDmg = calculateFinalDamage(rawDmg, player.drPercent);
    result.damageDealt = finalDmg;
    result.hpChange = -finalDmg;
    player.hp = Math.max(0, player.hp - finalDmg);

    // DES/SP impact
    const desAmount = getImpactAmount(skill.desSpImpactLevel);
    result.desChange = desAmount;
    player.des = Math.min(100, player.des + desAmount);

    // SP drain (proportional to impact)
    const spDrain = Math.floor(desAmount * 0.5);
    result.spChange = -spDrain;
    player.sp = Math.max(0, player.sp - spDrain);

    // Durability damage
    const durResult = applyDurabilityDamage(player, skill.durabilityTarget);
    result.upperChange = durResult.upperChange;
    result.lowerChange = durResult.lowerChange;

    // Control effect
    if (skill.control && !player.controlImmunity) {
      result.controlApplied = true;
      result.controlDuration = 1;
      player.isControlled = true;
      player.controlTurns = 1;
    }

    // Check BD condition (HP or DES reaches 0/max)
    if (player.hp <= 0 || player.des >= 100) {
      player.isBD = true;
      player.isAlive = player.hp > 0; // Can still be alive but in BD
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
    result.action = '被控制，無法行動';
    // Decrement control turns
    player.controlTurns--;
    if (player.controlTurns <= 0) {
      player.isControlled = false;
      player.controlImmunity = true;
      player.controlImmunityTurns = 1;
    }
    return result;
  }

  const classDef = CLASS_DB[player.classId];
  const spMod = classDef ? getSPWeightMod(player.sp, classDef.spWeightRule) : 0;

  switch (action.type) {
    case 'attack': {
      // Basic attack
      const target = enemies.find((e) => e.instanceId === action.targetId && e.isAlive);
      if (!target) return result;

      result.targetName = target.templateName;
      result.action = '普通攻擊';

      const atk = calculateATK(player);
      const hitResult = hitCheck(75, spMod, 0, 0, `${player.name} 普攻命中判定`);
      result.diceResults.push(hitResult);

      if (hitResult.success) {
        const rawDmg = calculateRawDamage(atk);
        result.damageDealt = rawDmg;
        target.hp = Math.max(0, target.hp - rawDmg);
        if (target.hp <= 0) target.isAlive = false;
      }
      break;
    }

    case 'skill': {
      const skill = player.skills.find((s) => s.id === action.skillId);
      if (!skill) return result;

      const target = enemies.find((e) => e.instanceId === action.targetId && e.isAlive);

      result.action = skill.name;
      result.targetName = target?.templateName ?? '自身';

      // Check SP cost
      if (player.sp < skill.spCost) {
        result.action = `${skill.name} - SP 不足！`;
        return result;
      }

      // Check cooldown
      if (skill.currentCooldown && skill.currentCooldown > 0) {
        result.action = `${skill.name} - 冷卻中（剩餘 ${skill.currentCooldown} 回合）`;
        return result;
      }

      // Consume SP
      player.sp -= skill.spCost;
      result.spChange = -skill.spCost;

      // Set cooldown
      if (skill.cooldown > 0) {
        skill.currentCooldown = skill.cooldown;
      }

      // Auto-hit skills (heals, buffs)
      if (skill.hitRule.includes('必中') || skill.hitRule.includes('自身')) {
        // Process effect
        if (skill.effectSummary.includes('回復HP') || skill.effectSummary.includes('回復')) {
          const healAmount = randomInt(15, 30);
          player.hp = Math.min(player.maxHp, player.hp + healAmount);
          result.hpChange = healAmount;
        }
        if (skill.effectSummary.includes('DR')) {
          // Temporary DR boost handled separately
        }
        if (skill.effectSummary.includes('閃避')) {
          player.statusEffects.push({
            name: '閃避提升',
            duration: 1,
            effect: '閃避率 +30%',
          });
        }
        break;
      }

      // Attack skills
      if (target) {
        const baseHit = parseBaseHit(skill.hitRule);
        const hitResult = hitCheck(baseHit, spMod, 0, 0, `${player.name}: ${skill.name} 命中判定`);
        result.diceResults.push(hitResult);

        if (hitResult.success) {
          const atk = calculateATK(player);
          const skillMultiplier = skill.spCost >= 20 ? 1.8 : 1.3;
          const rawDmg = Math.round(calculateRawDamage(atk) * skillMultiplier);
          result.damageDealt = rawDmg;
          target.hp = Math.max(0, target.hp - rawDmg);
          if (target.hp <= 0) target.isAlive = false;

          // Control effect on enemy
          if (skill.effectSummary.includes('控制')) {
            const controlChance = 30 + (player.wil * 2);
            const controlResult = percentCheck(
              controlChance - (target.controlResistCount * 20),
              '控制判定'
            );
            result.diceResults.push(controlResult);
            if (controlResult.success) {
              target.isControlled = true;
              target.controlTurns = 1;
              target.controlResistCount++;
              result.controlApplied = true;
              result.controlDuration = 1;
            }
          }
        }
      }
      break;
    }

    case 'defend': {
      result.action = '防禦';
      result.targetName = '自身';
      // Temporary DR boost for this round
      player.statusEffects.push({
        name: '防禦姿態',
        duration: 1,
        effect: 'DR% +15',
      });
      break;
    }

    case 'item': {
      // Find item in inventory
      const item = state.inventory.find(
        (i) => i.id === action.itemId && i.quantity > 0
      );
      if (!item) return result;

      result.action = `使用 ${item.name}`;
      result.targetName = '自身';

      // Apply potion effects
      if (item.type === 'potion') {
        // Simple HP/SP recovery based on item name
        if (item.name.includes('生命') || item.name.includes('HP')) {
          const heal = 20;
          player.hp = Math.min(player.maxHp, player.hp + heal);
          result.hpChange = heal;
        }
        if (item.name.includes('精神') || item.name.includes('SP')) {
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
      result.action = '嘗試逃跑';
      const fleeResult = percentCheck(
        30 + player.agi * 3,
        '逃跑判定'
      );
      result.diceResults.push(fleeResult);
      break;
    }
  }

  return result;
}

/** Check hidden trigger for B/C class monsters */
export function checkHiddenTrigger(enemy: EnemyState, player: PlayerState): DiceResult | null {
  if (!enemy.hiddenTrigger) return null;
  if (!player.isControlled) return null;

  const chanceNum = parseInt(enemy.hiddenTrigger.chance);
  const result = percentCheck(chanceNum, `${enemy.templateName} 隱藏觸發判定`);
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
    currentTurnIndex: 0,
    roundNumber: 1,
    expectedRounds,
    softPenalty: 0,
    pendingResults: [],
    isComplete: false,
    waitingForPlayer: null,
  };
}

/** Process end of round: status effects, control timers, cooldowns, soft penalty */
export function processEndOfRound(
  players: [PlayerState, PlayerState],
  enemies: EnemyState[],
  combat: CombatState
): void {
  // Process player status effects
  for (const player of players) {
    // Decrement control immunity
    if (player.controlImmunity) {
      player.controlImmunityTurns--;
      if (player.controlImmunityTurns <= 0) {
        player.controlImmunity = false;
      }
    }

    // Decrement status effects
    player.statusEffects = player.statusEffects.filter((se) => {
      se.duration--;
      return se.duration > 0;
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
