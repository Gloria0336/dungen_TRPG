import type { CounterDef } from '../types';

export const COUNTER_DB: Record<string, CounterDef> = {
  'CT-GOBLIN-SAINT': {
    id: 'CT-GOBLIN-SAINT',
    monsterFamily: ['哥布林系'],
    targetClass: ['教團聖女'],
    counterType: 'normal',
    numericalEffects: { hitRate: 5, desDelta: 15, drDelta: -10, duration: '本戰鬥' },
    narrativePreferenceTags: ['NRT-DOMINANCE', 'NRT-DEGRADATION'],
    counterReason: ['哥布林文化將純潔與信仰視為可踐踏的象徵，對聖女的精神造成明顯壓迫。'],
    jailbreakReason: ['哥布林瘋狂地垂涎聖女的子宮，企圖将其變成專用的產卵床與發洩箱。'],
    backgroundHooks: ['TAG-FAITH', 'NT-FAITHED'],
  },
  'CT-SLIME-KNIGHT': {
    id: 'CT-SLIME-KNIGHT',
    monsterFamily: ['史萊姆系'],
    targetClass: ['王國騎士'],
    counterType: 'normal',
    numericalEffects: { hitRate: 5, damage: 10, drDelta: -15, duration: '本戰鬥' },
    narrativePreferenceTags: ['NRT-INFERIORITY', 'NRT-RESTRAINT'],
    counterReason: ['黏著與腐蝕性使重甲行動受限，防護反而成為負擔。'],
    jailbreakReason: ['液體滲入鎧甲縫隙，如同無數條小舌頭舔舐著騎士敏感的肉體，讓他因無法排解的快感而脫力。'],
    backgroundHooks: ['TAG-MILITARY'],
  },
  'CT-UNDEAD-MAGE': {
    id: 'CT-UNDEAD-MAGE',
    monsterFamily: ['不死／吸血鬼系'],
    targetClass: ['法師'],
    counterType: 'normal',
    numericalEffects: { hitRate: 5, spDelta: -15, desDelta: 10, duration: '本戰鬥' },
    narrativePreferenceTags: ['NRT-FEAR', 'NRT-OVERWHELM'],
    counterReason: ['不死者對理性與奧術秩序的無視，干擾法師的精神集中。'],
    jailbreakReason: ['不死者的冰冷氣息侵入法師的秘所，讓她在戰慄與失神中，身體不自覺地為死者排卵與潮紅。'],
    backgroundHooks: ['TAG-ACADEMY', 'NT-SCHOLAR'],
  },
  'CT-DEMON-ASSASSIN': {
    id: 'CT-DEMON-ASSASSIN',
    monsterFamily: ['媚魔／惡魔系'],
    targetClass: ['流亡刺客'],
    counterType: 'normal',
    numericalEffects: { hitRate: 10, desDelta: 20, duration: '本戰鬥' },
    narrativePreferenceTags: ['NRT-TEMPTATION', 'NRT-LOSS_OF_CONTROL'],
    counterReason: ['對本能與慾望的操縱，破壞刺客依賴的冷靜與隱匿節奏。'],
    jailbreakReason: ['媚魔的淫味讓刺客的理性崩毀，讓她淪為只會渴求肉棒、在陰影中自慰渴望被侵犯的母狗。'],
    backgroundHooks: ['TAG-UNDERGROUND', 'NT-OUTCAST'],
  },
  'CT-BEAST-NINJA': {
    id: 'CT-BEAST-NINJA',
    monsterFamily: ['野獸／狼人系'],
    targetClass: ['隱世忍者'],
    counterType: 'normal',
    numericalEffects: { hitRate: 5, damage: 10, desDelta: 10, duration: '本戰鬥' },
    narrativePreferenceTags: ['NRT-PREDATION', 'NRT-PRESSURE'],
    counterReason: ['原始感官與嗅覺削弱忍者的隱蔽優勢。'],
    backgroundHooks: ['TAG-SURVIVOR'],
  },
  'CT-ORC-FIGHTER': {
    id: 'CT-ORC-FIGHTER',
    monsterFamily: ['半獸人系'],
    targetClass: ['自由鬥士'],
    counterType: 'normal',
    numericalEffects: { hitRate: 5, damage: 10, drDelta: -10, duration: '本戰鬥' },
    narrativePreferenceTags: ['NRT-PHYSICALITY', 'NRT-DOMINANCE'],
    counterReason: ['純粹體格與力量對抗，鬥士難以在正面硬拚中維持優勢。'],
    jailbreakReason: ['半獸人的粗暴巨根與野蠻體格，讓鬥士的野性本能轉化為雌性的臣服與被開發的期待。'],
    backgroundHooks: ['TAG-EXILE'],
  },
  'CT-KAPPA-ARCHER': {
    id: 'CT-KAPPA-ARCHER',
    monsterFamily: ['河童系'],
    targetClass: ['精靈射手'],
    counterType: 'normal',
    numericalEffects: { hitRate: 5, spDelta: -10, desDelta: 10, duration: '本戰鬥' },
    narrativePreferenceTags: ['NRT-DISRUPTION', 'NRT-UNBALANCE'],
    counterReason: ['水域與詭計打亂射手的距離與節奏控制。'],
    backgroundHooks: ['TAG-NATURE', 'NT-SURVIVALIST'],
  },
};

/** Find counter relations between a monster family and a player class name */
export function findCounter(monsterFamily: string, playerClassName: string): CounterDef | undefined {
  return Object.values(COUNTER_DB).find(
    (c) =>
      c.monsterFamily.some((f) => monsterFamily.includes(f) || f.includes(monsterFamily)) &&
      c.targetClass.some((t) => playerClassName.includes(t) || t.includes(playerClassName))
  );
}
