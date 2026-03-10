import type { SpecialProgressionDef } from '../types';

export const SPECIAL_PROGRESSION_DB: Record<string, SpecialProgressionDef> = {
  'SPC-001': {
    id: 'SPC-001',
    name: '特殊支線範例',
    applicablePhase: 'SPECIAL',
    entrySource: 'hidden_trigger',
    baseTurnLimit: 4,
    structure: {
      turn_1: {
        focus: '第 1 回合的核心狀態／壓力',
        allowedActions: ['嘗試掙脫', '觀察', '保守應對'],
        notes: '給 AI 的節奏提示',
      },
      turn_2: {
        focus: '第 2 回合的變化或壓力升高',
        allowedActions: ['行動類型'],
      },
      turn_3: {
        focus: '第 3 回合的關鍵分歧',
        allowedActions: ['行動類型'],
      },
      turn_4: {
        focus: '第 4 回合的臨界點',
        allowedActions: ['行動類型'],
      },
    },
    earlyExit: {
      description: '可提前結束 SPECIAL 的方式說明',
      checkType: '判定式',
      checkRule: 'WIL 檢定',
      successTransition: 'EXPLORE',
    },
    postLimitTransition: {
      onExceed: '10.2',
      description: '進入 10.2 時的狀態方向描述，非最終結果',
    },
    possibleOutcomes: {
      outcome_A: '後果方向 A：偏短期影響',
      outcome_B: '後後果方向 B：偏長期影響',
    },
    narrativeTags: ['NT-____'],
    systemNotes: ['給 AI 的運作提醒'],
  },
  'SPC-VINE-TRAP': {
    id: 'SPC-VINE-TRAP',
    name: '藤蔓苗床陷阱',
    applicablePhase: 'SPECIAL',
    entrySource: 'hidden_trigger',
    baseTurnLimit: 4,
    structure: {
      turn_1: {
        focus: '腳下突然崩塌，墜入佈滿古樹藤蔓的坑洞中，藤蔓開始纏繞雙腿與腰部',
        allowedActions: ['嘗試掙脫', '靜觀其變', '使用鋒利武器切割'],
        notes: '重點描寫藤蔓表皮的粗糙感，以及其分泌的微弱催情黏液帶來的異常感',
      },
      turn_2: {
        focus: '藤蔓感受到獵物的掙扎，逐漸收緊並開始鑽入衣物縫隙，下半身裝備耐久開始受損',
        allowedActions: ['全力反抗', '專注保護脆弱部位'],
        notes: '壓力指數(DES)開始因黏液與拘束感而提升',
      },
      turn_3: {
        focus: '更多藤蔓湧現，將角色完全懸吊半空中，藤蔓前端開始探向私處並嘗試抽插',
        allowedActions: ['咬牙忍耐', '發動技能爆發'],
        notes: '如果玩家此回合未能脫逃，下回合將面臨徹底淪陷的臨界點',
      },
      turn_4: {
        focus: '理智與體力的雙重極限，藤蔓即將把角色徹底包裹成用於產卵的苗床',
        allowedActions: ['做最後的殊死搏鬥', '放棄抵抗'],
        notes: '這回合的掙扎會是最絕望的描寫',
      },
    },
    earlyExit: {
      description: '用力掙斷藤蔓或斬除核心',
      checkType: '判定式',
      checkRule: 'STR 檢定 或 消耗高額 SP 施放攻擊技能',
      successTransition: 'EXPLORE',
    },
    postLimitTransition: {
      onExceed: '10.2',
      description: '角色徹底失去反抗能力，被藤蔓吞噬並強制進入 Bad End 或長期拘禁的結算流程',
    },
    possibleOutcomes: {
      outcome_A: '衣服大幅破損，帶著滿身黏液與高額 DES 勉強逃出坑洞',
      outcome_B: '被吸乾 SP，進入為期數小時的發情無力狀態',
    },
    narrativeTags: ['觸手', '拘束', '催淫', '異種交配危險'],
    systemNotes: ['本 SPECIAL 重點在於表現肉體拘束與催淫黏液帶來的心理壓力(DES)，HP傷害應偏低，主要削弱SP與增加DES'],
  },
  'SPC-ORC-ARMOR': {
    id: 'SPC-ORC-ARMOR',
    name: '永久肉鎧奴隸',
    applicablePhase: 'SPECIAL',
    entrySource: 'hidden_trigger',
    baseTurnLimit: 4,
    structure: {
      turn_1: {
        focus: '獸人以絕對的力量將角色壓制，粗暴地扯碎裝備，並將角色的身體反綁在自己胸前',
        allowedActions: ['嘗試掙脫', '護住要害'],
        notes: '強調力量上的徹底輾壓與被迫貼近異種肉體的絕望感，角色的裝備耐久大幅受損',
      },
      turn_2: {
        focus: '獸人開始在迷宮中大步行走，每一次震動都讓獸人粗糙的下體摩擦著角色裸露的私處',
        allowedActions: ['扭動閃避', '屈辱地忍受'],
        notes: '角色被迫作為『肉鎧』承受環境與怪物的摩擦，DES 快速上升，並伴隨難以啟齒的快感',
      },
      turn_3: {
        focus: '獸人進入發情狀態，強行掰開角色的雙腿，準備在移動中進行強暴式貫穿',
        allowedActions: ['死命並攏雙腿', '哀求放過'],
        notes: '如果無法逃脫，這將是最後的防線被突破的時刻。AI應描寫體力與意志即將崩潰的邊緣',
      },
      turn_4: {
        focus: '角色的抵抗越來越微弱，獸人的粗大即將完全侵入，將其徹底轉變為隨身攜帶的洩慾玩具',
        allowedActions: ['做最後的殊死搏鬥', '絕望放棄'],
        notes: '最後一搏，此回合充滿了強迫與失控的暴力美學',
      },
    },
    earlyExit: {
      description: '利用地形死角或突發的爆發力掙脫鎖鏈/綁縛',
      checkType: '判定式',
      checkRule: 'AGI 檢定 或 消耗剩餘武器賭命一擊',
      successTransition: 'EXPLORE',
    },
    postLimitTransition: {
      onExceed: '10.2',
      description: '防線徹底崩潰，被獸人貫穿並強行帶走，進入長期凌辱的結算環節',
    },
    possibleOutcomes: {
      outcome_A: '身體留下大量的抓痕與精液，HP 與裝備耐久見底，勉強逃走',
      outcome_B: '身心受到極大創傷，DES 爆表，並對獸人的氣味產生屈辱的條件反射',
    },
    narrativeTags: ['凌辱', '體型差', '拘束', '強暴'],
    systemNotes: ['此事件中 HP 與裝備耐久會受到顯著損傷，成功逃脫後玩家將處於極度危險與屈辱的狀態'],
  },
  'SPC-KAPPA-TOY': {
    id: 'SPC-KAPPA-TOY',
    name: '河童飛機杯性玩具',
    applicablePhase: 'SPECIAL',
    entrySource: 'hidden_trigger',
    baseTurnLimit: 4,
    structure: {
      turn_1: {
        focus: '河童滑膩的手指強行探入後庭，以難以置信的技巧在一陣酥麻與劇痛中取出了『尻子玉』',
        allowedActions: ['痛苦哀嚎', '試圖奪回'],
        notes: '尻子玉被取出的瞬間，角色的 WIL 直接降至冰點，失去大部分力氣',
      },
      turn_2: {
        focus: '失去尻子玉的角色如同失去靈魂的人偶，河童毫不客氣地將粗俗的陰莖對準門戶大開的後穴',
        allowedActions: ['無力的推擠', '失神流淚'],
        notes: '強調失去反抗能力後的任人宰割，DES 急劇上升(無 WIL 減免)',
      },
      turn_3: {
        focus: '河童開始了無情的瘋狂抽插，將角色的後庭直接當成發洩性慾的工具杯',
        allowedActions: ['大口喘氣', '無意識地迎合'],
        notes: '大量污濁的精液灌注，角色的理智開始溶解於原始的快感與屈辱中',
      },
      turn_4: {
        focus: '河童準備施加更深層次的精神污染，將被污染的尻子玉重新塞回並固定',
        allowedActions: ['發出最後的悲鳴', '徹底淪陷'],
        notes: '這回合的重點在於『不可逆轉的改造』的恐懼感',
      },
    },
    earlyExit: {
      description: '在河童鬆懈的瞬間發動奇襲，或者靠著突來的劇痛強行喚醒理智',
      checkType: '判定式',
      checkRule: '困難的 WIL 檢定 或 依靠隊友/特殊道具中斷',
      successTransition: 'EXPLORE',
    },
    postLimitTransition: {
      onExceed: '10.2',
      description: '理智徹底喪失，被河童拖入水潭深處，成為永遠發情的肉壺玩具',
    },
    possibleOutcomes: {
      outcome_A: '雖然逃離，但後穴被嚴重擴張，走路時會不自覺地滴出淫液',
      outcome_B: '被裝備『被污染的尻子玉』，進入長期且難以解除的發情與易受控狀態',
    },
    narrativeTags: ['精神控制', '後庭', '失禁', '玩具化', '異常快感'],
    systemNotes: ['本 SPECIAL 啟動後，角色的閃避率與防禦行動視為幾乎無效，脫逃極度困難，主要帶來毀滅性的 DES 成長'],
  },
  'SPC-SUCCUBUS-DOLL': {
    id: 'SPC-SUCCUBUS-DOLL',
    name: '魅魔人偶奴隸',
    applicablePhase: 'SPECIAL',
    entrySource: 'hidden_trigger',
    baseTurnLimit: 4,
    structure: {
      turn_1: {
        focus: '吸入濃郁的催情香氣，視野變得粉紅模糊，魅魔的呢喃彷彿直接在腦海中迴盪',
        allowedActions: ['緊咬嘴唇', '施放淨化魔法'],
        notes: '常識開始崩壞的第一步，SP 被大量轉化為燥熱的情慾',
      },
      turn_2: {
        focus: '魅魔用尾巴與舌頭挑逗角色的每一處敏感帶，讓角色不由自主地發出甜膩的嬌喘',
        allowedActions: ['流著口水抵抗', '跪求更多'],
        notes: '角色在回合中可能會自動做出迎合的動作(檢定失敗時)，展現出不受大腦控制的反差',
      },
      turn_3: {
        focus: '魅魔強迫角色直視鏡子(或水面)中自己淫蕩不堪的模樣，並刻下代表從屬的淫紋',
        allowedActions: ['閉上眼睛', '羞恥地高潮'],
        notes: '心理防線的崩潰點，認同自己是一件『為了高潮而生的人偶』',
      },
      turn_4: {
        focus: '魅魔下達最後的指令，要求角色主動張開雙腿，乞求主人給予最終的恩賜',
        allowedActions: ['用最後的理智自殘', '完全服從'],
        notes: '描寫角色主動墮落的過程與魅魔充滿支配慾的微笑',
      },
    },
    earlyExit: {
      description: '利用強烈的痛覺或意志爆發擺脫催眠香氣',
      checkType: '判定式',
      checkRule: 'WIL 檢定（需扣除已累積的 DES 懲罰）',
      successTransition: 'EXPLORE',
    },
    postLimitTransition: {
      onExceed: '10.2',
      description: '角色身心完全沉淪，帶著笑容成為魅魔的專屬雌犬，進入 Bad End',
    },
    possibleOutcomes: {
      outcome_A: '清醒後陷入極度的自我厭惡，但身體已記住了那份快感 (DES 基礎值提高)',
      outcome_B: '身上被留下淡淡的淫紋，遇到惡魔系怪物時必定處於劣勢或無力抵抗',
    },
    narrativeTags: ['催眠', '主奴', '常識改造', '惡墮'],
    systemNotes: ['這是一個著重於心理轉變與常識破壞的 SPECIAL，成功脫逃後可以給予玩家一個『異常成癮』的 Debuff'],
  },
  'SPC-VAMPIRE-COW': {
    id: 'SPC-VAMPIRE-COW',
    name: '吸血鬼伯爵乳汁母牛',
    applicablePhase: 'SPECIAL',
    entrySource: 'hidden_trigger',
    baseTurnLimit: 4,
    structure: {
      turn_1: {
        focus: '伯爵以壓倒性的力量將角色按倒，尖牙沒入柔軟的頸脖，冰冷與奇異的快感瞬間傳遍全身',
        allowedActions: ['推開伯爵', '試圖施法'],
        notes: '吸血鬼的咬噬帶有強烈麻痺與催情效果，角色 HP 小幅下降 but SP 凍結',
      },
      turn_2: {
        focus: '伯爵一邊品嘗甜美的鮮血，一邊粗暴地揉捏角色的雙乳，下達將其改造為血奶母牛的宣告',
        allowedActions: ['無力的掙扎', '因狂喜而顫抖'],
        notes: '胸部逐漸變得脹痛敏感，產生一種『需要被擠奶』的錯覺與渴望',
      },
      turn_3: {
        focus: '伯爵的魔力注入體內，強行催乳，大量的白濁混合著微弱血絲從胸前噴湧而出',
        allowedActions: ['捂住胸口', '屈辱地任其吸吮'],
        notes: '視覺與觸覺的雙重凌辱，角色被迫看著自己的身體變異為產奶的機器',
      },
      turn_4: {
        focus: '失血導致視線模糊，胸前卻傳來被吸吮的極大快感，理智即將被這種本末倒置的幸福感吞沒',
        allowedActions: ['趁伯爵沉醉時反擊', '徹底沉浸在母牛的本能中'],
        notes: '生死存亡的邊緣，角色需要克服『不願離開這種快感』的障礙',
      },
    },
    earlyExit: {
      description: '利用神聖屬性或強光，趁伯爵進食鬆懈時進行反饋',
      checkType: '判定式',
      checkRule: 'AGI/WIL 雙重檢定 或 使用對應道具(如聖水)',
      successTransition: 'EXPLORE',
    },
    postLimitTransition: {
      onExceed: '10.2',
      description: '角色徹底沉溺於被吸血與榨乳的快感，被帶回古堡成為永生的產奶血奴',
    },
    possibleOutcomes: {
      outcome_A: '胸部變得異常敏感腫脹，每次戰鬥或移動都會帶來沉重的負擔與發情',
      outcome_B: '嚴重貧血(HP 上限暫時下降)，且對吸血鬼的恐懼轉變為病態的渴求',
    },
    narrativeTags: ['吸血', '身體改造', '榨乳', '異種奴役'],
    systemNotes: ['本事件融合了 HP 汲取與身體改造的要素，應提醒 AI 描寫『疼痛轉化為快感』的過程'],
  },
};

export function getSpecialProgressionDef(id: string): SpecialProgressionDef | undefined {
  return SPECIAL_PROGRESSION_DB[id];
}
