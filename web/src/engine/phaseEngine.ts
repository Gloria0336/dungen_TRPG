import type { Phase, GameState, EnemyState, MonsterDef } from '../types';
import { scaleMonster, getMonstersByTier } from '../data/monsters';
import { percentCheck, randomInt } from './diceEngine';
import { getRandomEvent } from '../data/events';

// ============================================================
// Phase Engine - manages game phase transitions and flow
// ============================================================

/** Valid phase transitions */
const VALID_TRANSITIONS: Record<Phase, Phase[]> = {
  INIT: ['CUSTOM'],
  CUSTOM: ['EXPLORE'],
  EXPLORE: ['COMBAT', 'EVENT', 'REST'],
  COMBAT: ['REST', 'SPECIAL', 'END'],
  EVENT: ['COMBAT', 'REST', 'EXPLORE', 'SPECIAL'],
  REST: ['EXPLORE', 'EVENT', 'SHOP', 'END'],
  SHOP: ['REST', 'EXPLORE'],
  SPECIAL: ['EXPLORE', 'REST', 'COMBAT', 'END'],
  END: ['INIT'],
};

/** Check if a transition is valid */
export function isValidTransition(from: Phase, to: Phase): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Get available actions for current phase */
export function getPhaseActions(phase: Phase, state: GameState): string[] {
  switch (phase) {
    case 'INIT':
      return ['選擇角色1職業', '選擇角色2職業'];

    case 'CUSTOM':
      return ['補充背景細節', '設定異常狀態列', '完成自訂（進入探索）'];

    case 'EXPLORE':
      return ['前進探索', '搜索當前區域'];

    case 'COMBAT': {
      const actions = ['普通攻擊', '防禦'];
      if (state.players) {
        // Add available skills
        const currentPlayer = state.players[0]; // Will be determined by turn order
        currentPlayer.skills.forEach((s) => {
          if (!s.currentCooldown || s.currentCooldown === 0) {
            actions.push(`技能: ${s.name} (SP:${s.spCost})`);
          }
        });
      }
      // Add items if available
      const potions = state.inventory.filter((i) => i.type === 'potion' && i.quantity > 0);
      if (potions.length > 0) actions.push('使用道具');
      actions.push('嘗試逃跑');
      return actions;
    }

    case 'EVENT':
      return ['選擇事件選項'];

    case 'REST':
      return [
        '1. 原地休息（回復 HP & SP）',
        '2. 探索該層（EVENT 觸發機率 +50%）',
        '3. 進入下一層',
        '4. 檢查自身狀態',
        '5. 裝備修補（若有材料）',
        '6. 飲用藥水（若背包有）',
        '7. 穿戴/更換裝備',
        '8. 復活同伴（需道具）',
      ];

    case 'SHOP':
      return ['購買', '修理裝備', '販售物品', '離開商店'];

    case 'SPECIAL':
      return ['嘗試掙脫', '觀察', '保守應對'];

    case 'END':
      return ['開始新冒險'];

    default:
      return [];
  }
}

/** Generate encounter for exploration */
export function generateExploreEncounter(
  floor: number,
  state: GameState
): { type: 'combat' | 'event' | 'clear'; enemies?: EnemyState[]; event?: ReturnType<typeof getRandomEvent> } {
  // Check for merchant
  const isShopFloor = state.shopFloors.includes(floor) ||
    (floor === 19 && !state.shopVisited[2]);

  if (isShopFloor) {
    // Will transition to SHOP, but still need an encounter first
  }

  // Event chance: ~30% base
  const eventChance = 30;
  const eventRoll = percentCheck(eventChance, '探索事件判定');

  if (eventRoll.success) {
    return { type: 'event', event: getRandomEvent() };
  }

  // Otherwise combat encounter
  const enemies = generateEnemies(floor);
  return { type: 'combat', enemies };
}

/** Generate enemies based on floor */
export function generateEnemies(floor: number): EnemyState[] {
  const enemies: EnemyState[] = [];

  // Determine encounter composition based on floor
  if (floor === 10 || floor === 20) {
    // Boss floor
    const bosses = getMonstersByTier('C');
    const boss = bosses[Math.floor(Math.random() * bosses.length)];
    enemies.push(createEnemyInstance(boss, floor, 0));
  } else if (floor >= 13) {
    // High floors: B type + sometimes A types
    const bMonsters = getMonstersByTier('B');
    const b = bMonsters[Math.floor(Math.random() * bMonsters.length)];
    enemies.push(createEnemyInstance(b, floor, 0));

    if (Math.random() < 0.4) {
      const aMonsters = getMonstersByTier('A');
      const a = aMonsters[Math.floor(Math.random() * aMonsters.length)];
      enemies.push(createEnemyInstance(a, floor, 1));
    }
  } else if (floor >= 5) {
    // Mid floors: mix of A and B
    if (Math.random() < 0.5) {
      const bMonsters = getMonstersByTier('B');
      const b = bMonsters[Math.floor(Math.random() * bMonsters.length)];
      enemies.push(createEnemyInstance(b, floor, 0));
    } else {
      // Multiple A types
      const aMonsters = getMonstersByTier('A');
      const count = randomInt(2, 3);
      for (let i = 0; i < count; i++) {
        const a = aMonsters[Math.floor(Math.random() * aMonsters.length)];
        enemies.push(createEnemyInstance(a, floor, i));
      }
    }
  } else {
    // Early floors: A types only
    const aMonsters = getMonstersByTier('A');
    const count = randomInt(1, 3);
    for (let i = 0; i < count; i++) {
      const a = aMonsters[Math.floor(Math.random() * aMonsters.length)];
      enemies.push(createEnemyInstance(a, floor, i));
    }
  }

  return enemies;
}

/** Create an enemy instance from a monster definition */
function createEnemyInstance(def: MonsterDef, floor: number, index: number): EnemyState {
  const scaled = scaleMonster(def, floor);

  return {
    instanceId: `${def.id}_${index}`,
    defId: def.id,
    templateName: def.templateName,
    tier: def.tier,
    familyTag: def.familyTag,
    hp: scaled.hp,
    maxHp: scaled.hp,
    atk: scaled.atk,
    hit: scaled.hit,
    evade: scaled.evade,
    isControlled: false,
    controlTurns: 0,
    statusEffects: [],
    skills: [...def.skillSet],
    behaviorRules: [...def.behaviorRules],
    hiddenTrigger: def.hiddenTrigger,
    isAlive: true,
    controlResistCount: 0,
  };
}

/** Process REST action */
export function processRestAction(
  actionIndex: number,
  state: GameState
): { result: string; phaseChange?: Phase; hpRecover?: number; spRecover?: number } {
  if (!state.players) return { result: '無角色' };

  switch (actionIndex) {
    case 1: {
      // Rest & recover
      const hp1 = randomInt(10, 20);
      const hp2 = randomInt(10, 20);
      const sp1 = randomInt(5, 15);
      const sp2 = randomInt(5, 15);
      state.players[0].hp = Math.min(state.players[0].maxHp, state.players[0].hp + hp1);
      state.players[1].hp = Math.min(state.players[1].maxHp, state.players[1].hp + hp2);
      state.players[0].sp = Math.min(state.players[0].maxSp, state.players[0].sp + sp1);
      state.players[1].sp = Math.min(state.players[1].maxSp, state.players[1].sp + sp2);
      return { result: `休息完成。角色1回復 HP+${hp1} SP+${sp1}，角色2回復 HP+${hp2} SP+${sp2}`, hpRecover: hp1 + hp2, spRecover: sp1 + sp2 };
    }
    case 2: {
      // Explore floor (higher event chance)
      const eventRoll = percentCheck(80, '探索事件判定（+50%）');
      if (eventRoll.success) {
        return { result: '探索中觸發了事件！', phaseChange: 'EVENT' };
      }
      return { result: '仔細搜索了周圍，但沒有特別發現。' };
    }
    case 3: {
      // Next floor
      return { result: `踏入第 ${state.floor + 1} 層`, phaseChange: 'EXPLORE' };
    }
    case 4: {
      return { result: '確認自身狀態' };
    }
    case 5: {
      // Repair
      return { result: '裝備修補功能' };
    }
    case 6: {
      // Use potion
      return { result: '使用藥水' };
    }
    case 7: {
      // Change equipment
      return { result: '裝備更換' };
    }
    case 8: {
      // Revive companion
      return { result: '復活同伴' };
    }
    default:
      return { result: '無效行動' };
  }
}
