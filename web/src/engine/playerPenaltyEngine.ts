import type { PlayerState } from '../types';

type PenaltyStateSource = Pick<
  PlayerState,
  'des' | 'upperDurability' | 'lowerDurability' | 'statusEffects'
>;

type BreakControlSource = Pick<
  PlayerState,
  | 'upperDurability'
  | 'lowerDurability'
  | 'isControlled'
  | 'controlTurns'
  | 'controlSource'
  | 'outfitBreakControlTriggered'
>;

export interface PlayerPenaltyState {
  effectiveDes: number;
  effectiveDesMax: number;
  desBonus: number;
  agiPenalty: number;
  strPenalty: number;
  outfitTotal: number;
  hasBrokenOutfit: boolean;
}

export interface OutfitBreakControlResult {
  applied: boolean;
  duration: number;
  source: string;
}

const OUTFIT_BREAK_CONTROL_SOURCE = '衣裝破損';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getDesCap(source: Pick<PlayerState, 'statusEffects'>): number {
  const capDelta = source.statusEffects
    .filter((effect) => effect.targetStat === 'desCap' && typeof effect.amount === 'number')
    .reduce((sum, effect) => sum + (effect.amount ?? 0), 0);

  return clamp(100 + capDelta, 1, 100);
}

function getOutfitPenaltyState(
  upperDurability: number,
  lowerDurability: number,
): Omit<PlayerPenaltyState, 'effectiveDes' | 'effectiveDesMax'> {
  const outfitTotal = Math.max(0, upperDurability) + Math.max(0, lowerDurability);
  const hasBrokenOutfit = upperDurability <= 0 || lowerDurability <= 0;

  if (hasBrokenOutfit) {
    return {
      desBonus: 30,
      agiPenalty: 99,
      strPenalty: 0,
      outfitTotal,
      hasBrokenOutfit,
    };
  }

  if (outfitTotal <= 50) {
    return {
      desBonus: 25,
      agiPenalty: 10,
      strPenalty: 0,
      outfitTotal,
      hasBrokenOutfit,
    };
  }

  if (outfitTotal <= 70) {
    return {
      desBonus: 20,
      agiPenalty: 0,
      strPenalty: 0,
      outfitTotal,
      hasBrokenOutfit,
    };
  }

  if (outfitTotal <= 90) {
    return {
      desBonus: 15,
      agiPenalty: 0,
      strPenalty: 0,
      outfitTotal,
      hasBrokenOutfit,
    };
  }

  if (outfitTotal <= 120) {
    return {
      desBonus: 5,
      agiPenalty: 0,
      strPenalty: 0,
      outfitTotal,
      hasBrokenOutfit,
    };
  }

  return {
    desBonus: 0,
    agiPenalty: 0,
    strPenalty: 0,
    outfitTotal,
    hasBrokenOutfit,
  };
}

function getDesPenaltyState(effectiveDes: number): Pick<PlayerPenaltyState, 'agiPenalty' | 'strPenalty'> {
  if (effectiveDes >= 90) {
    return { agiPenalty: 15, strPenalty: 8 };
  }

  if (effectiveDes >= 75) {
    return { agiPenalty: 6, strPenalty: 3 };
  }

  if (effectiveDes >= 60) {
    return { agiPenalty: 3, strPenalty: 0 };
  }

  return { agiPenalty: 0, strPenalty: 0 };
}

export function getPlayerPenaltyState(player: PenaltyStateSource): PlayerPenaltyState {
  const outfitPenalty = getOutfitPenaltyState(player.upperDurability, player.lowerDurability);
  const effectiveDesMax = getDesCap(player);
  const effectiveDes = clamp(player.des + outfitPenalty.desBonus, 0, effectiveDesMax);
  const desPenalty = getDesPenaltyState(effectiveDes);

  return {
    effectiveDes,
    effectiveDesMax,
    desBonus: outfitPenalty.desBonus,
    agiPenalty: outfitPenalty.agiPenalty + desPenalty.agiPenalty,
    strPenalty: outfitPenalty.strPenalty + desPenalty.strPenalty,
    outfitTotal: outfitPenalty.outfitTotal,
    hasBrokenOutfit: outfitPenalty.hasBrokenOutfit,
  };
}

export function getEffectivePlayerDes(player: PenaltyStateSource): number {
  return getPlayerPenaltyState(player).effectiveDes;
}

export function getEffectivePlayerDesMax(player: PenaltyStateSource): number {
  return getPlayerPenaltyState(player).effectiveDesMax;
}

export function getPlayerPenaltySummary(player: PenaltyStateSource): string[] {
  const penaltyState = getPlayerPenaltyState(player);
  const parts: string[] = [];

  if (penaltyState.desBonus > 0) parts.push(`DES +${penaltyState.desBonus}`);
  if (penaltyState.agiPenalty > 0) parts.push(`AGI -${penaltyState.agiPenalty}`);
  if (penaltyState.strPenalty > 0) parts.push(`STR -${penaltyState.strPenalty}`);

  return parts;
}

export function syncOutfitBreakControl(player: BreakControlSource): OutfitBreakControlResult {
  const hasBrokenOutfit = player.upperDurability <= 0 || player.lowerDurability <= 0;

  if (!hasBrokenOutfit) {
    player.outfitBreakControlTriggered = false;
    return {
      applied: false,
      duration: 0,
      source: OUTFIT_BREAK_CONTROL_SOURCE,
    };
  }

  if (player.outfitBreakControlTriggered) {
    return {
      applied: false,
      duration: 0,
      source: OUTFIT_BREAK_CONTROL_SOURCE,
    };
  }

  player.outfitBreakControlTriggered = true;
  const shouldApplyControl = !player.isControlled;

  if (shouldApplyControl) {
    player.isControlled = true;
    player.controlTurns = Math.max(player.controlTurns, 1);
    player.controlSource = OUTFIT_BREAK_CONTROL_SOURCE;
  }

  return {
    applied: shouldApplyControl,
    duration: 1,
    source: OUTFIT_BREAK_CONTROL_SOURCE,
  };
}
