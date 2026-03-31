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
    type: '斬擊',
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
    type: '輔助',
    spCost,
    effectSummary,
    hitRule: '必定成功',
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
    type: '法術',
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
      makeStrikeSkill('WSK-IRON-SLASH', '鐵鋒斬', 8, 1.45, 5, '造成穩定單體傷害。'),
      makeSelfSkill('WSK-IRON-GUARD', '鐵壁架勢', 10, 2, '本回合獲得少量技能減傷。', {
        name: '鐵壁架勢',
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
    name: '學徒法杖',
    tier: 1,
    atk: 4,
    ampPercent: 8,
    skills: [
      makeWaveSkill('WSK-APPRENTICE-SPARK', '星火閃', 10, 1, 1.1, '對全體敵人造成小幅魔法傷害。'),
      makeSelfSkill('WSK-APPRENTICE-MIND', '專注冥想', 8, 2, '短暫提升命中率。', {
        name: '專注冥想',
        duration: 1,
        effect: 'Hit +10',
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
      makeStrikeSkill('WSK-WOOD-BOW-PIERCE', '穿葉箭', 8, 1.35, 10, '高命中的精準射擊。'),
      makeSelfSkill('WSK-WOOD-BOW-STEP', '側步拉弓', 10, 2, '短暫提高閃避率。', {
        name: '側步拉弓',
        duration: 1,
        effect: 'Evade +18',
        type: 'statMod',
        targetStat: 'evade',
        amount: 18,
      }),
    ],
  },
  'WPN-DAGGER': {
    id: 'WPN-DAGGER',
    name: '短匕',
    tier: 1,
    atk: 8,
    flatDr: 3,
    skills: [
      makeStrikeSkill('WSK-DAGGER-STAB', '破隙突刺', 7, 1.4, 8, '無視防禦進行刺擊。', {
        ignoreDefense: true,
      }),
      makeStrikeSkill('WSK-DAGGER-DRAIN', '掠影吸血', 11, 1.2, 6, '造成傷害並回復部分生命。', {
        lifeStealPercent: 35,
      }),
    ],
  },
  'WPN-BUCKLER-MACE': {
    id: 'WPN-BUCKLER-MACE',
    name: '圓盾釘鎚',
    tier: 1,
    atk: 7,
    flatDr: 6,
    skills: [
      makeStrikeSkill('WSK-BUCKLER-BASH', '盾擊重敲', 9, 1.2, 4, '以盾牌壓制對手，造成穩定傷害。'),
      makeSelfSkill('WSK-BUCKLER-FORTIFY', '守備姿態', 10, 3, '本回合大幅提升技能減傷。', {
        name: '守備姿態',
        duration: 1,
        effect: 'SkillDR +16',
        type: 'buff',
        targetStat: 'skillDr',
        amount: 16,
      }),
    ],
  },
  'WPN-CHAIN-SICKLE': {
    id: 'WPN-CHAIN-SICKLE',
    name: '鎖鐮',
    tier: 1,
    atk: 8,
    skills: [
      makeStrikeSkill('WSK-CHAIN-HOOK', '鎖鉤纏足', 9, 1.15, 6, '命中後使敵人失衡。', {
        controlTurns: 1,
      }),
      makeSelfSkill('WSK-CHAIN-SWING', '迴旋預備', 8, 2, '提高下一波出手的命中。', {
        name: '迴旋預備',
        duration: 1,
        effect: 'Hit +12',
        type: 'statMod',
        targetStat: 'hit',
        amount: 12,
      }),
    ],
  },
  'WPN-PIERCING-RAPIER': {
    id: 'WPN-PIERCING-RAPIER',
    name: '穿甲細劍',
    tier: 1,
    atk: 9,
    skills: [
      makeStrikeSkill('WSK-RAPIER-LUNGE', '筆直突貫', 8, 1.3, 12, '高命中且無視防禦。', {
        ignoreDefense: true,
      }),
      makeStrikeSkill('WSK-RAPIER-FEINT', '誘導刺', 10, 1.15, 14, '命中後削弱目標技能減傷。', {
        targetEffect: {
          name: '破綻暴露',
          duration: 2,
          effect: 'SkillDR -8',
          type: 'buff',
          targetStat: 'skillDr',
          amount: -8,
        },
      }),
    ],
  },
  'WPN-BERSERKER-AXE': {
    id: 'WPN-BERSERKER-AXE',
    name: '狂戰斧',
    tier: 1,
    atk: 12,
    skills: [
      makeStrikeSkill('WSK-AXE-OVERHEAD', '縱劈', 10, 1.75, -4, '高爆發重擊，但命中較低。'),
      makeSelfSkill('WSK-AXE-BLOODRUSH', '熱血催動', 12, 3, '短時間提升傷害幅度。', {
        name: '熱血催動',
        duration: 1,
        effect: 'Amp +18',
        type: 'buff',
        targetStat: 'amp',
        amount: 18,
      }),
    ],
  },

  'WPN-STEEL-GREATSWORD': {
    id: 'WPN-STEEL-GREATSWORD',
    name: '鋼製大劍',
    tier: 2,
    atk: 18,
    skills: [
      makeStrikeSkill('WSK-STEEL-CLEAVE', '斷鋼斬', 12, 1.8, 0, '重型大劍的正面劈砍。'),
      makeWaveSkill('WSK-STEEL-SHOCK', '震地斬', 16, 3, 1.25, '揮擊餘波波及全體敵人。'),
    ],
  },
  'WPN-CRYSTAL-STAFF': {
    id: 'WPN-CRYSTAL-STAFF',
    name: '晶簇法杖',
    tier: 2,
    atk: 6,
    ampPercent: 15,
    skills: [
      makeWaveSkill('WSK-CRYSTAL-LANCE', '晶槍齊射', 13, 2, 1.45, '水晶尖刺貫穿全場。'),
      makeSelfSkill('WSK-CRYSTAL-FOCUS', '晶核聚焦', 10, 2, '提升法術命中與穩定度。', {
        name: '晶核聚焦',
        duration: 1,
        effect: 'Hit +12',
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
      makeStrikeSkill('WSK-WHIP-BREAK', '裂骨鞭', 12, 1.35, 5, '削弱目標技能減傷。', {
        targetEffect: {
          name: '裂甲',
          duration: 2,
          effect: 'SkillDR -10',
          type: 'buff',
          targetStat: 'skillDr',
          amount: -10,
        },
      }),
      makeSelfSkill('WSK-WHIP-FEINT', '假步閃身', 11, 2, '短暫提高閃避率。', {
        name: '假步閃身',
        duration: 1,
        effect: 'Evade +22',
        type: 'statMod',
        targetStat: 'evade',
        amount: 22,
      }),
    ],
  },
  'WPN-SHIELD-SWORD': {
    id: 'WPN-SHIELD-SWORD',
    name: '盾劍',
    tier: 2,
    atk: 12,
    flatDr: 8,
    skills: [
      makeStrikeSkill('WSK-SHIELD-BASH', '盾面痛擊', 12, 1.25, 4, '命中後令目標短暫失衡。', {
        controlTurns: 1,
      }),
      makeSelfSkill('WSK-SHIELD-WALL', '盾牆', 12, 3, '本回合大幅提升技能減傷。', {
        name: '盾牆',
        duration: 1,
        effect: 'SkillDR +20',
        type: 'buff',
        targetStat: 'skillDr',
        amount: 20,
      }),
    ],
  },
  'WPN-HUNTER-LONGBOW': {
    id: 'WPN-HUNTER-LONGBOW',
    name: '獵人長弓',
    tier: 2,
    atk: 15,
    ampPercent: 6,
    skills: [
      makeStrikeSkill('WSK-HUNTER-MARK', '追獵標記', 10, 1.4, 14, '高命中射擊並降低敵方閃避。', {
        targetEffect: {
          name: '追獵標記',
          duration: 2,
          effect: 'Evade -10',
          type: 'statMod',
          targetStat: 'evade',
          amount: -10,
        },
      }),
      makeSelfSkill('WSK-HUNTER-STEP', '林地退步', 10, 2, '提高自身閃避。', {
        name: '林地退步',
        duration: 1,
        effect: 'Evade +24',
        type: 'statMod',
        targetStat: 'evade',
        amount: 24,
      }),
    ],
  },
  'WPN-VAMP-KNIFE': {
    id: 'WPN-VAMP-KNIFE',
    name: '渴血短刀',
    tier: 2,
    atk: 13,
    skills: [
      makeStrikeSkill('WSK-VAMP-SIPHON', '鮮血汲取', 12, 1.35, 8, '造成傷害並回復生命。', {
        lifeStealPercent: 45,
      }),
      makeSelfSkill('WSK-VAMP-HUNGER', '赤紅飢渴', 12, 3, '提高傷害幅度，適合連續追擊。', {
        name: '赤紅飢渴',
        duration: 1,
        effect: 'Amp +22',
        type: 'buff',
        targetStat: 'amp',
        amount: 22,
      }),
    ],
  },
  'WPN-DRILL-SPEAR': {
    id: 'WPN-DRILL-SPEAR',
    name: '鑽鋒長槍',
    tier: 2,
    atk: 16,
    skills: [
      makeStrikeSkill('WSK-DRILL-THRUST', '鑽甲突', 12, 1.55, 8, '無視防禦的長距離突刺。', {
        ignoreDefense: true,
      }),
      makeStrikeSkill('WSK-DRILL-PRESS', '連環迫刺', 13, 1.25, 10, '連續迫擊並削弱敵方技能減傷。', {
        targetEffect: {
          name: '裂口擴大',
          duration: 2,
          effect: 'SkillDR -12',
          type: 'buff',
          targetStat: 'skillDr',
          amount: -12,
        },
      }),
    ],
  },
  'WPN-STORM-AXE': {
    id: 'WPN-STORM-AXE',
    name: '風暴戰斧',
    tier: 2,
    atk: 19,
    skills: [
      makeStrikeSkill('WSK-STORM-FALL', '暴雷下劈', 14, 1.95, -3, '高威力單體爆發。'),
      makeWaveSkill('WSK-STORM-GUST', '亂風掃', 16, 3, 1.15, '擴散攻擊全體敵人，但傷害較分散。'),
    ],
  },

  'WPN-RUNE-SWORD': {
    id: 'WPN-RUNE-SWORD',
    name: '符文劍',
    tier: 3,
    atk: 22,
    ampPercent: 8,
    skills: [
      makeStrikeSkill('WSK-RUNE-BRAND', '烙印斬', 15, 1.8, 6, '留下持續流血效果。', {
        targetEffect: {
          name: '符文灼痕',
          duration: 3,
          effect: 'HP -8',
          type: 'dot',
          targetStat: 'hp',
          amount: -8,
        },
      }),
      makeSelfSkill('WSK-RUNE-SHIELD', '符盾展開', 12, 2, '以符文護體，提升技能減傷。', {
        name: '符盾展開',
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
      makeWaveSkill('WSK-ARCHMAGE-BURST', '群星爆裂', 18, 2, 1.65, '對全體造成高額魔法傷害。'),
      makeSelfSkill('WSK-ARCHMAGE-INSIGHT', '奧理洞察', 14, 3, '提升法術命中。', {
        name: '奧理洞察',
        duration: 1,
        effect: 'Hit +15',
        type: 'statMod',
        targetStat: 'hit',
        amount: 15,
      }),
    ],
  },
  'WPN-WAIL-BLADE': {
    id: 'WPN-WAIL-BLADE',
    name: '哀號刃',
    tier: 3,
    atk: 26,
    skills: [
      makeStrikeSkill('WSK-WAIL-CUT', '悲鳴斷', 15, 1.95, 3, '以沉重斬擊撕裂對手。'),
      makeStrikeSkill('WSK-WAIL-SIPHON', '魂飲', 16, 1.4, 6, '造成傷害並大量吸血。', {
        lifeStealPercent: 55,
      }),
    ],
  },
  'WPN-HOLY-LANCE': {
    id: 'WPN-HOLY-LANCE',
    name: '聖槍',
    tier: 3,
    atk: 24,
    ampPercent: 5,
    skills: [
      makeStrikeSkill('WSK-HOLY-LANCE', '聖槍貫穿', 14, 1.7, 7, '無視防禦的神聖突刺。', {
        ignoreDefense: true,
      }),
      makeWaveSkill('WSK-HOLY-RING', '聖環震盪', 18, 3, 1.4, '以聖光震波攻擊全體敵人。'),
    ],
  },
  'WPN-GALE-BOW': {
    id: 'WPN-GALE-BOW',
    name: '疾風獵弓',
    tier: 3,
    atk: 21,
    ampPercent: 10,
    skills: [
      makeStrikeSkill('WSK-GALE-SHOT', '疾風連矢', 14, 1.55, 16, '極高命中的高速射擊。'),
      makeSelfSkill('WSK-GALE-DODGE', '風行步', 12, 2, '大幅提高閃避。', {
        name: '風行步',
        duration: 1,
        effect: 'Evade +28',
        type: 'statMod',
        targetStat: 'evade',
        amount: 28,
      }),
    ],
  },
  'WPN-BLOOD-SCYTHE': {
    id: 'WPN-BLOOD-SCYTHE',
    name: '血月鐮',
    tier: 3,
    atk: 23,
    skills: [
      makeStrikeSkill('WSK-SCYTHE-REAP', '月蝕收割', 15, 1.6, 8, '造成傷害並回復生命。', {
        lifeStealPercent: 60,
      }),
      makeWaveSkill('WSK-SCYTHE-MIST', '血霧飛散', 17, 3, 1.2, '對全體造成傷害並附加流血。', {
        targetEffect: {
          name: '血霧侵蝕',
          duration: 2,
          effect: 'HP -10',
          type: 'dot',
          targetStat: 'hp',
          amount: -10,
        },
      }),
    ],
  },
  'WPN-CITADEL-HAMMER': {
    id: 'WPN-CITADEL-HAMMER',
    name: '堡壘鎚',
    tier: 3,
    atk: 20,
    flatDr: 10,
    skills: [
      makeStrikeSkill('WSK-CITADEL-SLAM', '城垣重鎚', 14, 1.45, 2, '厚重敲擊穩定壓制敵人。'),
      makeSelfSkill('WSK-CITADEL-HOLD', '不動如山', 14, 3, '本回合顯著提升技能減傷。', {
        name: '不動如山',
        duration: 1,
        effect: 'SkillDR +24',
        type: 'buff',
        targetStat: 'skillDr',
        amount: 24,
      }),
    ],
  },
  'WPN-FRENZY-CLAWS': {
    id: 'WPN-FRENZY-CLAWS',
    name: '狂爪',
    tier: 3,
    atk: 25,
    ampPercent: 12,
    skills: [
      makeStrikeSkill('WSK-FRENZY-RIP', '暴走撕裂', 15, 2.0, -2, '高風險高爆發的狂亂撕扯。'),
      makeSelfSkill('WSK-FRENZY-HOWL', '嗜戰嚎叫', 14, 3, '提高傷害幅度，壓低防守節奏。', {
        name: '嗜戰嚎叫',
        duration: 1,
        effect: 'Amp +28',
        type: 'buff',
        targetStat: 'amp',
        amount: 28,
      }),
    ],
  },

  'WPN-DOOM-BLADE': {
    id: 'WPN-DOOM-BLADE',
    name: '末日巨刃',
    tier: 4,
    atk: 35,
    ampPercent: 5,
    skills: [
      makeStrikeSkill('WSK-DOOM-SMASH', '末日碎滅', 18, 2.2, 0, '高威力單體斬擊。'),
      makeWaveSkill('WSK-DOOM-QUAKE', '災厄震', 24, 4, 1.6, '震盪全場的重型衝擊。'),
    ],
  },
  'WPN-ARCANE-STAFF': {
    id: 'WPN-ARCANE-STAFF',
    name: '奧祕權杖',
    tier: 4,
    atk: 10,
    ampPercent: 30,
    skills: [
      makeWaveSkill('WSK-ARCANE-NOVA', '奧祕新星', 22, 3, 1.8, '強力的全體魔法轟炸。'),
      makeSelfSkill('WSK-ARCANE-BARRIER', '奧流屏障', 16, 3, '提升技能減傷。', {
        name: '奧流屏障',
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
      makeStrikeSkill('WSK-TWIN-SLICE', '雙影切', 17, 1.75, 12, '高命中的雙刃連擊。'),
      makeStrikeSkill('WSK-TWIN-NERVE', '斷脈', 18, 1.3, 10, '命中後讓敵人短暫失控。', {
        controlTurns: 1,
      }),
    ],
  },
  'WPN-CROSS-SPEAR': {
    id: 'WPN-CROSS-SPEAR',
    name: '十字槍',
    tier: 4,
    atk: 30,
    flatDr: 5,
    skills: [
      makeStrikeSkill('WSK-CROSS-JUSTICE', '十字裁決', 18, 1.9, 8, '無視防禦的神聖突刺。', {
        ignoreDefense: true,
      }),
      makeSelfSkill('WSK-CROSS-AEGIS', '聖護壁', 15, 2, '展開短暫護壁。', {
        name: '聖護壁',
        duration: 1,
        effect: 'SkillDR +22',
        type: 'buff',
        targetStat: 'skillDr',
        amount: 22,
      }),
    ],
  },
  'WPN-PUPPET-WHIP': {
    id: 'WPN-PUPPET-WHIP',
    name: '傀儡絲鞭',
    tier: 4,
    atk: 27,
    ampPercent: 14,
    skills: [
      makeStrikeSkill('WSK-PUPPET-BIND', '絲線拘束', 18, 1.35, 10, '命中後控制目標行動。', {
        controlTurns: 1,
      }),
      makeWaveSkill('WSK-PUPPET-REEL', '線陣拖曳', 20, 3, 1.25, '全體受創並降低命中。', {
        targetEffect: {
          name: '視線受擾',
          duration: 2,
          effect: 'Hit -10',
          type: 'statMod',
          targetStat: 'hit',
          amount: -10,
        },
      }),
    ],
  },
  'WPN-ECLIPSE-SABRE': {
    id: 'WPN-ECLIPSE-SABRE',
    name: '蝕月軍刀',
    tier: 4,
    atk: 31,
    ampPercent: 10,
    skills: [
      makeStrikeSkill('WSK-ECLIPSE-DRAW', '蝕月拔刀', 18, 1.7, 10, '精準爆發並吸收部分生命。', {
        lifeStealPercent: 50,
      }),
      makeSelfSkill('WSK-ECLIPSE-COVER', '月影庇護', 16, 3, '提升技能減傷與續戰能力。', {
        name: '月影庇護',
        duration: 1,
        effect: 'SkillDR +20',
        type: 'buff',
        targetStat: 'skillDr',
        amount: 20,
      }),
    ],
  },
  'WPN-FORTRESS-MAUL': {
    id: 'WPN-FORTRESS-MAUL',
    name: '堡壘巨鎚',
    tier: 4,
    atk: 26,
    flatDr: 14,
    skills: [
      makeStrikeSkill('WSK-FORTRESS-CRUSH', '磐城鎚擊', 17, 1.6, 2, '以沉重鈍器壓制敵人。'),
      makeSelfSkill('WSK-FORTRESS-ANCHOR', '錨定陣地', 18, 3, '本回合大幅提升技能減傷。', {
        name: '錨定陣地',
        duration: 1,
        effect: 'SkillDR +28',
        type: 'buff',
        targetStat: 'skillDr',
        amount: 28,
      }),
    ],
  },
  'WPN-TEMPEST-CHAKRAM': {
    id: 'WPN-TEMPEST-CHAKRAM',
    name: '暴風輪刃',
    tier: 4,
    atk: 29,
    ampPercent: 18,
    skills: [
      makeWaveSkill('WSK-TEMPEST-FLURRY', '狂嵐飛輪', 20, 2, 1.5, '高速輪刃掃過全體敵人。'),
      makeStrikeSkill('WSK-TEMPEST-RETURN', '回返斷首', 19, 1.95, 6, '高節奏回旋斬擊，爆發優異。'),
    ],
  },

  'WPN-GODSLAYER': {
    id: 'WPN-GODSLAYER',
    name: '弒神劍',
    tier: 5,
    atk: 50,
    skills: [
      makeStrikeSkill('WSK-GODSLAYER', '弒神斬', 24, 2.6, 6, '極高威力的單體斬擊。'),
      makeWaveSkill('WSK-GODSLAYER-WAVE', '神滅波', 28, 4, 1.85, '重壓整個戰場的斬擊浪潮。'),
    ],
  },
  'WPN-VOID-CODEX': {
    id: 'WPN-VOID-CODEX',
    name: '虛無法典',
    tier: 5,
    atk: 5,
    ampPercent: 45,
    skills: [
      makeWaveSkill('WSK-VOID-ERASE', '虛界抹消', 24, 3, 2.0, '以虛無之力重創全體敵人。'),
      makeSelfSkill('WSK-VOID-TRANCE', '虛空恍惚', 18, 3, '提升命中，準備下一輪法術爆發。', {
        name: '虛空恍惚',
        duration: 1,
        effect: 'Hit +18',
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
      makeStrikeSkill('WSK-CHAOS-RIP', '混沌裂帛', 22, 2.1, 12, '高命中的雙刃撕裂。'),
      makeStrikeSkill('WSK-CHAOS-FEAST', '狂宴', 20, 1.65, 8, '造成傷害並大量吸血。', {
        lifeStealPercent: 65,
      }),
    ],
  },
  'WPN-DIVINE-JUDGMENT': {
    id: 'WPN-DIVINE-JUDGMENT',
    name: '神罰聖槍',
    tier: 5,
    atk: 44,
    ampPercent: 10,
    skills: [
      makeStrikeSkill('WSK-DIVINE-PIERCE', '神罰穿刺', 22, 2.2, 8, '無視防禦的裁決一擊。', {
        ignoreDefense: true,
      }),
      makeWaveSkill('WSK-DIVINE-HALO', '審判光環', 24, 4, 1.75, '聖光爆發攻擊全體敵人。'),
    ],
  },
  'WPN-DOMINION-BOW': {
    id: 'WPN-DOMINION-BOW',
    name: '天權長弓',
    tier: 5,
    atk: 40,
    ampPercent: 16,
    skills: [
      makeStrikeSkill('WSK-DOMINION-VERDICT', '王權裁矢', 20, 1.95, 18, '極高命中的壓制射擊。'),
      makeSelfSkill('WSK-DOMINION-WIND', '御風聖步', 18, 2, '大幅提高閃避率。', {
        name: '御風聖步',
        duration: 1,
        effect: 'Evade +34',
        type: 'statMod',
        targetStat: 'evade',
        amount: 34,
      }),
    ],
  },
  'WPN-ABYSS-CHAIN': {
    id: 'WPN-ABYSS-CHAIN',
    name: '深淵拘鏈',
    tier: 5,
    atk: 39,
    ampPercent: 20,
    skills: [
      makeStrikeSkill('WSK-ABYSS-GRASP', '深淵鉤縛', 21, 1.6, 12, '命中後將目標拖入短暫失控。', {
        controlTurns: 1,
      }),
      makeWaveSkill('WSK-ABYSS-ECHO', '黑潮回音', 24, 3, 1.45, '全體受創並降低技能減傷。', {
        targetEffect: {
          name: '深淵侵染',
          duration: 2,
          effect: 'SkillDR -15',
          type: 'buff',
          targetStat: 'skillDr',
          amount: -15,
        },
      }),
    ],
  },
  'WPN-IMMORTAL-SCYTHE': {
    id: 'WPN-IMMORTAL-SCYTHE',
    name: '不朽鐮',
    tier: 5,
    atk: 43,
    ampPercent: 12,
    skills: [
      makeStrikeSkill('WSK-IMMORTAL-REAP', '永劫收割', 22, 1.9, 10, '高傷害並回復大量生命。', {
        lifeStealPercent: 70,
      }),
      makeWaveSkill('WSK-IMMORTAL-BLOOM', '猩紅綻放', 24, 4, 1.4, '全體受創並持續流血。', {
        targetEffect: {
          name: '不滅血印',
          duration: 3,
          effect: 'HP -14',
          type: 'dot',
          targetStat: 'hp',
          amount: -14,
        },
      }),
    ],
  },
  'WPN-APOCALYPSE-HAMMER': {
    id: 'WPN-APOCALYPSE-HAMMER',
    name: '終焉巨鎚',
    tier: 5,
    atk: 46,
    flatDr: 12,
    skills: [
      makeStrikeSkill('WSK-APOC-SUNDER', '終焉碎界', 24, 2.35, -2, '極高爆發的重鎚轟擊。'),
      makeSelfSkill('WSK-APOC-STANCE', '滅世蓄勢', 20, 3, '提高傷害幅度，準備下一次致命出手。', {
        name: '滅世蓄勢',
        duration: 1,
        effect: 'Amp +34',
        type: 'buff',
        targetStat: 'amp',
        amount: 34,
      }),
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

export function getRandomWeaponByTier(tier: number): WeaponDef | undefined {
  const weapons = getWeaponsByTier(tier);
  if (weapons.length === 0) return undefined;
  return weapons[Math.floor(Math.random() * weapons.length)];
}
