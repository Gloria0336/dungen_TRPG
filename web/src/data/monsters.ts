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
        hitRule: '基礎命中65%', effectSummary: '造成傷害；小概率影響下半身耐久',
        baseHit: 65,
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
        hitRule: '基礎命中60%', effectSummary: '造成輕微傷害並嘗試束縛下半身',
        baseHit: 60,
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
    baseStats: { hp: 50, atk: 14, hit: 75, evade: 25 },
    skillSet: [
      {
        id: 'MS-A3-ATK', name: '卑劣切擊', control: false,
        desSpImpactLevel: '中', durabilityTarget: '上',
        hitRule: '基礎命中75%', effectSummary: '快速的斬擊，高機率損毀服裝',
        baseHit: 75,
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
        hitRule: '基礎命中70%', effectSummary: '單體傷害；偏向削弱上半身耐久',
        baseHit: 70,
      },
      {
        id: 'MS-B1-B', name: '繩套壓制', control: true,
        desSpImpactLevel: '中', durabilityTarget: '無',
        hitRule: '基礎命中60%', effectSummary: '嘗試施加控制1回合',
        baseHit: 60,
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
        hitRule: '基礎命中60%', effectSummary: '使玩家進入混亂或麻痺狀態，持續減少 SP',
        baseHit: 60,
      },
      {
        id: 'MS-B2-B', name: '肉壺吞噬', control: true,
        desSpImpactLevel: '中', durabilityTarget: '下',
        hitRule: '基礎命中70%（對已控制目標必中）', effectSummary: '將玩家下半身包覆，大幅消耗耐久並吸取精力',
        baseHit: 70,
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
        hitRule: '基礎命中75%（WIL 抗性可修正）', effectSummary: '魅惑玩家 1 回合，SP 大幅下降',
        baseHit: 75,
      },
      {
        id: 'MS-B3-B', name: '淫紋刻印', control: false,
        desSpImpactLevel: '高', durabilityTarget: '雙',
        hitRule: '基礎命中65%', effectSummary: '造成 DES 劇增，並在角色身上留下發情的印記',
        baseHit: 65,
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
        hitRule: '基礎命中70%', effectSummary: '高物理傷害，對防禦有破甲效果',
        baseHit: 70,
      },
      {
        id: 'MS-B4-B', name: '野蠻擄獲', control: true,
        desSpImpactLevel: '高', durabilityTarget: '上',
        hitRule: '基礎命中60%', effectSummary: '將玩家強行抱起並壓制，大幅破壞上半身衣物',
        baseHit: 60,
      },
      {
        id: 'MS-B4-C', name: '肉鎧束縛', control: true,
        desSpImpactLevel: '高', durabilityTarget: '雙',
        hitRule: '基礎命中50%（對已控制目標必中）', effectSummary: '強制破除玩家全身裝備耐久並綁縛在身上3回合',
        baseHit: 50,
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
        hitRule: '基礎命中75%', effectSummary: '造成流血效果，每回合額外扣除 HP',
        baseHit: 75,
      },
      {
        id: 'MS-B5-B', name: '發狂撲擊', control: true,
        desSpImpactLevel: '高', durabilityTarget: '雙',
        hitRule: '基礎命中65%', effectSummary: '將玩家撲倒在身下，進行瘋狂的抓撓與壓制',
        baseHit: 65,
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
        hitRule: '基礎命中75%', effectSummary: '造成基礎傷害，並增加下回合命中率 20%',
        baseHit: 75,
      },
      {
        id: 'MS-B6-B', name: '尻子玉獲得', control: true,
        desSpImpactLevel: '極高', durabilityTarget: '下',
        hitRule: '基礎命中55%', effectSummary: '從後穴取出尻子玉；玩家閃避與 WIL 大幅下降',
        baseHit: 55,
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
        hitRule: '基礎命中85%', effectSummary: '從頸部吸取血液，自身回復傷害 50% 的 HP，玩家 SP 驟降',
        baseHit: 85,
      },
      {
        id: 'MS-C1-B', name: '暗影禁錮', control: true,
        desSpImpactLevel: '高', durabilityTarget: '無',
        hitRule: '基礎命中75%（WIL 判定）', effectSummary: '召喚暗影將玩家全身束縛，無視閃避',
        baseHit: 75,
      },
      {
        id: 'MS-C1-ULT', name: '血紅祭禮（大招）', control: false,
        desSpImpactLevel: '極高', durabilityTarget: '雙',
        hitRule: '基礎命中90%', effectSummary: '對全體目標造成毀滅性打擊，並大幅提升自身所有屬性',
        baseHit: 90,
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
        hitRule: '基礎命中75%', effectSummary: '較高傷害；同時影響上下半身耐久（小幅）',
        baseHit: 75,
      },
      {
        id: 'MS-C2-B', name: '號令壓迫', control: true,
        desSpImpactLevel: '高', durabilityTarget: '無',
        hitRule: '基礎命中60%', effectSummary: '嘗試施加控制；並造成較高精神壓力',
        baseHit: 60,
      },
      {
        id: 'MS-C2-ULT', name: '王之裁決（大招）', control: false,
        desSpImpactLevel: '高', durabilityTarget: '上',
        hitRule: '基礎命中80%', effectSummary: '強力攻擊；大招僅在冷卻結束或觸發條件達成時使用',
        baseHit: 80,
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
