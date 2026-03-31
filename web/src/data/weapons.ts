import type { Skill, WeaponDef } from '../types';

function makeStrikeSkill(
  id: string,
  name: string,
  spCost: number,
  power: number,
  hitBonus: number,
  effectSummary: string,
  extra: Partial<Skill['formula']> = {},
): Skill {
  return {
    id,
    name,
    type: '主動',
    spCost,
    effectSummary,
    hitRule: `命中 ${70 + hitBonus}%`,
    cooldown: 1,
    targeting: 'enemy_single',
    activation: 'active',
    category: 'weapon',
    formula: {
      damageMultiplier: power,
      hitBonus,
      ...extra,
    },
  };
}

function makeSelfSkill(
  id: string,
  name: string,
  spCost: number,
  cooldown: number,
  effectSummary: string,
  selfEffect: NonNullable<Skill['formula']>['selfEffect'],
): Skill {
  return {
    id,
    name,
    type: '主動',
    spCost,
    effectSummary,
    hitRule: '自動成功',
    cooldown,
    targeting: 'self',
    activation: 'active',
    category: 'weapon',
    formula: { selfEffect },
  };
}

function makeWaveSkill(
  id: string,
  name: string,
  spCost: number,
  cooldown: number,
  power: number,
  effectSummary: string,
  extra: Partial<Skill['formula']> = {},
): Skill {
  return {
    id,
    name,
    type: '主動',
    spCost,
    effectSummary,
    hitRule: '命中 72%',
    cooldown,
    targeting: 'enemy_all',
    activation: 'active',
    category: 'weapon',
    formula: {
      damageMultiplier: power,
      ...extra,
    },
  };
}

export const WEAPON_DB: Record<string, WeaponDef> = {
  'WPN-IRON-SWORD': {
    id: 'WPN-IRON-SWORD',
    name: '鐵劍',
    tier: 1,
    atk: 10,
    skills: [
      makeStrikeSkill('WSK-IRON-SLASH', '十字斬', 8, 1.45, 5, '穩定的單體斬擊'),
      makeSelfSkill('WSK-IRON-GUARD', '鋼心架勢', 10, 2, '本回合提高減傷', {
        name: '鋼心架勢',
        duration: 1,
        effect: 'SkillDR +12',
        type: 'buff',
        targetStat: 'skillDr',
        amount: 12,
      }),
    ],
  },
  'WPN-APPRENTICE-STAFF': {
    id: 'WPN-APPRENTICE-STAFF',
    name: '見習法杖',
    tier: 1,
    atk: 4,
    ampPercent: 8,
    skills: [
      makeWaveSkill('WSK-APPRENTICE-SPARK', '火花散射', 10, 1, 1.1, '對全體造成輕度魔法傷害'),
      makeSelfSkill('WSK-APPRENTICE-MIND', '清明術', 8, 2, '回復少量 SP 並提升命中', {
        name: '清明術',
        duration: 1,
        effect: '命中 +10',
        type: 'statMod',
        targetStat: 'hit',
        amount: 10,
      }),
    ],
  },
  'WPN-WOOD-BOW': {
    id: 'WPN-WOOD-BOW',
    name: '木弓',
    tier: 1,
    atk: 9,
    ampPercent: 5,
    skills: [
      makeStrikeSkill('WSK-WOOD-BOW-PIERCE', '穿葉箭', 8, 1.35, 10, '高命中單體射擊'),
      makeSelfSkill('WSK-WOOD-BOW-STEP', '後撤步', 10, 2, '提高閃避', {
        name: '後撤步',
        duration: 1,
        effect: '閃避 +18',
        type: 'statMod',
        targetStat: 'evade',
        amount: 18,
      }),
    ],
  },
  'WPN-DAGGER': {
    id: 'WPN-DAGGER',
    name: '匕首',
    tier: 1,
    atk: 8,
    flatDr: 3,
    skills: [
      makeStrikeSkill('WSK-DAGGER-STAB', '破隙刺', 7, 1.4, 8, '高命中、忽略部分防禦', {
        ignoreDefense: true,
      }),
      makeStrikeSkill('WSK-DAGGER-DRAIN', '割喉奪息', 11, 1.2, 6, '造成傷害並回復少量 HP', {
        lifeStealPercent: 35,
      }),
    ],
  },
  'WPN-STEEL-GREATSWORD': {
    id: 'WPN-STEEL-GREATSWORD',
    name: '精鋼巨劍',
    tier: 2,
    atk: 18,
    skills: [
      makeStrikeSkill('WSK-STEEL-CLEAVE', '重墜斬', 12, 1.8, 0, '重型斬擊'),
      makeWaveSkill('WSK-STEEL-SHOCK', '震地斬', 16, 3, 1.25, '對全體造成中度傷害'),
    ],
  },
  'WPN-CRYSTAL-STAFF': {
    id: 'WPN-CRYSTAL-STAFF',
    name: '水晶魔杖',
    tier: 2,
    atk: 6,
    ampPercent: 15,
    skills: [
      makeWaveSkill('WSK-CRYSTAL-LANCE', '晶簇穿刺', 13, 2, 1.45, '魔力晶簇貫穿敵陣'),
      makeSelfSkill('WSK-CRYSTAL-FOCUS', '結晶專注', 10, 2, '下次技能傷害提升', {
        name: '結晶專注',
        duration: 1,
        effect: '增傷 +18',
        type: 'statMod',
        targetStat: 'hit',
        amount: 12,
      }),
    ],
  },
  'WPN-STEEL-WHIP': {
    id: 'WPN-STEEL-WHIP',
    name: '鋼鞭',
    tier: 2,
    atk: 14,
    ampPercent: 10,
    skills: [
      makeStrikeSkill('WSK-WHIP-BREAK', '裂甲鞭', 12, 1.35, 5, '造成傷害並削弱敵方減傷', {
        targetEffect: {
          name: '裂甲',
          duration: 2,
          effect: 'SkillDR -10',
          type: 'buff',
          targetStat: 'skillDr',
          amount: -10,
        },
      }),
      makeSelfSkill('WSK-WHIP-FEINT', '鞭影假步', 11, 2, '提高閃避', {
        name: '鞭影假步',
        duration: 1,
        effect: '閃避 +22',
        type: 'statMod',
        targetStat: 'evade',
        amount: 22,
      }),
    ],
  },
  'WPN-SHIELD-SWORD': {
    id: 'WPN-SHIELD-SWORD',
    name: '圓盾劍',
    tier: 2,
    atk: 12,
    flatDr: 8,
    skills: [
      makeStrikeSkill('WSK-SHIELD-BASH', '盾撞', 12, 1.25, 4, '造成傷害並暈眩敵人', {
        controlTurns: 1,
      }),
      makeSelfSkill('WSK-SHIELD-WALL', '盾牆', 12, 3, '本回合大幅提高減傷', {
        name: '盾牆',
        duration: 1,
        effect: 'SkillDR +20',
        type: 'buff',
        targetStat: 'skillDr',
        amount: 20,
      }),
    ],
  },
  'WPN-RUNE-SWORD': {
    id: 'WPN-RUNE-SWORD',
    name: '符文劍',
    tier: 3,
    atk: 22,
    ampPercent: 8,
    skills: [
      makeStrikeSkill('WSK-RUNE-BRAND', '符文烙斬', 15, 1.8, 6, '附帶持續傷害', {
        targetEffect: {
          name: '符文灼燒',
          duration: 3,
          effect: 'HP -8',
          type: 'dot',
          targetStat: 'hp',
          amount: -8,
        },
      }),
      makeSelfSkill('WSK-RUNE-SHIELD', '符紋護體', 12, 2, '短時間提升減傷', {
        name: '符紋護體',
        duration: 1,
        effect: 'SkillDR +18',
        type: 'buff',
        targetStat: 'skillDr',
        amount: 18,
      }),
    ],
  },
  'WPN-ARCHMAGE-STAFF': {
    id: 'WPN-ARCHMAGE-STAFF',
    name: '大法師權杖',
    tier: 3,
    atk: 8,
    ampPercent: 22,
    skills: [
      makeWaveSkill('WSK-ARCHMAGE-BURST', '祕法爆鳴', 18, 2, 1.65, '對全體造成高額魔法傷害'),
      makeSelfSkill('WSK-ARCHMAGE-INSIGHT', '高等冥想', 14, 3, '回復 SP 並提高命中', {
        name: '高等冥想',
        duration: 1,
        effect: '命中 +15',
        type: 'statMod',
        targetStat: 'hit',
        amount: 15,
      }),
    ],
  },
  'WPN-WAIL-BLADE': {
    id: 'WPN-WAIL-BLADE',
    name: '鬼哭刀',
    tier: 3,
    atk: 26,
    skills: [
      makeStrikeSkill('WSK-WAIL-CUT', '哭斷', 15, 1.95, 3, '沉重斬擊'),
      makeStrikeSkill('WSK-WAIL-SIPHON', '噬命', 16, 1.4, 6, '吸血斬擊', {
        lifeStealPercent: 55,
      }),
    ],
  },
  'WPN-HOLY-LANCE': {
    id: 'WPN-HOLY-LANCE',
    name: '聖光槍',
    tier: 3,
    atk: 24,
    ampPercent: 5,
    skills: [
      makeStrikeSkill('WSK-HOLY-LANCE', '聖槍突刺', 14, 1.7, 7, '高命中突刺', {
        ignoreDefense: true,
      }),
      makeWaveSkill('WSK-HOLY-RING', '光輪震擊', 18, 3, 1.4, '對全體造成聖光傷害'),
    ],
  },
  'WPN-DOOM-BLADE': {
    id: 'WPN-DOOM-BLADE',
    name: '滅世巨劍',
    tier: 4,
    atk: 35,
    ampPercent: 5,
    skills: [
      makeStrikeSkill('WSK-DOOM-SMASH', '崩山', 18, 2.2, 0, '極高單體爆發'),
      makeWaveSkill('WSK-DOOM-QUAKE', '末日震波', 24, 4, 1.6, '對全體造成沉重打擊'),
    ],
  },
  'WPN-ARCANE-STAFF': {
    id: 'WPN-ARCANE-STAFF',
    name: '奧秘法杖',
    tier: 4,
    atk: 10,
    ampPercent: 30,
    skills: [
      makeWaveSkill('WSK-ARCANE-NOVA', '祕術新星', 22, 3, 1.8, '高額全體魔法傷害'),
      makeSelfSkill('WSK-ARCANE-BARRIER', '奧術壁障', 16, 3, '提高減傷並回復少量 SP', {
        name: '奧術壁障',
        duration: 1,
        effect: 'SkillDR +18',
        type: 'buff',
        targetStat: 'skillDr',
        amount: 18,
      }),
    ],
  },
  'WPN-TWIN-SHADOW': {
    id: 'WPN-TWIN-SHADOW',
    name: '雙影刃',
    tier: 4,
    atk: 28,
    ampPercent: 12,
    skills: [
      makeStrikeSkill('WSK-TWIN-SLICE', '雙影連刃', 17, 1.75, 12, '高命中高速連斬'),
      makeStrikeSkill('WSK-TWIN-NERVE', '斷筋', 18, 1.3, 10, '傷害並短暫控制', {
        controlTurns: 1,
      }),
    ],
  },
  'WPN-CROSS-SPEAR': {
    id: 'WPN-CROSS-SPEAR',
    name: '聖十字矛',
    tier: 4,
    atk: 30,
    flatDr: 5,
    skills: [
      makeStrikeSkill('WSK-CROSS-JUSTICE', '審判突刺', 18, 1.9, 8, '無視部分防禦的單體爆發', {
        ignoreDefense: true,
      }),
      makeSelfSkill('WSK-CROSS-AEGIS', '聖佑', 15, 2, '提高減傷', {
        name: '聖佑',
        duration: 1,
        effect: 'SkillDR +22',
        type: 'buff',
        targetStat: 'skillDr',
        amount: 22,
      }),
    ],
  },
  'WPN-GODSLAYER': {
    id: 'WPN-GODSLAYER',
    name: '弒神刃',
    tier: 5,
    atk: 50,
    skills: [
      makeStrikeSkill('WSK-GODSLAYER', '弒神斷界', 24, 2.6, 6, '極高單體傷害'),
      makeWaveSkill('WSK-GODSLAYER-WAVE', '黑日斬', 28, 4, 1.85, '高額全體傷害'),
    ],
  },
  'WPN-VOID-CODEX': {
    id: 'WPN-VOID-CODEX',
    name: '虛空法典',
    tier: 5,
    atk: 5,
    ampPercent: 45,
    skills: [
      makeWaveSkill('WSK-VOID-ERASE', '虛無抹消', 24, 3, 2.0, '對全體造成極高魔法傷害'),
      makeSelfSkill('WSK-VOID-TRANCE', '深淵冥思', 18, 3, '提高命中與減傷', {
        name: '深淵冥思',
        duration: 1,
        effect: '命中 +18',
        type: 'statMod',
        targetStat: 'hit',
        amount: 18,
      }),
    ],
  },
  'WPN-CHAOS-TWINS': {
    id: 'WPN-CHAOS-TWINS',
    name: '混沌雙刃',
    tier: 5,
    atk: 42,
    ampPercent: 18,
    skills: [
      makeStrikeSkill('WSK-CHAOS-RIP', '混沌裂襲', 22, 2.1, 12, '高速爆發斬擊'),
      makeStrikeSkill('WSK-CHAOS-FEAST', '血宴', 20, 1.65, 8, '吸血連擊', {
        lifeStealPercent: 65,
      }),
    ],
  },
  'WPN-DIVINE-JUDGMENT': {
    id: 'WPN-DIVINE-JUDGMENT',
    name: '天罰聖劍',
    tier: 5,
    atk: 44,
    ampPercent: 10,
    skills: [
      makeStrikeSkill('WSK-DIVINE-PIERCE', '天罰貫穿', 22, 2.2, 8, '高額單體神聖傷害', {
        ignoreDefense: true,
      }),
      makeWaveSkill('WSK-DIVINE-HALO', '審判光輪', 24, 4, 1.75, '全體神聖打擊'),
    ],
  },
};

export function getWeaponTierForFloor(floor: number): number {
  return Math.min(5, Math.ceil(floor / 4));
}

export function getWeaponDef(id: string): WeaponDef | undefined {
  return WEAPON_DB[id];
}

export function getWeaponsByTier(tier: number): WeaponDef[] {
  return Object.values(WEAPON_DB).filter((weapon) => weapon.tier === tier);
}
