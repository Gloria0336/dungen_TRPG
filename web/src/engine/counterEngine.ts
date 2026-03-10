import type { EnemyState, PlayerState } from '../types';
import { findCounter } from '../data/counters';
import { randomInt } from './diceEngine';

// ============================================================
// Counter Engine - monster-class weakness relationships
// ============================================================

const COUNTER_WEIGHT_TABLE = [
  { range: [1, 4], none: 70, weak: 30, full: 0 },
  { range: [5, 8], none: 45, weak: 40, full: 15 },
  { range: [9, 12], none: 25, weak: 45, full: 30 },
  { range: [13, 16], none: 10, weak: 40, full: 50 },
  { range: [17, 19], none: 0, weak: 35, full: 65 },
  { range: [20, 20], none: 0, weak: 0, full: 100 },
];

export type CounterLevel = 'none' | 'weak' | 'full';

export function rollCounterWeight(floor: number, tier: EnemyState['tier']): CounterLevel {
  let entry = COUNTER_WEIGHT_TABLE.find(e => floor >= e.range[0] && floor <= e.range[1]);
  if (!entry) entry = COUNTER_WEIGHT_TABLE[0];
  let { none, weak, full } = entry;
  if (tier === 'A') full = Math.max(0, full - 10);
  if (tier === 'C') { full = Math.min(100, full + 20); if (none > 0 && full === 0) full = 1; }
  const total = none + weak + full;
  const roll = randomInt(1, total);
  if (roll <= none) return 'none';
  if (roll <= none + weak) return 'weak';
  return 'full';
}

export function getCounterEffects(enemy: EnemyState, player: PlayerState, floor: number) {
  const counter = findCounter(enemy.familyTag, player.className);
  if (!counter) return null;
  const level = rollCounterWeight(floor, enemy.tier);
  if (level === 'none') return null;
  const fx = counter.numericalEffects;
  const m = level === 'weak' ? 0.5 : 1.0;
  return {
    level,
    hitMod: Math.round((fx.hitRate ?? 0) * m),
    damageMod: Math.round((fx.damage ?? 0) * m),
    desDelta: Math.round((fx.desDelta ?? 0) * m),
    spDelta: Math.round((fx.spDelta ?? 0) * m),
    drDelta: Math.round((fx.drDelta ?? 0) * m),
    reason: counter.counterReason[0] ?? '',
  };
}

export function assignAbsoluteCounter(): string {
  const families = ['史萊姆系', '哥布林系', '植物系', '人類系', '惡魔系', '獸系'];
  return families[Math.floor(Math.random() * families.length)];
}
