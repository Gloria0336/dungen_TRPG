import type { BodySkillDef, Skill } from '../types';

export const BODY_SKILL_DB: Record<string, BodySkillDef> = {
  'BSK-IRON-BODY': { id: 'BSK-IRON-BODY', name: '鐵壁身軀', category: 'passive', effectSummary: '提升 DR%', maxLevel: 5 }, // maxLevel: 修改最高等級
  'BSK-SWIFT-STEP': { id: 'BSK-SWIFT-STEP', name: '疾風步', category: 'passive', effectSummary: '提升閃避率', maxLevel: 3 },
  'BSK-MANA-FLOW': { id: 'BSK-MANA-FLOW', name: '魔力流通', category: 'passive', effectSummary: '每回合回復 SP', maxLevel: 3 },
  'BSK-BATTLE-FURY': { id: 'BSK-BATTLE-FURY', name: '戰鬥狂熱', category: 'passive', effectSummary: 'HP 低於 50% 時增傷', maxLevel: 3 },
  'BSK-PAIN-RESIST': { id: 'BSK-PAIN-RESIST', name: '苦痛抵抗', category: 'passive', effectSummary: '提升最大 HP', maxLevel: 3 },
  'BSK-SECOND-WIND': { id: 'BSK-SECOND-WIND', name: '第二口氣', category: 'self', effectSummary: '回復 HP', maxLevel: 3, targeting: 'self' },
  'BSK-FOCUS': { id: 'BSK-FOCUS', name: '集中意志', category: 'self', effectSummary: '下次技能強化', maxLevel: 3, targeting: 'self' },
  'BSK-EVASIVE': { id: 'BSK-EVASIVE', name: '殘影步', category: 'self', effectSummary: '本回合高閃避', maxLevel: 3, targeting: 'self' },
  'BSK-BREAK': { id: 'BSK-BREAK', name: '破甲衝擊', category: 'enemy', effectSummary: '低傷害並降低敵方減傷', maxLevel: 3, targeting: 'enemy_single' },
  'BSK-STUN': { id: 'BSK-STUN', name: '震懾打擊', category: 'enemy', effectSummary: '傷害並控制敵人', maxLevel: 3, targeting: 'enemy_single' },
  'BSK-DRAIN': { id: 'BSK-DRAIN', name: '生命吸取', category: 'enemy', effectSummary: '造成傷害並回復自身 HP', maxLevel: 3, targeting: 'enemy_single' },
  'BSK-PIERCE': { id: 'BSK-PIERCE', name: '貫穿刺擊', category: 'enemy', effectSummary: '忽略敵方防禦', maxLevel: 5, targeting: 'enemy_single' },
  'BSK-AREA': { id: 'BSK-AREA', name: '旋風斬', category: 'enemy', effectSummary: '攻擊全體敵人', maxLevel: 3, targeting: 'enemy_all' },
  'BSK-HEAL-TOUCH': { id: 'BSK-HEAL-TOUCH', name: '治癒之觸', category: 'ally', effectSummary: '治療一名隊友', maxLevel: 3, targeting: 'ally_single' },
};

function activeBodySkill(
  id: string,
  level: number,
  spCost: number,
  cooldown: number,
  targeting: Skill['targeting'],
  effectSummary: string,
  formula: Skill['formula'],
): Skill {
  const def = BODY_SKILL_DB[id];
  return {
    id,
    name: `${def.name} Lv.${level}`,
    type: '主動',
    spCost,
    effectSummary,
    hitRule: targeting === 'self' || targeting?.startsWith('ally') ? '自動成功' : '命中 75%',
    cooldown,
    targeting,
    activation: 'active',
    category: 'body',
    level,
    maxLevel: def.maxLevel,
    formula,
  };
}

export function buildBodySkillRuntime(skillId: string, level: number): Skill {
  switch (skillId) {
    case 'BSK-SECOND-WIND':
      return activeBodySkill(
        skillId,
        level,
        6 + level * 2, // 修改 SP 消耗
        2,             // 修改 冷卻回合 (cooldown)
        'self',
        '回復自身 HP',
        {
          baseHeal: 18 + level * 10, // 修改 基礎治療量
          healScalingStat: 'wil',     // 修改 治療加成屬性 (wil=意志)
          healScalingFactor: 2,       // 修改 治療加成倍率
        },
      );
    case 'BSK-FOCUS':
      return activeBodySkill(
        skillId,
        level,
        8 + level * 2, // 修改 SP 消耗
        3,  // 修改 冷卻回合
        'self',
        '提升下次技能威力',
        {
          selfEffect: {
            name: '集中意志',
            duration: 2, // 修改 Buff 持續回合
            effect: `STR +${3 + level * 2}`,
            type: 'statMod',
            targetStat: 'str',
            amount: 3 + level * 2, // 修改 力量加成量
          },
        },
      );
    case 'BSK-EVASIVE':
      return activeBodySkill(
        skillId,
        level,
        8 + level * 2, // 修改 SP 消耗
        2,  // 修改 冷卻回合
        'self',
        '本回合大幅提高閃避',
        {
          selfEffect: {
            name: '殘影步',
            duration: 1, // 修改 持續回合
            effect: `閃避 +${20 + level * 10}`,
            type: 'statMod',
            targetStat: 'evade',
            amount: 20 + level * 10, // 修改 閃避加成量
          },
        },
      );
    case 'BSK-BREAK':
      return activeBodySkill(
        skillId,
        level,
        9 + level, // 修改 SP 消耗
        2,          // 修改 冷卻回合
        'enemy_single',
        '低傷害並降低敵方減傷',
        {
          damageMultiplier: 1.2 + level * 0.1, // 修改 攻擊傷害倍率
          targetEffect: {
            name: '破甲',
            duration: 2, // 修改 Debuff 持續回合
            effect: `SkillDR -${8 + level * 4}`,
            type: 'buff',
            targetStat: 'skillDr',
            amount: -(8 + level * 4), // 修改 減傷降低量
          },
        },
      );
    case 'BSK-STUN':
      return activeBodySkill(
        skillId,
        level,
        12 + level, // 修改 SP 消耗
        3,          // 修改 冷卻回合
        'enemy_single',
        '傷害並嘗試控制',
        {
          damageMultiplier: 1.2 + level * 0.2, // 修改 攻擊傷害倍率
          controlTurns: 1 + level,                    // 修改 控制(暈眩)回合
        },
      );
    case 'BSK-DRAIN':
      return activeBodySkill(
        skillId,
        level,
        12, // 修改 SP 消耗
        2,  // 修改 冷卻回合
        'enemy_single',
        '造成傷害並回復 HP',
        {
          damageMultiplier: 1.2 + level * 0.15, // 修改 攻擊傷害倍率
          lifeStealPercent: 30 + level * 15,    // 修改 吸血百分比 (%)
        },
      );
    case 'BSK-PIERCE':
      return activeBodySkill(
        skillId,
        level,
        10 + level * 2, // 修改 SP 消耗
        1,              // 修改 冷卻回合
        'enemy_single',
        '忽略敵方防禦',
        {
          damageMultiplier: 1.3 + level * 0.15, // 修改 攻擊傷害倍率
          ignoreDefense: true,                  // 修改 是否忽略防禦 (true/false)
        },
      );
    case 'BSK-AREA':
      return activeBodySkill(
        skillId,
        level,
        16 + level * 2, // 修改 SP 消耗
        3,              // 修改 冷卻回合
        'enemy_all',
        '攻擊全體敵人',
        {
          damageMultiplier: 0.9 + level * 0.15, // 修改 攻擊全體傷害倍率
        },
      );
    case 'BSK-HEAL-TOUCH':
      return activeBodySkill(
        skillId,
        level,
        10 + level * 2, // 修改 SP 消耗
        2,              // 修改 冷卻回合
        'ally_single',
        '治療一名隊友',
        {
          baseHeal: 20 + level * 12, // 修改 基礎治療量
          healScalingStat: 'wil',     // 修改 治療加成屬性 (wil=意志)
          healScalingFactor: 1.5,     // 修改 治療加成倍率
        },
      );
    default: {
      const def = BODY_SKILL_DB[skillId];
      return {
        id: skillId,
        name: `${def.name} Lv.${level}`,
        type: '被動',
        spCost: 0,
        effectSummary: def.effectSummary,
        hitRule: '被動',
        cooldown: 0,
        activation: 'passive',
        category: 'body',
        level,
        maxLevel: def.maxLevel,
      };
    }
  }
}

export function getBodySkillDef(skillId: string): BodySkillDef | undefined {
  return BODY_SKILL_DB[skillId];
}

export function getAllBodySkills(): BodySkillDef[] {
  return Object.values(BODY_SKILL_DB);
}
