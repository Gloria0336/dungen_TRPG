import type { DiceResult } from '../types';

/** Roll 1D100 (1-100) */
export function roll1D100(): number {
  return Math.floor(Math.random() * 100) + 1;
}

/** Random float in range [min, max] */
export function randomFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Random int in range [min, max] inclusive */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Attribute check: 1D100 <= (50 + stat * 5) + bonus
 */
export function statCheck(
  stat: number,
  bonus: number = 0,
  purpose: string = '屬性檢定'
): DiceResult {
  const threshold = 50 + stat * 5 + bonus;
  const roll = roll1D100();
  const success = roll <= threshold;
  return {
    purpose,
    attribute: `stat=${stat}`,
    threshold,
    roll,
    success,
    effects: success ? '成功' : '失敗',
  };
}

/**
 * Hit check with all modifiers
 */
export function hitCheck(
  baseHit: number,
  spMod: number = 0,
  counterMod: number = 0,
  otherMod: number = 0,
  purpose: string = '命中判定'
): DiceResult {
  const threshold = Math.min(Math.max(baseHit + spMod + counterMod + otherMod, 5), 99);
  const roll = roll1D100();
  const success = roll <= threshold;
  return {
    purpose,
    threshold,
    roll,
    success,
    effects: success ? '命中' : '未命中',
  };
}

/**
 * Evade check: roll must exceed (100 - evade%) to dodge
 * If controlled, auto-fail (cannot dodge)
 */
export function evadeCheck(
  evadeRate: number,
  isControlled: boolean,
  softPenalty: number = 0,
  purpose: string = '閃避判定'
): DiceResult {
  if (isControlled) {
    return {
      purpose,
      threshold: 0,
      roll: 100,
      success: false,
      effects: '被控制中，無法閃避',
    };
  }
  const adjustedEvade = Math.max(evadeRate - softPenalty, 0);
  const threshold = adjustedEvade;
  const roll = roll1D100();
  const success = roll <= threshold;
  return {
    purpose,
    threshold,
    roll,
    success,
    effects: success ? '成功閃避' : '閃避失敗',
  };
}

/**
 * Generic percentage check
 */
export function percentCheck(
  chance: number,
  purpose: string = '機率判定'
): DiceResult {
  const threshold = Math.min(Math.max(Math.round(chance), 1), 100);
  const roll = roll1D100();
  const success = roll <= threshold;
  return {
    purpose,
    threshold,
    roll,
    success,
    effects: success ? '觸發' : '未觸發',
  };
}

/**
 * Format a dice result for display in combat log
 */
export function formatDiceResult(result: DiceResult): string {
  return `【${result.purpose}】門檻: ${result.threshold}% | 擲骰: 1D100=${result.roll} → ${result.success ? '✓ 成功' : '✗ 失敗'}${result.effects ? ` (${result.effects})` : ''}`;
}

/**
 * Calculate SP weight modifier for hit rate
 */
export function getSPWeightMod(
  sp: number,
  spWeightRule: Array<{ condition: string; hitMod: number }>
): number {
  for (const rule of spWeightRule) {
    const cond = rule.condition;
    if (cond.includes('>=')) {
      const val = parseInt(cond.split('>=')[1].trim());
      if (sp >= val) return rule.hitMod;
    } else if (cond.includes('<')) {
      const val = parseInt(cond.split('<')[1].trim());
      if (sp < val) return rule.hitMod;
    } else if (cond.includes('-')) {
      const parts = cond.replace(/SP\s*/i, '').split('-');
      const low = parseInt(parts[0].trim());
      const high = parseInt(parts[1].trim());
      if (sp >= low && sp <= high) return rule.hitMod;
    }
  }
  return 0;
}

/**
 * Parse base hit from a hit rule string like "基礎命中70%"
 */
export function parseBaseHit(hitRule: string): number {
  const match = hitRule.match(/(\d+)%/);
  return match ? parseInt(match[1]) : 70;
}
