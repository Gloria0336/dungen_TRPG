import type { EventDef } from '../types';

export const EVENT_DB: Record<string, EventDef> = {
  'EV-TRAP-001': {
    id: 'EV-TRAP-001',
    templateName: '鬆動石板陷阱',
    phase: 'EVENT',
    triggerContext: 'REST打斷 / 探索',
    eventType: '陷阱',
    descriptionStub: [
      '地面突然下陷，碎石與機關聲同時響起。',
      '你必須立刻反應，否則將承受損失。',
    ],
    jailbreakDescription: [
      '陷阱觸發，將你推向地面並極力磨蹭你的敏感私處。',
      '機械式的摩擦讓你幾乎要在慘叫中夾雜著嬌喘。',
    ],
    options: [
      {
        id: 'OP-TRAP-001-A',
        label: '迅速後撤（敏捷檢定）',
        requiredCheck: 'AGI檢定 (1D100 <= 50 + AGI*5 + 10)',
        successEffects: 'Upper/Lower耐久 -0；Phase->REST',
        failEffects: 'Upper耐久 -15；HP -10；Phase->REST',
      },
      {
        id: 'OP-TRAP-001-B',
        label: '硬扛通過',
        requiredCheck: '無',
        successEffects: 'HP -5；Upper耐久 -10；Phase->REST',
        failEffects: '無',
      },
    ],
    combatSpawn: null,
    stateChanges: ['HP', 'Upper', 'Phase'],
  },
  'EV-EXPLORE-001': {
    id: 'EV-EXPLORE-001',
    templateName: '可疑的史萊姆池',
    phase: 'EVENT',
    triggerContext: '探索',
    eventType: '風險/獎勵',
    descriptionStub: [
      '你在死胡同發現了一池發出微光的史萊姆黏液。',
      '黏液深處隱約有什麼裝備或金幣在閃閃發亮。'
    ],
    jailbreakDescription: [
      '那些半透明的黏液似乎有著自我意識，正飢渴地蠕動著等待年輕的肉體。',
      '一旦你把手伸進去，它們會毫不留情地順著手臂攀爬、溶解你的衣物並貪婪地侵犯你的私密處。'
    ],
    options: [
      {
        id: 'OP-EXPLORE-001-A',
        label: '忍著噁心伸手撈取（DEX檢定）',
        requiredCheck: 'DEX檢定 (1D100 <= 50 + DEX*5)',
        successEffects: '獲得 隨機道具 x1；Phase->REST',
        failEffects: 'Upper耐久 -15；Lower耐久 -15；DES +20；Phase->REST'
      },
      {
        id: 'OP-EXPLORE-001-B',
        label: '太危險了，繞道而行',
        requiredCheck: '無',
        successEffects: 'Phase->REST',
        failEffects: '無'
      }
    ],
    combatSpawn: null,
    stateChanges: ['Inventory', 'Upper', 'Lower', 'DES', 'Phase']
  },
  'EV-TRAP-002': {
    id: 'EV-TRAP-002',
    templateName: '催情毒霧',
    phase: 'EVENT',
    triggerContext: '探索 / 移動',
    eventType: '陷阱',
    descriptionStub: [
      '通道中突然噴發出粉紅色的刺鼻氣體，讓你感到頭暈目眩。',
      '你的呼吸開始急促，身體深處湧現出一股異常的燥熱。'
    ],
    jailbreakDescription: [
      '這是一種能瞬間瓦解防備與理智的強烈媚藥毒霧。',
      '吸入後，你的大腦會被強烈的發情慾望佔據，甚至產生了想要主動剝去衣物、隨便找個怪物發洩的淫蕩衝動。'
    ],
    options: [
      {
        id: 'OP-TRAP-002-A',
        label: '憋氣衝刺（WIL檢定）',
        requiredCheck: 'WIL檢定 (1D100 <= 50 + WIL*5 + 10)',
        successEffects: 'HP -2；Phase->REST',
        failEffects: 'HP -5；DES +30；Phase->REST'
      },
      {
        id: 'OP-TRAP-002-B',
        label: '消耗解毒劑強行通過',
        requiredCheck: '需持有 解毒劑',
        successEffects: '消耗解毒劑 x1；完全免疫；Phase->REST',
        failEffects: '沒有解毒劑無法選擇此項'
      }
    ],
    combatSpawn: null,
    stateChanges: ['HP', 'DES', 'Inventory', 'Phase']
  },
  'EV-TRADE-001': {
    id: 'EV-TRADE-001',
    templateName: '淫魔的祭壇',
    phase: 'EVENT',
    triggerContext: '探索最深處 / 隱藏房間',
    eventType: '中立/交易',
    descriptionStub: [
      '你發現了一座散發著不詳氣息的祭壇，上面刻滿了魅魔與觸手的浮雕。',
      '祭壇上有一行字：『獻上純潔與羞恥，換取無上的祝福。』'
    ],
    jailbreakDescription: [
      '祭壇上的觸手雕像彷彿活物般蠕動著，散發出令人腿軟的甜膩香氣。',
      '只要你願意在這裡屈辱地脫光衣服，任由魔法觸手肆意蹂躪你的敏感帶，邪神便會滿足你的願望。'
    ],
    options: [
      {
        id: 'OP-TRADE-001-A',
        label: '獻上肉體接受屈辱（無檢定）',
        requiredCheck: '無',
        successEffects: '全身衣裝移除；DES +30；獲得詛咒：DES增加效率*1.2（解除條件：前進五層後自動解除）；Phase->REST',
        successStatusEffects: [
          {
            name: '淫紋烙印',
            duration: null,
            effect: 'DES增加效率 x1.2',
            type: 'buff',
            category: 'curse',
            expiresOnBattleEnd: false,
            removalCondition: '前進五層後自動解除',
            targetStat: 'desGain',
            amount: 20,
          },
        ],
        failEffects: '無'
      },
      {
        id: 'OP-TRADE-001-B',
        label: '暴力摧毀祭壇（STR檢定）',
        requiredCheck: 'STR檢定 (1D100 <= 40 + STR*5)',
        successEffects: '獲得 貴重戰利品 x1；Phase->REST',
        failEffects: '遭到詛咒 HP -15；DES +20；Phase->REST'
      },
      {
        id: 'OP-TRADE-001-C',
        label: '不理會直接離開',
        requiredCheck: 'WIL檢定(1D100 <= 40 + WIL*4)',
        successEffects: 'Phase->REST',
        failEffects: '離開時仍被不詳的氣息沾染，DES +10'
      }
    ],
    combatSpawn: null,
    stateChanges: ['Upper', 'Lower', 'DES', 'HP', 'MaxHP', 'Inventory', 'Phase']
  },
  'EV-CHEST-001': {
    id: 'EV-CHEST-001',
    templateName: '隱藏的寶箱',
    phase: 'EVENT',
    triggerContext: '探索',
    eventType: '獎勵/陷阱',
    descriptionStub: [
      '你在一個不起眼的磚牆後發現了一個古老的寶箱。',
      '上面並沒有上鎖，但直覺告訴你事情沒那麼簡單。'
    ],
    jailbreakDescription: [
      '寶箱周圍散發著微弱的魔法波動，似乎隱藏著針對女性探險者的惡意淫紋陷阱。',
      '如果大意打開，可能會被噴灑一身發情媚藥，或是被暗藏的觸手直接拖進去強制高潮。'
    ],
    options: [
      {
        id: 'OP-CHEST-001-A',
        label: '仔細檢查後打開（INT檢定）',
        requiredCheck: 'INT檢定 (1D100 <= 50 + INT*5)',
        successEffects: '獲得 貴重戰利品 x1；Phase->REST',
        failEffects: '觸發粉紅毒氣：Upper/Lower耐久 -10；DES +25；獲得 普通道具 x1；Phase->REST'
      },
      {
        id: 'OP-CHEST-001-B',
        label: '粗暴地直接砸開（STR檢定）',
        requiredCheck: 'STR檢定 (1D100 <= 40 + STR*5)',
        successEffects: '觸發陷阱但強行拿走物品：HP -5；獲得 貴重戰利品 x1；Phase->REST',
        failEffects: '被觸手捕獲噴灑媚藥：HP -15；DES +30；Phase->REST'
      },
      {
        id: 'OP-CHEST-001-C',
        label: '無視它離開',
        requiredCheck: '無',
        successEffects: 'Phase->REST',
        failEffects: '無'
      }
    ],
    combatSpawn: null,
    stateChanges: ['Inventory', 'Upper', 'Lower', 'DES', 'HP', 'Phase']
  },
  'EV-COMBAT-001': {
    id: 'EV-COMBAT-001',
    templateName: '突如其來的遭遇戰',
    phase: 'EVENT',
    triggerContext: '探索 / 移動',
    eventType: '戰鬥',
    descriptionStub: [
      '當你穿過昏暗的走廊時，陰影中突然竄出了伏擊的魔物！',
      '你沒有退路，只能拔出身上的武器迎戰。'
    ],
    jailbreakDescription: [
      '那些躲在暗處的魔物早就盯上了你豐滿的身體，它們淫笑著流著口水，準備撕裂你的防具。',
      '如果你戰敗，等待你的將是被拖進巢穴中，淪為無止盡的肉便器與交尾地獄。'
    ],
    options: [
      {
        id: 'OP-COMBAT-001-A',
        label: '準備迎戰（無檢定）',
        requiredCheck: '無',
        successEffects: '進入戰鬥階段；Phase->COMBAT',
        failEffects: '無'
      },
      {
        id: 'OP-COMBAT-001-B',
        label: '嘗試突圍逃跑（AGI檢定）',
        requiredCheck: 'AGI檢定 (1D100 <= 40 + AGI*5)',
        successEffects: '驚險逃脫：HP -5；Phase->REST',
        failEffects: '逃脫失敗，被敵人按倒在地：HP -10；Upper/Lower耐久 -5；Phase->COMBAT'
      }
    ],
    combatSpawn: { pool: '常規遇敵池', count: '1D3' } as any,
    stateChanges: ['Phase', 'HP', 'Upper', 'Lower']
  },
  'EV-SPRING-001': {
    id: 'EV-SPRING-001',
    templateName: '神秘的治癒泉水',
    phase: 'EVENT',
    triggerContext: '探索 / 休息',
    eventType: '中立/獎勵',
    descriptionStub: [
      '你在洞穴林地深處發現了一座散發著柔和微光的泉水。',
      '水質清澈見底，空氣中瀰漫著讓人放鬆的奇異香氣。'
    ],
    jailbreakDescription: [
      '泉水雖然能奇蹟般治癒傷口，但水中蘊含的魅魔魔力會讓你的身體變得極度敏感發情。',
      '當你脫下破爛的防具浸泡在泉水中時，水流彷彿有一雙雙無形的手在揉捏你的私處，讓你不禁閉上眼發出舒服的嬌喘。'
    ],
    options: [
      {
        id: 'OP-SPRING-001-A',
        label: '脫衣全身浸泡（無檢定）',
        requiredCheck: '無',
        successEffects: '全狀態恢復；HP +50；SP +80；DES +30；Phase->REST',
        failEffects: '無'
      },
      {
        id: 'OP-SPRING-001-B',
        label: '只裝入空瓶（需要空瓶）',
        requiredCheck: '需持有 空瓶',
        successEffects: '獲得 治療藥水 x1；消耗空瓶 x1；Phase->REST',
        failEffects: '沒有空瓶無法選擇此項'
      },
      {
        id: 'OP-SPRING-001-C',
        label: '僅在泉水邊淺嚐並稍作休息',
        requiredCheck: '無',
        successEffects: 'HP +15；SP +30；DES +5；Phase->REST',
        failEffects: '無'
      }
    ],
    combatSpawn: null,
    stateChanges: ['HP', 'DES', 'Inventory', 'Phase']
  }
};

/** Get a random event for current context */
export function getRandomEvent(): EventDef {
  const events = Object.values(EVENT_DB);
  return events[Math.floor(Math.random() * events.length)];
}
