import type { ClassDef } from '../types';

export const CLASS_DB: Record<string, ClassDef> = {
  'CL-PRST': {
    id: 'CL-PRST',
    className: '教團聖女',
    roleTags: ['技能型', '控場', '治癒'],
    autoStats: { STR: 4, AGI: 5, WIL: 8 },
    baseHp: 90,
    baseSp: 120,
    baseDes: 0,
    spWeightRule: [
      { condition: 'SP >= 80', hitMod: 5 },
      { condition: 'SP 50-79', hitMod: 0 },
      { condition: 'SP 20-49', hitMod: -5 },
      { condition: 'SP < 20', hitMod: -10 },
    ],
    skillList: [
      {
        id: 'SK-PRST-ATK',
        name: '神聖打擊',
        type: '技能',
        spCost: 12,
        effectSummary: '單體傷害；若命中則小幅影響敵方行動',
        hitRule: '基礎命中70% + SP權重修正',
        cooldown: 0,
      },
      {
        id: 'SK-PRST-HEAL',
        name: '治癒祈禱',
        type: '技能',
        spCost: 18,
        effectSummary: '回復HP（固定值或比例）',
        hitRule: '必中（非攻擊）',
        cooldown: 1,
      },
      {
        id: 'SK-PRST-BIND',
        name: '聖印束縛',
        type: '技能',
        spCost: 22,
        effectSummary: '嘗試施加控制1回合',
        hitRule: '基礎命中60% + AGI修正 + SP權重',
        cooldown: 2,
      },
    ],
    growthRule: {
      description: '每次戰鬥勝利後隨機提升 1～2 項',
      stats: {
        STR_AGI_WIL: '+0～+1',
        base_hp: '+2～+6（隨層數提升）',
        base_sp: '+3～+8（隨層數提升）',
      },
    },
    newSkillRule: {
      chance: '10%',
      unlockList: ['SK-PRST-AURA', 'SK-PRST-PURGE'],
    },
    durabilityDRProfile: {
      drU: 12,
      drL: 10,
      tierSteps: { '100_80': 0, '79_60': -2, '59_30': -5, '30_0': -8 },
      repairMaterial: ['修補布x1'],
    },
    backgroundGuidelines: { theme: '信仰、壓抑、使命' },
    jailbreakGuidelines: {
      appearanceBias: '淫邪的聖潔、凌亂的法衣、崩壞的純潔',
      bodyBias: '敏感的體質、易出汗、深處的渴望',
      theme: '破滅的信仰、公共之物、褻瀆的快感',
    },
  },

  'CL-KNGT': {
    id: 'CL-KNGT',
    className: '王國騎士',
    roleTags: ['坦位', '近戰', '防禦'],
    autoStats: { STR: 8, AGI: 4, WIL: 5 },
    baseHp: 130,
    baseSp: 70,
    baseDes: 0,
    spWeightRule: [
      { condition: 'SP >= 50', hitMod: 0 },
      { condition: 'SP 20-49', hitMod: -5 },
      { condition: 'SP < 20', hitMod: -15 },
    ],
    skillList: [
      {
        id: 'SK-KNGT-SLSH',
        name: '正義斬擊',
        type: '技能',
        spCost: 8,
        effectSummary: '基礎物理傷害；若命中則下回合自身 DR+5%',
        hitRule: '基礎命中75% + SP權重修正',
        cooldown: 0,
      },
      {
        id: 'SK-KNGT-GRD',
        name: '王國守護',
        type: '技能',
        spCost: 12,
        effectSummary: '本回合受到的傷害降低 20%',
        hitRule: '必中（狀態）',
        cooldown: 1,
      },
      {
        id: 'SK-KNGT-CHRG',
        name: '英勇衝鋒',
        type: '技能',
        spCost: 20,
        effectSummary: '造成中量物理傷害，並有 30% 機率使敵方控制 1 回合',
        hitRule: '基礎命中60% + STR修正',
        cooldown: 2,
      },
    ],
    growthRule: {
      description: '每次戰鬥勝利後偏重力量與體力成長',
      stats: {
        STR_WIL: '+1',
        base_hp: '+5～+10',
        base_sp: '+2～+4',
      },
    },
    newSkillRule: {
      chance: '5%',
      unlockList: ['SK-KNGT-AURA', 'SK-KNGT-EXEC'],
    },
    durabilityDRProfile: {
      drU: 18,
      drL: 15,
      tierSteps: { '100_80': 0, '79_60': -3, '59_30': -7, '30_0': -12 },
      repairMaterial: ['金屬片x1', '皮革x1'],
    },
    backgroundGuidelines: { theme: '榮譽、守護、忠誠' },
    jailbreakGuidelines: {
      appearanceBias: '破損的鎧甲、被汗水浸濕的內襯、暴露的肌膚',
      bodyBias: '強壯但被奴役的肉體、被開發的弱點',
      theme: '尊嚴的粉碎、無法防禦的肉體、強大者的臣服',
    },
  },

  'CL-MAGE': {
    id: 'CL-MAGE',
    className: '法師',
    roleTags: ['技能型', '爆發', '遠程'],
    autoStats: { STR: 2, AGI: 5, WIL: 10 },
    baseHp: 80,
    baseSp: 160,
    baseDes: 0,
    spWeightRule: [
      { condition: 'SP >= 120', hitMod: 10 },
      { condition: 'SP 60-119', hitMod: 0 },
      { condition: 'SP < 60', hitMod: -20 },
    ],
    skillList: [
      {
        id: 'SK-MAGE-MISL',
        name: '奧術彈幕',
        type: '技能',
        spCost: 10,
        effectSummary: '基礎魔法傷害；消耗低且命中穩定',
        hitRule: '基礎命中85% + SP權重修正',
        cooldown: 0,
      },
      {
        id: 'SK-MAGE-BLAST',
        name: '火球爆震',
        type: '技能',
        spCost: 25,
        effectSummary: '高額火屬性魔法傷害',
        hitRule: '基礎命中60% + WIL修正',
        cooldown: 1,
      },
      {
        id: 'SK-MAGE-TIME',
        name: '時間停滯',
        type: '技能',
        spCost: 40,
        effectSummary: '高機率控制單體目標 1 回合',
        hitRule: '基礎命中70% + WIL修正',
        cooldown: 3,
      },
    ],
    growthRule: {
      description: '每次戰鬥勝利後偏重意志與法力成長',
      stats: {
        WIL_AGI: '+1',
        base_hp: '+2～+4',
        base_sp: '+8～+15',
      },
    },
    newSkillRule: {
      chance: '15%',
      unlockList: ['SK-MAGE-BLINK', 'SK-MAGE-NOVA'],
    },
    durabilityDRProfile: {
      drU: 5,
      drL: 5,
      tierSteps: { '100_80': 0, '79_60': -1, '59_30': -3, '30_0': -5 },
      repairMaterial: ['絲綢x1'],
    },
    backgroundGuidelines: { theme: '知識、真理、傲慢' },
    jailbreakGuidelines: {
      appearanceBias: '透明的法袍、被魔力催淫的體態、失神的瞳孔',
      bodyBias: '被魔力過度開發的敏感帶、虛弱的抵抗',
      theme: '理智的高潮、無法言喻的渴望、成為魔力的祭品',
    },
  },

  'CL-FIGHT': {
    id: 'CL-FIGHT',
    className: '自由鬥士',
    roleTags: ['物理型', '平衡', '靈巧'],
    autoStats: { STR: 6, AGI: 9, WIL: 3 },
    baseHp: 105,
    baseSp: 85,
    baseDes: 0,
    spWeightRule: [
      { condition: 'SP >= 60', hitMod: 5 },
      { condition: 'SP 20-59', hitMod: 0 },
      { condition: 'SP < 20', hitMod: -5 },
    ],
    skillList: [
      {
        id: 'SK-FIGHT-PUNCH',
        name: '碎骨打擊',
        type: '技能',
        spCost: 12,
        effectSummary: '物理傷害；若命中額外減少敵方耐久或防禦',
        hitRule: '基礎命中75% + SP權重修正',
        cooldown: 0,
      },
      {
        id: 'SK-FIGHT-STEP',
        name: '幻影步',
        type: '技能',
        spCost: 15,
        effectSummary: '下回合閃避率提升 30%',
        hitRule: '必中（狀態）',
        cooldown: 2,
      },
      {
        id: 'SK-FIGHT-RAGE',
        name: '鬥士怒火',
        type: '技能',
        spCost: 25,
        effectSummary: '本回合 DR-10%，但下兩回合攻擊傷害提升 50%',
        hitRule: '自身增益',
        cooldown: 3,
      },
    ],
    growthRule: {
      description: '每次戰鬥勝利後偏重敏捷與力量成長',
      stats: {
        STR_AGI: '+1',
        base_hp: '+4～+8',
        base_sp: '+3～+6',
      },
    },
    newSkillRule: {
      chance: '8%',
      unlockList: ['SK-FIGHT-COMBO', 'SK-FIGHT-COUNTER'],
    },
    durabilityDRProfile: {
      drU: 10,
      drL: 10,
      tierSteps: { '100_80': 0, '79_60': -2, '59_30': -5, '30_0': -8 },
      repairMaterial: ['皮革x1', '布料x1'],
    },
    backgroundGuidelines: { theme: '自由、生存、競爭' },
    jailbreakGuidelines: {
      appearanceBias: '如同發情期的野獸、僅留殘破的布片、明顯的抓痕',
      bodyBias: '未經開發但極具潛力的肉穴、充滿野性的服從',
      theme: '本能的渴求、被馴服後的瘋狂、淪為洩慾的容器',
    },
  },
};

export function getClassDef(classId: string): ClassDef | undefined {
  return CLASS_DB[classId];
}

export function getAllClasses(): ClassDef[] {
  return Object.values(CLASS_DB);
}
