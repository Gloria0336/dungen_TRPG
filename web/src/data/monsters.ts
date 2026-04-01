import type { MonsterDef } from '../types';

export const MONSTER_DB: Record<string, MonsterDef> = {
  'A-1': {
    id: 'A-1',
    templateName: '史萊姆',
    tier: 'A',
    familyTag: '史萊姆系',
    baseStats: { hp: 35, atk: 10, hit: 65, evade: 10 },
    skillSet: [
      {
        id: 'MS-A1-ATK', name: '黏液拍擊', control: false,
        desSpImpactLevel: '低', durabilityTarget: '下',
        hitRule: '基礎命中65%', baseHit: 65, cooldown: 0,
        damageMultiplier: 1.0,
        durabilityDamage: 5,
        desImpactAmount: 5,
        spDrainAmount: 2,
        effectSummary: '造成 100% 物理傷害。微幅服裝磨損 (耐久 -5)，並附加 DES +5，SP -2。',
      },
    ],
    behaviorRules: ['優先攻擊；若命中多次，偏向持續消耗同一部位耐久'],
    jailbreakBehavior: ['黏液在大腿間滑動、灌入脆弱的縫隙中，讓角色進入發情狀態'],
    hiddenTrigger: null,
    scalingHint: '深層提高 hp 少量（+5～+15），命中不超過75%',
  },
  'A-2': {
    id: 'A-2',
    templateName: '古樹藤蔓',
    tier: 'A',
    familyTag: '植物系',
    baseStats: { hp: 40, atk: 12, hit: 60, evade: 5 },
    skillSet: [
      {
        id: 'MS-A2-ATK', name: '藤蔓纏繞', control: true,
        desSpImpactLevel: '低', durabilityTarget: '下',
        hitRule: '基礎命中60%', baseHit: 60, cooldown: 2,
        damageMultiplier: 0.5,
        controlTurns: 1,
        durabilityDamage: 8,
        desImpactAmount: 8,
        spDrainAmount: 5,
        effectSummary: '造成 50% 物理傷害並控制 1 回合。束縛下半身 (耐久 -8)，附加 DES +8，SP -5。',
      },
    ],
    behaviorRules: ['優先纏繞玩家下半身；傾向於限制行動而非直接擊殺'],
    jailbreakBehavior: ['藤蔓在大腿間蠕動，粗糙的表皮磨擦著敏感處，分泌出讓人脫力的黏液'],
    hiddenTrigger: null,
    scalingHint: '層數加深後增加 hp（+5～+20），提高命中至最高 70%',
  },
  'A-3': {
    id: 'A-3',
    templateName: '流亡盜賊',
    tier: 'A',
    familyTag: '人類系',
    baseStats: { hp: 50, atk: 14, hit: 75, evade: 30 },
    skillSet: [
      {
        id: 'MS-A3-ATK', name: '卑劣切擊', control: false,
        desSpImpactLevel: '中', durabilityTarget: '上',
        hitRule: '基礎命中75%', baseHit: 75, cooldown: 0,
        damageMultiplier: 1.2,
        durabilityDamage: 15,
        desImpactAmount: 10,
        spDrainAmount: 5,
        effectSummary: '造成 120% 物理傷害。快速的斬擊大幅損毀上半身服裝 (耐久 -15)，附加 DES +10，SP -5。',
      },
    ],
    behaviorRules: ['利用高閃避消耗玩家；優先攻擊衣物脆弱處'],
    jailbreakBehavior: ['用淫穢的目光打量角色，故意切開布料展示內在，並發出下流的嘲笑'],
    hiddenTrigger: null,
    scalingHint: '深層增加閃避（+5～+10）與攻擊力（+2～+4）',
  },
  'B-1': {
    id: 'B-1',
    templateName: '菁英哥布林',
    tier: 'B',
    familyTag: '哥布林系',
    baseStats: { hp: 85, atk: 16, hit: 70, evade: 20 },
    skillSet: [
      {
        id: 'MS-B1-A', name: '短刃突刺', control: false,
        desSpImpactLevel: '中', durabilityTarget: '上',
        hitRule: '基礎命中70%', baseHit: 70, cooldown: 0,
        damageMultiplier: 1.3,
        durabilityDamage: 10,
        desImpactAmount: 12,
        spDrainAmount: 6,
        effectSummary: '造成 130% 物理傷害。削弱上半身耐久 (耐久 -10)，附加 DES +12，SP -6。',
      },
      {
        id: 'MS-B1-B', name: '繩套壓制', control: true,
        desSpImpactLevel: '中', durabilityTarget: '無',
        hitRule: '基礎命中60%', baseHit: 60, cooldown: 2,
        damageMultiplier: 0.8,
        controlTurns: 1,
        durabilityDamage: 0,
        desImpactAmount: 15,
        spDrainAmount: 10,
        effectSummary: '造成 80% 物理傷害並施加控制 1 回合。施加精神壓迫，附加 DES +15，SP -10。',
      },
    ],
    behaviorRules: ['優先使用控制（若玩家未被控制）', '玩家被控制時改用短刃突刺'],
    jailbreakBehavior: [
      '用粗糙的手指強行探入、撕扯衣物，迫使角色擺出誘人的姿勢',
      '將精液射在角色身上並進行羞辱',
    ],
    hiddenTrigger: { condition: '玩家被控制且遭本怪攻擊', chance: '5%', result: '進入SPECIAL' },
    scalingHint: '深層提高 hp 少量、atk 小幅（每4層+1～2），避免一擊秒殺',
  },
  'B-2': {
    id: 'B-2',
    templateName: '肉壺觸手',
    tier: 'B',
    familyTag: '植物系',
    baseStats: { hp: 100, atk: 18, hit: 65, evade: 10 },
    skillSet: [
      {
        id: 'MS-B2-A', name: '寄生孢子', control: true,
        desSpImpactLevel: '高', durabilityTarget: '無',
        hitRule: '基礎命中60%', baseHit: 60, cooldown: 3,
        damageMultiplier: 0.2,
        controlTurns: 1,
        durabilityDamage: 0,
        desImpactAmount: 25,
        spDrainAmount: 15,
        effectSummary: '造成 20% 物理傷害並控制 1 回合。釋放孢子使大腦混亂，附加 DES +25，SP -15。',
      },
      {
        id: 'MS-B2-B', name: '肉壺吞噬', control: true,
        desSpImpactLevel: '中', durabilityTarget: '下',
        hitRule: '基礎命中70%（對已控制目標必中）', baseHit: 70, cooldown: 1,
        damageMultiplier: 0.8,
        controlTurns: 1,
        durabilityDamage: 20,
        desImpactAmount: 15,
        spDrainAmount: 20,
        effectSummary: '造成 80% 物理傷害並控制 1 回合。將下半身包覆並大幅消耗耐久 (耐久 -20)，吸取精力造成 DES +15，SP -20。',
      },
    ],
    behaviorRules: ['先施放孢子降低玩家抵抗力', '對已控制目標持續使用肉壺吞噬'],
    jailbreakBehavior: [
      '觸手內部佈滿了柔軟的凸起與吸盤，貪婪地吸吮著角色的蜜汁',
      '分泌催情香氣，讓角色在半夢半醒間淪為植物的育床',
    ],
    hiddenTrigger: { condition: '玩家被控制且遭本怪攻擊', chance: '5%', result: '進入SPECIAL' },
    scalingHint: '深層顯著提升 hp（+20～+50），孢子影響範圍擴大',
  },
  'B-3': {
    id: 'B-3',
    templateName: '魅魔',
    tier: 'B',
    familyTag: '惡魔系',
    baseStats: { hp: 90, atk: 15, hit: 80, evade: 30 },
    skillSet: [
      {
        id: 'MS-B3-A', name: '誘惑之吻', control: true,
        desSpImpactLevel: '高', durabilityTarget: '無',
        hitRule: '基礎命中75%（WIL 抗性可修正）', baseHit: 75, cooldown: 3,
        damageMultiplier: 0.1,
        controlTurns: 1,
        durabilityDamage: 0,
        desImpactAmount: 30,
        spDrainAmount: 20,
        specialEffects: [
          { type: 'statMod', targetStat: 'wil', amount: -15, duration: 2 }
        ],
        effectSummary: '極小傷害並魅惑 1 回合。大幅度削弱理智，附加 DES +30，SP -20，使 WIL -15 (持續 2 回合)。',
      },
      {
        id: 'MS-B3-B', name: '淫紋刻印', control: false,
        desSpImpactLevel: '高', durabilityTarget: '雙',
        hitRule: '基礎命中65%', baseHit: 65, cooldown: 1,
        damageMultiplier: 0.6,
        durabilityDamage: 5,
        desImpactAmount: 40,
        spDrainAmount: 10,
        effectSummary: '造成 60% 物理傷害。在身上留下發情印記，造成 DES 劇增 (+40)，SP -10。',
      },
    ],
    behaviorRules: ['優先魅惑高 WIL 的玩家', '魅惑成功後穩定刻印淫紋'],
    jailbreakBehavior: [
      '用尾巴挑逗角色的下體，輕聲在耳邊訴說墮落的快感',
      '強迫角色喝下淫穢的體液，將其理智徹底粉碎',
    ],
    hiddenTrigger: { condition: '玩家被控制且遭本怪攻擊', chance: '5%', result: '進入SPECIAL' },
    scalingHint: '深層提高魅惑命中率與 DES 增加幅度',
  },
  'B-4': {
    id: 'B-4',
    templateName: '獸人',
    tier: 'B',
    familyTag: '獸系',
    baseStats: { hp: 120, atk: 22, hit: 70, evade: 5 },
    skillSet: [
      {
        id: 'MS-B4-A', name: '蠻力重擊', control: false,
        desSpImpactLevel: '中', durabilityTarget: '雙',
        hitRule: '基礎命中70%', baseHit: 70, cooldown: 0,
        damageMultiplier: 1.5,
        durabilityDamage: 15,
        desImpactAmount: 10,
        spDrainAmount: 5,
        effectSummary: '造成 150% 的高物理傷害。粗暴地鈍擊裝甲 (耐久 -15)，附加 DES +10。',
      },
      {
        id: 'MS-B4-B', name: '野蠻擄獲', control: true,
        desSpImpactLevel: '高', durabilityTarget: '上',
        hitRule: '基礎命中60%', baseHit: 60, cooldown: 2,
        damageMultiplier: 1.2,
        controlTurns: 1,
        durabilityDamage: 30,
        desImpactAmount: 20,
        spDrainAmount: 15,
        effectSummary: '造成 120% 物理傷害並壓制 1 回合。強行扯破上半身衣物 (耐久 -30)，使其感到強烈恐懼 (DES +20，SP -15)。',
      },
      {
        id: 'MS-B4-C', name: '肉鎧束縛', control: true,
        desSpImpactLevel: '高', durabilityTarget: '雙',
        hitRule: '基礎命中50%（對已控制目標必中）', baseHit: 50, cooldown: 5,
        damageMultiplier: 2.0,
        controlTurns: 3,
        durabilityDamage: 50,
        desImpactAmount: 30,
        spDrainAmount: 25,
        effectSummary: '造成 200% 物理傷害並強制束縛 3 回合。極其野蠻地撕碎全身裝甲 (耐久 -50)，造成巨量精神剝奪 (DES +30，SP -25)。',
      },
    ],
    behaviorRules: [
      '血量高時偏向輸出，血量低於 30% 進入狂暴（攻擊+5）',
      '玩家受傷後優先嘗試擄獲',
    ],
    jailbreakBehavior: [
      '用腥臭的口水塗滿角色全身，將其當作洩慾的肉靶粗暴對待',
      '體格上的絕對差距讓角色無法動彈，只能承受獸人粗大勃起的貫穿',
    ],
    hiddenTrigger: { condition: '玩家被控制且遭本怪攻擊', chance: '5%', result: '進入SPECIAL' },
    scalingHint: '每前進 5 層提升 atk +2，hp +10',
  },
  'B-5': {
    id: 'B-5',
    templateName: '狼人',
    tier: 'B',
    familyTag: '獸系',
    baseStats: { hp: 110, atk: 20, hit: 75, evade: 25 },
    skillSet: [
      {
        id: 'MS-B5-A', name: '血腥撕咬', control: false,
        desSpImpactLevel: '中', durabilityTarget: '下',
        hitRule: '基礎命中75%', baseHit: 75, cooldown: 1,
        damageMultiplier: 1.4,
        durabilityDamage: 10,
        desImpactAmount: 15,
        spDrainAmount: 5,
        effectSummary: '造成 140% 物理傷害並造成流血感。撕咬下半身 (耐久 -10)，附加 DES +15。',
      },
      {
        id: 'MS-B5-B', name: '發狂撲擊', control: true,
        desSpImpactLevel: '高', durabilityTarget: '雙',
        hitRule: '基礎命中65%', baseHit: 65, cooldown: 3,
        damageMultiplier: 1.1,
        controlTurns: 1,
        durabilityDamage: 25,
        desImpactAmount: 25,
        spDrainAmount: 20,
        specialEffects: [
          { type: 'statMod', targetStat: 'agi', amount: -15, duration: 2 }
        ],
        effectSummary: '造成 110% 物理傷害並撲倒壓制 1 回合。瘋狂的抓撓損毀裝甲 (耐久 -25)，造成 DES +25，SP -20，並使玩家 AGI -15 (持續 2 回合)。',
      },
    ],
    behaviorRules: ['優先攻擊已流血的玩家', '行動模式極具侵略性，不常進行防禦'],
    jailbreakBehavior: [
      '像野獸般啃咬角色的私處，將那裡標記為自己的領地',
      '在月光的照射下展現出驚人的性慾，將角色按在地上強制交配',
    ],
    hiddenTrigger: { condition: '玩家被控制且遭本怪攻擊', chance: '5%', result: '進入SPECIAL' },
    scalingHint: '深層提高 AGI（增加先手與閃避）',
  },
  'B-6': {
    id: 'B-6',
    templateName: '河童',
    tier: 'B',
    familyTag: '哥布林系',
    baseStats: { hp: 95, atk: 14, hit: 75, evade: 35 },
    skillSet: [
      {
        id: 'MS-B6-A', name: '水花亂舞', control: false,
        desSpImpactLevel: '低', durabilityTarget: '無',
        hitRule: '基礎命中75%', baseHit: 75, cooldown: 1,
        damageMultiplier: 0.9,
        durabilityDamage: 0,
        desImpactAmount: 5,
        spDrainAmount: 5,
        effectSummary: '造成 90% 物理傷害。干擾視線，附加 DES +5，SP -5。',
      },
      {
        id: 'MS-B6-B', name: '尻子玉獲得', control: true,
        desSpImpactLevel: '極高', durabilityTarget: '下',
        hitRule: '基礎命中55%', baseHit: 85, cooldown: 3,
        damageMultiplier: 1.2,
        controlTurns: 1,
        durabilityDamage: 10,
        desImpactAmount: 25,
        spDrainAmount: 20,
        specialEffects: [
          { type: 'statMod', targetStat: 'evade', amount: -20, duration: 2 },
          { type: 'statMod', targetStat: 'wil', amount: -20, duration: 2 }
        ],
        effectSummary: '造成 120% 物理傷害並控制 1 回合。從後穴取出尻子玉 (耐久 -10)，造成極大精神創傷 (DES +25，SP -20)，並使玩家閃避 -20、WIL -20 (持續 2 回合)。',
      },
    ],
    behaviorRules: ['優先使用水花亂舞進行鋪墊', '一旦玩家被控制，必定嘗試取出尻子玉'],
    jailbreakBehavior: [
      '將其溼滑的手指強行撐開後穴，在痛苦與快感的交織下硬生生將尻子玉掏出',
      '對著被奪走尻子玉而失神失禁的角色進行無情的抽插，將其靈魂與肉體徹底玩弄',
    ],
    hiddenTrigger: { condition: '玩家被控制且遭本怪攻擊', chance: '5%', result: '進入SPECIAL' },
    scalingHint: '深層提高閃避（+10%）與負面效果幅度',
  },
  'C-1': {
    id: 'C-1',
    templateName: '吸血鬼伯爵',
    tier: 'C',
    familyTag: '人類系',
    baseStats: { hp: 300, atk: 30, hit: 85, evade: 20 },
    skillSet: [
      {
        id: 'MS-C1-A', name: '優雅吸取', control: false,
        desSpImpactLevel: '高', durabilityTarget: '上',
        hitRule: '基礎命中85%', baseHit: 85, cooldown: 2,
        damageMultiplier: 1.5,
        durabilityDamage: 10,
        desImpactAmount: 20,
        spDrainAmount: 30,
        effectSummary: '造成 150% 物理傷害。咬破頸部吸取血液 (耐久 -10)，使玩家大量流失體力 (DES +20，SP -30)。',
      },
      {
        id: 'MS-C1-B', name: '暗影禁錮', control: true,
        desSpImpactLevel: '高', durabilityTarget: '無',
        hitRule: '基礎命中75%（WIL 判定）', baseHit: 75, cooldown: 4,
        damageMultiplier: 0.5,
        controlTurns: 1,
        durabilityDamage: 0,
        desImpactAmount: 15,
        spDrainAmount: 10,
        specialEffects: [
          { type: 'statMod', targetStat: 'evade', amount: -30, duration: 2 }
        ],
        effectSummary: '造成 50% 物理傷害並控制 1 回合。召喚暗影束縛全身，附加 DES +15，並使玩家閃避 -30 (持續 2 回合)。',
      },
      {
        id: 'MS-C1-ULT', name: '血紅祭禮（大招）', control: false,
        desSpImpactLevel: '極高', durabilityTarget: '雙',
        hitRule: '基礎命中90%', baseHit: 90, cooldown: 6,
        damageMultiplier: 2.5,
        durabilityDamage: 30,
        desImpactAmount: 40,
        spDrainAmount: 20,
        effectSummary: '造成 250% 的毀滅性打擊。強制撕扯全身裝備 (耐久 -30)，附帶極高精神衝擊 (DES +40，SP -20)。',
      },
    ],
    behaviorRules: [
      '每 3 回合可釋放大招，或 HP 低於 40% 時即刻釋放一次',
      '優先禁錮玩家，確保吸取技能必中',
    ],
    jailbreakBehavior: [
      '優雅地撕裂華麗的服飾，將角色視為永恆的血奴與玩物',
      '用帶刺的觸鬚沒入角色的孔穴，將冰冷的血液與熱情的精液同時注入',
    ],
    hiddenTrigger: { condition: '玩家被控制且遭本怪攻擊', chance: '10%', result: '進入SPECIAL' },
    scalingHint: '不隨層數調整，固定為第 10 層或第 20 層的小 Boss 級別',
  },
  'C-2': {
    id: 'C-2',
    templateName: '哥布林王',
    tier: 'C',
    familyTag: '哥布林系',
    baseStats: { hp: 220, atk: 24, hit: 75, evade: 18 },
    skillSet: [
      {
        id: 'MS-C2-A', name: '王者斬擊', control: false,
        desSpImpactLevel: '中', durabilityTarget: '雙',
        hitRule: '基礎命中75%', baseHit: 75, cooldown: 0,
        damageMultiplier: 1.6,
        durabilityDamage: 15,
        desImpactAmount: 12,
        spDrainAmount: 5,
        effectSummary: '造成 160% 物理傷害。沉重的斬擊削弱全身裝甲 (耐久 -15)，附加 DES +12，SP -5。',
      },
      {
        id: 'MS-C2-B', name: '號令壓迫', control: true,
        desSpImpactLevel: '高', durabilityTarget: '無',
        hitRule: '基礎命中60%', baseHit: 60, cooldown: 3,
        damageMultiplier: 0.8,
        controlTurns: 1,
        durabilityDamage: 0,
        desImpactAmount: 25,
        spDrainAmount: 15,
        specialEffects: [
          { type: 'statMod', targetStat: 'wil', amount: -15, duration: 2 }
        ],
        effectSummary: '造成 80% 物理傷害並控制 1 回合。發出王者咆哮造成極高壓力 (DES +25，SP -15)，使玩家 WIL -15 (持續 2 回合)。',
      },
      {
        id: 'MS-C2-ULT', name: '王之裁決（大招）', control: false,
        desSpImpactLevel: '高', durabilityTarget: '上',
        hitRule: '基礎命中80%', baseHit: 80, cooldown: 4,
        damageMultiplier: 2.2,
        durabilityDamage: 25,
        desImpactAmount: 20,
        spDrainAmount: 10,
        effectSummary: '造成 220% 的強力一擊。無視防禦重創上半身 (耐久 -25)，附加 DES +20，SP -10。',
      },
    ],
    behaviorRules: [
      '先用號令壓迫嘗試控制',
      '控制成功後偏向大招或高輸出',
      '大招使用需 cooldown=3 或「血量低於50%觸發」',
    ],
    jailbreakBehavior: [
      '對角色進行極度的性凌辱，將其視為王者的母畜進行宣示',
      '將角色當成活祭品，在眾目睽睽下粗暴地抽插進行灌精',
    ],
    hiddenTrigger: { condition: '玩家被控制且遭本怪攻擊', chance: '10%', result: '進入SPECIAL' },
    scalingHint: 'Boss不隨層數膨脹；僅可依層數調整少量命中或hp（固定上限）',
  },
  'A-4': {
    id: 'A-4',
    templateName: '穴居陷阱蛛',
    tier: 'A',
    familyTag: '蟲系',
    baseStats: { hp: 45, atk: 12, hit: 70, evade: 15 },
    skillSet: [
      {
        id: 'MS-A4-ATK', name: '黏性蛛網', control: true,
        desSpImpactLevel: '低', durabilityTarget: '下',
        hitRule: '基礎命中70%', baseHit: 70, cooldown: 3,
        damageMultiplier: 0.5,
        controlTurns: 1,
        durabilityDamage: 5,
        desImpactAmount: 8,
        spDrainAmount: 5,
        specialEffects: [
          { type: 'statMod', targetStat: 'agi', amount: -20, duration: 2 },
          { type: 'statMod', targetStat: 'evade', amount: -20, duration: 2 }
        ],
        effectSummary: '造成 50% 物理傷害並束縛 1 回合。黏液損毀下半身 (耐久 -5)，造成微量恐懼 (DES +8，SP -5)，使玩家 AGI -20、閃避 -20 (持續 2 回合)。',
      },
    ],
    behaviorRules: ['優先噴射蛛網限制行動', '對被束縛目標進行持續叮咬'],
    jailbreakBehavior: ['蛛絲纏繞在腿間，隨著呼吸不斷收緊，黏液透過肌膚滲入敏感點'],
    hiddenTrigger: null,
    scalingHint: '深層增加蛛網的 SP 扣除量',
  },
  'A-5': {
    id: 'A-5',
    templateName: '迷宮幻蛾',
    tier: 'A',
    familyTag: '蟲系',
    baseStats: { hp: 30, atk: 8, hit: 60, evade: 45 },
    skillSet: [
      {
        id: 'MS-A5-ATK', name: '催情磷粉', control: false,
        desSpImpactLevel: '中', durabilityTarget: '無',
        hitRule: '基礎命中60%', baseHit: 60, cooldown: 2,
        damageMultiplier: 0.2,
        durabilityDamage: 0,
        desImpactAmount: 20,
        spDrainAmount: 10,
        specialEffects: [
          { type: 'statMod', targetStat: 'hit', amount: -30, duration: 1 }
        ],
        effectSummary: '造成 20% 物理傷害。吸入催情粉末導致慾望增加 (DES +20，SP -10)，並使玩家下回合命中 -30。',
      },
    ],
    behaviorRules: ['利用高閃避在空中盤旋', '頻繁散播磷粉干擾玩家'],
    jailbreakBehavior: ['磷粉讓角色視野變得粉紅模糊，吸入的每一口空氣都充滿了燥熱的慾望'],
    hiddenTrigger: null,
    scalingHint: '深層顯著提升閃避率',
  },
  'A-6': {
    id: 'A-6',
    templateName: '小哥布林',
    tier: 'A',
    familyTag: '亞人類',
    baseStats: { hp: 30, atk: 8, hit: 75, evade: 40 },
    skillSet: [
      {
        id: 'MS-A6-ATK', name: '撲上撕咬', control: false,
        desSpImpactLevel: '高', durabilityTarget: '上',
        hitRule: '基礎命中75%', baseHit: 75, cooldown: 1,
        damageMultiplier: 1.0,
        durabilityDamage: 25,
        desImpactAmount: 8,
        spDrainAmount: 0,
        specialEffects: [
          { type: 'statMod', targetStat: 'agi', amount: -5, duration: 2 }
        ],
        effectSummary: '造成 100% 物理傷害，並對上半身裝備造成大量損耗（耐久 -25），使目標 AGI -5（持續 2 回合）。',
      },
    ],
    behaviorRules: ['偏好撲向目標上身撕咬，優先破壞裝備並削弱行動速度'],
    jailbreakBehavior: ['小哥布林會鎖定上半身防具的脆弱處猛撲撕咬，試圖讓獵物失去平衡'],
    hiddenTrigger: null,
    scalingHint: '高迴避低血量的騷擾型 A 級怪物，命中後能有效拖慢目標節奏',
  },
  'B-7': {
    id: 'B-7',
    templateName: '墮落黑暗精靈',
    tier: 'B',
    familyTag: '人類系',
    baseStats: { hp: 80, atk: 18, hit: 85, evade: 30 },
    skillSet: [
      {
        id: 'MS-B7-A', name: '羞辱連刺', control: false,
        desSpImpactLevel: '中', durabilityTarget: '雙',
        hitRule: '基礎命中85%', baseHit: 85, cooldown: 1,
        damageMultiplier: 1.1,
        durabilityDamage: 25,
        desImpactAmount: 15,
        spDrainAmount: 5,
        effectSummary: '造成 110% 物理傷害。快速連擊專攻布料，大幅削減全身裝備 (耐久 -25)，引發羞恥心 (DES +15)。',
      },
      {
        id: 'MS-B7-B', name: '影之束縛', control: true,
        desSpImpactLevel: '高', durabilityTarget: '無',
        hitRule: '基礎命中65%', baseHit: 65, cooldown: 3,
        damageMultiplier: 0.5,
        controlTurns: 1,
        durabilityDamage: 0,
        desImpactAmount: 10,
        spDrainAmount: 5,
        effectSummary: '造成 50% 物理傷害並束縛 1 回合。陰影化為觸手限制行動，附加 DES +10，SP -5。',
      },
    ],
    behaviorRules: ['優先使用影之束縛', '目標受控時必定發動羞辱連刺'],
    jailbreakBehavior: ['用冰冷的刀鋒挑開角色的內衣，輕蔑地嘲笑那不爭氣的生理反應'],
    hiddenTrigger: { condition: '裝備完全損壞且被控制', chance: '10%', result: '進入SPECIAL' },
    scalingHint: '每進 4 層提高攻擊速度（連擊次數增加感）',
  },
  'B-8': {
    id: 'B-8',
    templateName: '煉獄犬',
    tier: 'B',
    familyTag: '獸系',
    baseStats: { hp: 110, atk: 24, hit: 75, evade: 10 },
    skillSet: [
      {
        id: 'MS-B8-A', name: '熔岩撕咬', control: false,
        desSpImpactLevel: '中', durabilityTarget: '雙',
        hitRule: '基礎命中75%', baseHit: 75, cooldown: 2,
        damageMultiplier: 1.5,
        durabilityDamage: 20,
        desImpactAmount: 10,
        spDrainAmount: 5,
        specialEffects: [
          { type: 'dot', targetStat: 'hp', amount: -10, duration: 3 }
        ],
        effectSummary: '造成 150% 物理傷害。帶來持續燒灼 (耐久 -20)，附加 DES +10，並造成燃燒狀態 (每回合 -10 HP)。',
      },
    ],
    behaviorRules: ['性格狂暴，無視防禦動作', '傾向於攻擊防禦值最低的部位'],
    jailbreakBehavior: ['灼熱的吐息在大腿內側留下焦痕，野獸的涎液因高溫而沸騰，燙紅了角色的肌膚'],
    hiddenTrigger: null,
    scalingHint: '深層增加燃燒傷害',
  },
  'B-9': {
    id: 'B-9',
    templateName: '寄生毒蜂后',
    tier: 'B',
    familyTag: '蟲系',
    baseStats: { hp: 95, atk: 20, hit: 75, evade: 25 },
    skillSet: [
      {
        id: 'MS-B9-A', name: '麻痺毒刺', control: true,
        desSpImpactLevel: '高', durabilityTarget: '無',
        hitRule: '基礎命中70%', baseHit: 70, cooldown: 3,
        damageMultiplier: 1.0,
        controlTurns: 1,
        durabilityDamage: 0,
        desImpactAmount: 15,
        spDrainAmount: 10,
        effectSummary: '造成 100% 物理傷害並麻痺 1 回合。毒素侵入體內，附加 DES +15，SP -10。',
      },
      {
        id: 'MS-B9-B', name: '卵管侵入', control: true,
        desSpImpactLevel: '極高', durabilityTarget: '下',
        hitRule: '基礎命中60%', baseHit: 60, cooldown: 5,
        damageMultiplier: 0.3,
        controlTurns: 1,
        durabilityDamage: 15,
        desImpactAmount: 40,
        spDrainAmount: 30,
        effectSummary: '造成 30% 物理傷害並強力控制 1 回合。強行將產卵管插入後穴 (耐久 -15)，注入大量催情毒素 (DES +40，SP -30)。',
      },
    ],
    behaviorRules: ['優先使用麻痺毒刺', '目標麻痺後積極嘗試卵管侵入'],
    jailbreakBehavior: ['冰冷的產卵管在體內蠕動，不斷噴射出灼熱的蜂毒與卵，讓角色在痛苦中感受到異常的受孕喜悅'],
    hiddenTrigger: { condition: '卵管侵入成功', chance: '15%', result: '進入SPECIAL' },
    scalingHint: '深層提高毒素造成的 SP 削減率',
  },
  'C-3': {
    id: 'C-3',
    templateName: '蛇人女王',
    tier: 'C',
    familyTag: '惡魔系',
    baseStats: { hp: 450, atk: 35, hit: 80, evade: 15 },
    skillSet: [
      {
        id: 'MS-C3-A', name: '劇毒絞殺', control: true,
        desSpImpactLevel: '高', durabilityTarget: '雙',
        hitRule: '基礎命中75%', baseHit: 75, cooldown: 3,
        damageMultiplier: 1.2,
        controlTurns: 1,
        durabilityDamage: 25,
        desImpactAmount: 20,
        spDrainAmount: 10,
        effectSummary: '造成 120% 物理傷害並纏繞 1 回合。死命絞緊破壞衣物 (耐久 -25)，附加 DES +20，SP -10。',
      },
      {
        id: 'MS-C3-B', name: '淫靡凝視', control: true,
        desSpImpactLevel: '極高', durabilityTarget: '無',
        hitRule: '基礎命中65%', baseHit: 65, cooldown: 4,
        damageMultiplier: 0,
        controlTurns: 1,
        durabilityDamage: 0,
        desImpactAmount: 35,
        spDrainAmount: 15,
        effectSummary: '造成無傷害控制 1 回合。石化理智，引發劇烈慾望與絕望 (DES +35，SP -15)。',
      },
      {
        id: 'MS-C3-ULT', name: '女王的育苗床', control: true,
        desSpImpactLevel: '極高', durabilityTarget: '下',
        hitRule: '條件觸發', baseHit: 100, cooldown: 8,
        damageMultiplier: 3.0,
        controlTurns: 99,
        durabilityDamage: 100,
        desImpactAmount: 100,
        spDrainAmount: 100,
        effectSummary: '啟動 SPECIAL。強制進入產卵流程。(觸發 Bad End)',
      },
    ],
    behaviorRules: ['頻繁使用凝視中斷玩家行動', '血量低於 50% 後積極嘗試產卵'],
    jailbreakBehavior: ['冰冷的蛇鱗摩擦著滾燙的下體，鮮紅的信子在耳邊噝噝作響，宣布角色將成為女王的孕巢'],
    hiddenTrigger: { condition: '觸發女王的育苗床', chance: '100%', result: '進入SPECIAL' },
    scalingHint: '首領等級，不隨層數變化',
  },
};

/** Scale a monster's base stats by floor */
export function scaleMonster(def: MonsterDef, floor: number): MonsterDef['baseStats'] {
  const s = { ...def.baseStats };
  const depth = Math.max(0, floor - 1);

  switch (def.tier) {
    case 'A':
      s.hp += Math.floor(depth * 2.5);
      s.atk += Math.floor(depth * 0.5);
      s.hit = Math.min(s.hit + Math.floor(depth * 0.8), 80);
      s.evade = Math.min(s.evade + Math.floor(depth * 0.5), 35);
      break;
    case 'B':
      s.hp += Math.floor(depth * 3);
      s.atk += Math.floor(depth * 0.8);
      s.hit = Math.min(s.hit + Math.floor(depth * 0.5), 85);
      s.evade = Math.min(s.evade + Math.floor(depth * 0.3), 40);
      break;
    case 'C':
      // Bosses don't scale much
      s.hp += Math.floor(depth * 1);
      s.hit = Math.min(s.hit + Math.floor(depth * 0.3), 95);
      break;
  }
  return s;
}

export function getMonstersByTier(tier: MonsterDef['tier']): MonsterDef[] {
  return Object.values(MONSTER_DB).filter((m) => m.tier === tier);
}

export function getMonsterDef(id: string): MonsterDef | undefined {
  return MONSTER_DB[id];
}
