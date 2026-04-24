import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import type {
  GameState, GameConfig, CombatAction, CombatTurnResult,
  GameLogEntry, EventOption, StatusEffect, StatusEffectCategory,
} from './types';
import { getAllCompanionClasses, PROTAGONIST_CLASS } from './data/classes';
import { getBodySkillDef } from './data/skills';
import {
  createNewRun, initializePlayer, initializeProtagonist, saveGame, loadGame,
  hasSave, deleteSave, addLogEntry, createSnapshot, synthesizeProtagonistSkills, recalculatePlayerStats,
  equipProtagonistEquipment, setEquippedItemDurability, unequipProtagonistEquipment,
} from './engine/stateManager';
import {
  initCombat, processPlayerAction,
  isCombatVictory, advanceCombat, getEffectivePlayerStat, normalizeStatusEffect,
  applyPlayerDesChange, applyStatusEffect, clearFloorExpiredStatusEffects,
} from './engine/combatEngine';
import { getEffectivePlayerDes, getEffectivePlayerDesMax, getPlayerPenaltySummary, syncOutfitBreakControl } from './engine/playerPenaltyEngine';
import { isAllyTargetingSkill, skillNeedsTargetSelection } from './engine/skillTargeting';
import { generateEnemies, generateExploreEncounter, processRestAction } from './engine/phaseEngine';
import {
  addItemToInventory,
  consumeEventItem,
  createFixedEventItem,
  generateGoldDrop,
  hasEventRequirement,
  rollBodySkillDrop,
  rollEventItemDrop,
  rollItemDrop,
  processGrowth,
} from './engine/lootEngine';
// shop engine used indirectly via phase transitions
import { formatDiceResult } from './engine/diceEngine';
import { requestNarrative, addNarrativeToHistory } from './ai/narrativeService';
import { generateBiography, type BioInput } from './ai/biographyService';
import { RECOMMENDED_MODELS, NSFW_MODELS } from './ai/openrouter';
import { getRandomEvent } from './data/events';
import './index.css';

const CONFIG_KEY = 'dungen_trpg_config';

function checkAndApplyBadEnd(state: GameState): boolean {
  const protagonist = state.players?.find(p => p.isProtagonist);
  if (!protagonist) return false;
  if (state.phase === 'badEnd' || state.phase === 'END') return false;

  if (protagonist.hp <= 0) {
    protagonist.isAlive = false;
    protagonist.isBD = true;
    state.endReason = 'protagonist_hp';
    state.phase = 'badEnd';
    addLogEntry(state, 'system', '💀 主角HP歸零，冒險終結。');
    return true;
  }

  const effectiveDes = getEffectivePlayerDes(protagonist);
  const effectiveDesMax = getEffectivePlayerDesMax(protagonist);
  if (effectiveDes >= effectiveDesMax) {
    protagonist.isBD = true;
    state.endReason = 'protagonist_des';
    state.phase = 'badEnd';
    addLogEntry(state, 'system', '💀 主角絕望值達到上限（DES 100），冒險終結。');
    return true;
  }

  return false;
}

type ActionSelectionState = {
  type: 'main' | 'attack_target' | 'skill_target' | 'skill_confirm' | 'item_target';
  selectedSkillId?: string;
  selectedItemId?: string;
};

function loadConfig(): GameConfig {
  try {
    const d = localStorage.getItem(CONFIG_KEY);
    if (d) return JSON.parse(d);
  } catch { /* noop */ }
  return { apiKey: '', modelId: 'google/gemini-2.5-flash-preview', modelName: 'Gemini 2.5 Flash', nsgEnabled: true };
}
function saveConfig(c: GameConfig) { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); }

function getSkillDescription(skill: { effectSummary: string; hitRule: string }): string {
  const parts = [skill.effectSummary, skill.hitRule]
    .map((part) => part.trim())
    .filter((part, index, arr) => part.length > 0 && arr.indexOf(part) === index);

  return parts.join(' / ');
}

const STATUS_EFFECT_LABELS: Record<StatusEffectCategory, string> = {
  buff: 'buff',
  debuff: 'debuff',
  blessing: '祝福',
  curse: '詛咒',
};

const STATUS_EFFECT_COLORS: Record<StatusEffectCategory, string> = {
  buff: 'var(--sp-color)',
  debuff: 'var(--des-color)',
  blessing: 'var(--hp-high)',
  curse: 'var(--hp-low)',
};

type EndingReason = NonNullable<GameState['endReason']>;

const EMPTY_BIO_INPUTS: [BioInput, BioInput] = [
  { race: '', age: '', appearance: '', background: '' },
  { race: '', age: '', appearance: '', background: '' }
];

const ENDING_COPY: Record<EndingReason, { label: string; heading: string; prompt: string; fallback: string }> = {
  protagonist_hp: {
    label: 'Bad End',
    heading: '死亡',
    prompt: '主角的生命已走到盡頭。要立刻重新開始新的冒險嗎？',
    fallback: '主角在地牢深處力竭倒下，呼吸與意志一同熄滅。這趟冒險以最沉重的方式終結，只剩冰冷的黑暗吞沒她的名字。'
  },
  protagonist_des: {
    label: 'Bad End',
    heading: '崩潰',
    prompt: '主角的理智已完全崩解。要立刻重新開始新的冒險嗎？',
    fallback: '絕望值突破極限後，主角最後一絲自我也被撕裂，曾經支撐她前進的信念徹底瓦解，只留下無法回頭的沉淪。'
  },
  party_wipe: {
    label: 'Game Over',
    heading: '隊伍全滅',
    prompt: '隊伍已無力再戰。要立刻重新開始新的冒險嗎？',
    fallback: '戰線在混亂中全面潰散，隊伍再也沒有人能站起來。地牢重新恢復死寂，而這次遠征也到此為止。'
  },
};

function formatStatusEffectMeta(effect: StatusEffect): string {
  const normalized = normalizeStatusEffect(effect);
  if (typeof normalized.duration === 'number') {
    return `${normalized.duration}回合`;
  }
  if (normalized.removalCondition) {
    return `解除條件：${normalized.removalCondition}`;
  }
  return normalized.expiresOnBattleEnd ? '本戰鬥' : '條件解除前持續';
}

function getStatusEffectDisplayCategory(effect: StatusEffect): StatusEffectCategory {
  return normalizeStatusEffect(effect).category ?? 'buff';
}

function removeAllOutfit(player: import('./types').PlayerState): boolean {
  player.equippedUpper = null;
  player.equippedLower = null;
  player.upperDurability = 0;
  player.lowerDurability = 0;
  recalculatePlayerStats(player);
  return syncOutfitBreakControl(player).applied;
}

function processFloorBasedStatusExpiry(gs: GameState): void {
  if (!gs.players) return;

  gs.players.forEach((player) => {
    const removed = clearFloorExpiredStatusEffects(player, gs.floor);
    removed.forEach((effect) => {
      addLogEntry(gs, 'system', `${player.name} 的[${STATUS_EFFECT_LABELS[getStatusEffectDisplayCategory(effect)]}]【${effect.name}】已解除`);
    });
  });
}

function logCombatResult(gs: GameState, res: CombatTurnResult) {
  res.diceResults.forEach((d) => addLogEntry(gs, 'dice', formatDiceResult(d)));
  if (res.damageDealt > 0) addLogEntry(gs, 'combat', `${res.actorName} 對 ${res.targetName} 造成 ${res.damageDealt} 點傷害`);
  if (res.upperChange !== 0 || res.lowerChange !== 0) {
    const parts: string[] = [];
    if (res.upperChange !== 0) parts.push(`上衣耐久 ${res.upperChange}`);
    if (res.lowerChange !== 0) parts.push(`下衣耐久 ${res.lowerChange}`);
    addLogEntry(gs, 'combat', `${res.targetName} 衣裝受損：${parts.join('、')}`);
  }
  if (res.controlApplied) addLogEntry(gs, 'combat', `${res.targetName} 被控制！`);
  if (res.action === '被控制，無法行動') addLogEntry(gs, 'combat', `${res.actorName} 被控制中，跳過行動`);
}

export default function App() {
  const [screen, setScreen] = useState<'start' | 'game'>(() => {
    try { return hasSave() ? 'game' : 'start'; } catch { return 'start'; }
  });
  const [config, setConfig] = useState<GameConfig>(loadConfig);
  const [state, setState] = useState<GameState | null>(() => {
    try { return hasSave() ? loadGame() : null; } catch { return null; }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [narrativeText, setNarrativeText] = useState('');
  const [classSelection, setClassSelection] = useState<[string, string]>(['CL-PROT', '']);
  const [playerNames, setPlayerNames] = useState<[string, string]>(['', '']);
  const [showPlayerPanel, setShowPlayerPanel] = useState(false);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [showFullLog, setShowFullLog] = useState(false);
  const [initSubPhase, setInitSubPhase] = useState<'PROTAGONIST_SETUP' | 'COMPANION_SELECT' | 'BIO_INPUT' | 'BIO_GENERATE' | 'BIO_CONFIRM'>('PROTAGONIST_SETUP');
  const [playerBios, setPlayerBios] = useState<[BioInput, BioInput]>([
    { race: '', age: '', appearance: '', background: '' },
    { race: '', age: '', appearance: '', background: '' }
  ]);
  const [biographyText, setBiographyText] = useState('');
  const [actionState, setActionState] = useState<ActionSelectionState>({ type: 'main' });
  const [showBackpackModal, setShowBackpackModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const narrativeRequestIdRef = useRef(0);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [state?.log.length, narrativeText]);
  useEffect(() => {
    if (state && state.phase !== 'INIT') {
      saveGame(state);
    }
  }, [state]);

  const updateConfig = (patch: Partial<GameConfig>) => {
    const c = { ...config, ...patch };
    setConfig(c); saveConfig(c);
  };

  const log = (type: GameLogEntry['type'], text: string) => {
    if (state) { addLogEntry(state, type, text); setState({ ...state }); }
  };

  const requestAINarrative = useCallback(async (
    gs: GameState, results?: CombatTurnResult[], extra?: string, skipAutoTrigger?: boolean, isMidCombat?: boolean
  ) => {
    if (!config.apiKey) return;
    const requestId = ++narrativeRequestIdRef.current;
    setIsStreaming(true); setNarrativeText('');
    let full = '';
    try {
      for await (const chunk of requestNarrative(config.apiKey, config.modelId, gs, results, extra, isMidCombat)) {
        if (requestId !== narrativeRequestIdRef.current) {
          return;
        }
        full += chunk; setNarrativeText(full);
      }
      if (requestId !== narrativeRequestIdRef.current) {
        return;
      }
      addNarrativeToHistory(gs, full);
      addLogEntry(gs, 'narrative', full);
    } catch (e: any) {
      if (requestId !== narrativeRequestIdRef.current) {
        return;
      }
      addLogEntry(gs, 'system', `❌ AI 錯誤: ${e.message}`);
    }
    if (requestId !== narrativeRequestIdRef.current) {
      return;
    }
    setIsStreaming(false);
    setState({ ...gs });

    // --- Auto-advance monster turns (Plan B) ---
    // If we're still in combat and it's the system's turn (waitingForPlayer is null), 
    // automatically pop the next unit from the queue.
    if (!skipAutoTrigger && gs.phase === 'COMBAT' && gs.combat && !gs.combat.isComplete && gs.combat.waitingForPlayer === null) {
      setTimeout(() => {
        // We do a small timeout so the user can visually parse the log before the next one starts
        const nextRes = advanceCombat(gs);
        if (nextRes.length > 0) {
          for (const res of nextRes) {
            logCombatResult(gs, res);
          }
          createSnapshot(gs);
          setState({ ...gs });
          // Recursively call for the next narrative
          requestAINarrative(gs, nextRes);
        } else {
          // Queue might be empty or combat ended during advance
          setState({ ...gs });
        }
      }, 1500);
    }
  }, [config]);

  const resetSessionUi = useCallback(() => {
    narrativeRequestIdRef.current += 1;
    setInitSubPhase('PROTAGONIST_SETUP');
    setClassSelection(['CL-PROT', '']);
    setPlayerNames(['', '']);
    setPlayerBios(EMPTY_BIO_INPUTS);
    setBiographyText('');
    setNarrativeText('');
    setIsStreaming(false);
    setActionState({ type: 'main' });
    setShowPlayerPanel(false);
    setShowLogPanel(false);
    setShowFullLog(false);
    setShowBackpackModal(false);
    setShowSettings(false);
  }, []);

  const beginNewAdventure = useCallback(() => {
    const gs = createNewRun();
    gs.nsgEnabled = config.nsgEnabled;
    resetSessionUi();
    setState(gs);
    setScreen('game');
    addLogEntry(gs, 'system', `新冒險開始！Run ID: ${gs.runId}`);
    addLogEntry(gs, 'system', `商人出現點: 第${gs.shopFloors[0]}層、第${gs.shopFloors[1]}層`);
  }, [config.nsgEnabled, resetSessionUi]);

  const returnToTitle = useCallback(() => {
    deleteSave();
    resetSessionUi();
    setState(null);
    setScreen('start');
  }, [resetSessionUi]);

  // --- Start Screen ---
  if (screen === 'start') {
    return (
      <>
        <div className="start-screen">
          <h1 className="start-title">地牢探索</h1>
          <p className="start-subtitle">通用回合制地牢探索系統 v1.4</p>
          <div className="start-buttons">
            <button className="btn btn-primary" onClick={beginNewAdventure}>開始新冒險</button>
            {hasSave() && <button className="btn" onClick={() => {
              const gs = loadGame();
              if (gs) { setState(gs); setScreen('game'); }
            }}>繼續冒險</button>}
            <button className="btn" onClick={() => setShowSettings(true)}>⚙️ 設定</button>
          </div>
          {!config.apiKey && <p style={{ color: 'var(--des-color)', marginTop: '1rem', zIndex: 1, fontSize: '0.85rem' }}>⚠️ 請先設定 OpenRouter API Key</p>}
        </div>
        {showSettings && <SettingsModal config={config} onSave={(c: GameConfig) => { updateConfig(c); setShowSettings(false); }} onClose={() => setShowSettings(false)} />}
      </>
    );
  }

  if (!state) return null;
  const protagonist = state.players?.find((player) => player.isProtagonist) ?? null;

  const handleProtagonistConfirm = () => {
    if (!playerNames[0].trim()) return;
    setClassSelection((prev) => [PROTAGONIST_CLASS.id, prev[1]]);
    setInitSubPhase('COMPANION_SELECT');
  };

  const handleCompanionConfirm = () => {
    if (!classSelection[1]) return;
    const protagonist = initializeProtagonist(playerNames[0] || '聖女候選人');
    const companion = initializePlayer(classSelection[1], playerNames[1] || '同行者', 1);
    state.players = [protagonist, companion];
    setInitSubPhase('BIO_INPUT');
    addLogEntry(state, 'system', `主角與配角建立完成，請填寫角色身世。`);
    setState({ ...state });
  };

  const handleBioGenerate = async () => {
    if (!state?.players) return;
    setInitSubPhase('BIO_GENERATE');
    setIsStreaming(true);
    setBiographyText('');
    let full = '';
    try {
      for await (const chunk of generateBiography(config.apiKey, config.modelId, playerBios[0], playerBios[1], state.players[0], state.players[1], config.nsgEnabled)) {
        full += chunk; setBiographyText(full);
      }
    } catch (e: any) {
      addLogEntry(state, 'system', `❌ AI 簡歷生成錯誤: ${e.message}`);
    }
    setIsStreaming(false);
    setInitSubPhase('BIO_CONFIRM');
  };

  const handleBioConfirm = () => {
    if (!state?.players) return;
    // save bio to players
    state.players[0].race = playerBios[0].race;
    state.players[0].age = playerBios[0].age;
    state.players[0].appearance = playerBios[0].appearance;
    state.players[0].background = playerBios[0].background;
    state.players[0].biography = biographyText;

    state.players[1].race = playerBios[1].race;
    state.players[1].age = playerBios[1].age;
    state.players[1].appearance = playerBios[1].appearance;
    state.players[1].background = playerBios[1].background;
    state.players[1].biography = biographyText;

    state.phase = 'CUSTOM';
    addLogEntry(state, 'system', `角色建立與身世設定完成: ${state.players[0].name} & ${state.players[1].name}`);
    addLogEntry(state, 'system', `角色1絕對被克制族群: ${state.players[0].absoluteCounter}`);
    addLogEntry(state, 'system', `角色2絕對被克制族群: ${state.players[1].absoluteCounter}`);

    addNarrativeToHistory(state, biographyText);
    addLogEntry(state, 'narrative', biographyText);

    createSnapshot(state);
    setState({ ...state });
    requestAINarrative(state, undefined, '冒險開始！聖女候選人與她的同伴剛踏入地牢入口，空氣混雜著潮濕與古老石塵的味道。請結合這份角色簡歷描述開場場景。');
    setInitSubPhase('PROTAGONIST_SETUP');
  };

  const handleCustomDone = () => {
    state.phase = 'EXPLORE';
    addLogEntry(state, 'system', `進入第 ${state.floor} 層 - 探索階段`);
    setState({ ...state });
  };

  const getProtagonist = () => state.players?.find((player) => player.isProtagonist) ?? null;

  const queueBodySkillDrop = (skillId: string) => {
    if (!state.players) return;
    const protagonist = getProtagonist();
    const skillDef = getBodySkillDef(skillId);
    if (!protagonist || !skillDef) return;

    const emptySlotIndex = protagonist.bodySkillSlots.findIndex((slot) => slot === null);
    if (emptySlotIndex >= 0) {
      protagonist.bodySkillSlots[emptySlotIndex as 0 | 1] = { skillId, level: 1 };
      synthesizeProtagonistSkills(protagonist);
      addLogEntry(state, 'system', `主角習得身體技能【${skillDef.name}】`);
      return;
    }

    state.pendingBodySkillDrop = { skillId, sourceFloor: state.floor };
    addLogEntry(state, 'system', `獲得身體技能【${skillDef.name}】，請在休整階段決定替換、升級或放棄。`);
  };

  const handleAllocateStatPoint = (target: 'str' | 'agi' | 'wil' | 'maxHp' | 'maxSp') => {
    const protagonist = getProtagonist();
    if (!state.players || !protagonist || protagonist.statPoints <= 0) return;

    protagonist.statPoints -= 1;
    if (target === 'str') protagonist.str += 1;
    if (target === 'agi') protagonist.agi += 1;
    if (target === 'wil') protagonist.wil += 1;
    if (target === 'maxHp') {
      protagonist.baseMaxHp += 8;
      protagonist.hp += 8;
    }
    if (target === 'maxSp') {
      protagonist.baseMaxSp += 10;
      protagonist.sp += 10;
    }

    synthesizeProtagonistSkills(protagonist);
    addLogEntry(state, 'system', `主角分配能力點：${target}`);
    setState({ ...state });
  };

  const handleBodySkillDecision = (decision: 'replace' | 'upgrade' | 'discard', slotIndex?: 0 | 1) => {
    const protagonist = getProtagonist();
    const pendingSkillId = state.pendingBodySkillDrop?.skillId;
    const pendingSkillDef = pendingSkillId ? getBodySkillDef(pendingSkillId) : undefined;
    if (!protagonist || !pendingSkillId || !pendingSkillDef) return;

    if (decision === 'replace' && slotIndex !== undefined) {
      protagonist.bodySkillSlots[slotIndex] = { skillId: pendingSkillId, level: 1 };
      addLogEntry(state, 'system', `主角以【${pendingSkillDef.name}】替換了槽位 ${slotIndex + 1} 的身體技能。`);
    }

    if (decision === 'upgrade' && slotIndex !== undefined && protagonist.bodySkillSlots[slotIndex]) {
      protagonist.bodySkillSlots[slotIndex] = {
        ...protagonist.bodySkillSlots[slotIndex]!,
        level: protagonist.bodySkillSlots[slotIndex]!.level + 1,
      };
      const slotSkill = getBodySkillDef(protagonist.bodySkillSlots[slotIndex]!.skillId);
      addLogEntry(state, 'system', `主角提升了【${slotSkill?.name ?? '未知技能'}】的等級。`);
    }

    if (decision === 'discard') {
      addLogEntry(state, 'system', `主角放棄了【${pendingSkillDef.name}】。`);
    }

    state.pendingBodySkillDrop = null;
    synthesizeProtagonistSkills(protagonist);
    setState({ ...state });
  };

  const handleExplore = () => {
    if (state.exploreRestCount >= 3) {
      addLogEntry(state, 'system', `在第 ${state.floor} 層停留過久，必須進入下一層了！`);
      state.exploreRestCount = 0;
      state.floor++;
      processFloorBasedStatusExpiry(state);
      if (state.shopFloors.includes(state.floor)) {
        state.phase = 'SHOP';
        addLogEntry(state, 'system', `🏪 商人出現在第 ${state.floor} 層！`);
      } else {
        state.phase = 'EXPLORE';
      }
      setState({ ...state });
      requestAINarrative(state, undefined, `在第 ${state.floor - 1} 層停留過久，你們被迫踏入第 ${state.floor} 層。`);
      return;
    }

    state.exploreRestCount++;
    const encounter = generateExploreEncounter(state.floor, state);
    if (encounter.type === 'combat' && encounter.enemies) {
      state.enemies = encounter.enemies;
      state.combat = initCombat(state.players!, state.enemies);
      state.phase = 'COMBAT';
      setActionState({ type: 'main' });
      addLogEntry(state, 'system', `遭遇敵人！${encounter.enemies.map(e => `${e.templateName}(${e.tier})`).join('、')}`);

      const nextResults = advanceCombat(state);
      for (const res of nextResults) {
        logCombatResult(state, res);
      }

      createSnapshot(state);
      setState({ ...state });
      requestAINarrative(state, nextResults.length > 0 ? nextResults : undefined, `探索途中遭遇了 ${encounter.enemies.map(e => e.templateName).join('和')}！戰鬥即將開始。`);
    } else if (encounter.type === 'event') {
      state.phase = 'EVENT';
      state.currentEvent = encounter.event || null;
      addLogEntry(state, 'system', `觸發事件: ${state.currentEvent?.templateName ?? '未知事件'}`);
      setState({ ...state });
      requestAINarrative(state, undefined, `探索途中觸發了事件。`);
    }
  };

  const handleCombatAction = (action: CombatAction) => {
    if (!state.combat || !state.players) return;
    const pIdx = state.combat.waitingForPlayer;
    if (pIdx === null) return;
    action.playerIndex = pIdx;

    const player = state.players[pIdx];
    const results = processPlayerAction(action, player, state.enemies, state);

    for (const result of results) {
      logCombatResult(state, result);
    }

    state.combat.pendingResults.push(...results);

    // Continue the turn loop by processing the rest of the queue
    const nextResults = advanceCombat(state);
    let specialTriggered = false;
    for (const res of nextResults) {
      res.diceResults.forEach((d) => {
        if (d.purpose.includes('隱藏觸發') && d.success) specialTriggered = true;
      });
      logCombatResult(state, res);
    }

    if (specialTriggered) {
      addLogEntry(state, 'system', `⚠️ 隱藏觸發！進入 SPECIAL 階段`);
      state.phase = 'SPECIAL';
      state.specialTurn = 1;
      state.specialMaxTurn = 4;
    }

    let lootExtra = '';
    if (state.combat.isComplete) {
      if (isCombatVictory(state.enemies)) {
        const gold = generateGoldDrop(state.enemies, state.floor);
        state.gold += gold;
        addLogEntry(state, 'system', `🎉 戰鬥勝利！獲得 ${gold} 金幣`);
        const drop = rollItemDrop(state.floor);
        if (drop) {
          state.inventory.push(drop);
          const effectDesc = drop.effectSummary ? `（${drop.effectSummary}）` : '';
          addLogEntry(state, 'system', `💎 獲得戰利品：${drop.name}${effectDesc}`);
          lootExtra = `戰鬥結束後，隊伍在敵人遺骸旁搜索到了【${drop.name}】${effectDesc}，將其收入背包。`;
        }
        for (const p of state.players) {
          if (p.isAlive && !p.isBD) {
            const growth = processGrowth(p, state.floor);
            if (growth.length) addLogEntry(state, 'system', `${p.name} 成長: ${growth.join(', ')}`);
          }
        }
        const protagonist = getProtagonist();
        if (protagonist && protagonist.isAlive && !protagonist.isBD) {
          const gainedPoints = 3 + Math.floor(state.floor / 10);
          protagonist.statPoints += gainedPoints;
          addLogEntry(state, 'system', `主角獲得 ${gainedPoints} 點能力點，請在休整階段分配。`);

          const bodySkillId = rollBodySkillDrop(state.floor);
          if (bodySkillId) {
            queueBodySkillDrop(bodySkillId);
          }
        }
        state.phase = 'REST';
        state.combat = null;
        state.enemies = [];
      } else {
        const protagonist = state.players.find(p => p.isProtagonist);
        if (protagonist && !protagonist.isAlive) {
          // HP=0 Bad End
          state.endReason = 'protagonist_hp';
          state.phase = 'badEnd';
          addLogEntry(state, 'system', '💀 主角HP歸零，冒險終結。');
        } else if (protagonist && protagonist.isBD) {
          // DES=100 Bad End
          state.endReason = 'protagonist_des';
          state.phase = 'badEnd';
          addLogEntry(state, 'system', '💀 主角絕望值達到上限（DES 100），冒險終結。');
        } else if (state.players.every(p => !p.isAlive || p.isBD)) {
          state.endReason = 'party_wipe';
          state.phase = 'END';
          addLogEntry(state, 'system', '💀 隊伍全滅，冒險結束。');
        }
      }
    }

    setActionState({ type: 'main' });
    createSnapshot(state);
    setState({ ...state });
    const isMidCombatProcess = state.phase === 'COMBAT';
    requestAINarrative(state, [...results, ...nextResults], lootExtra || undefined, false, isMidCombatProcess);
  };

  const handleRestAction = (index: number) => {
    if (index === 7) {
      setShowBackpackModal(true);
      return;
    }

    // 1, 2, 5, 6, 8 consume exploreRestCount
    const consumesTurn = [1, 2, 5, 6, 8].includes(index);
    if (consumesTurn) {
      if (state.exploreRestCount >= 3) {
        addLogEntry(state, 'system', `在第 ${state.floor} 層停留過久，必須進入下一層了！`);
        state.exploreRestCount = 0;
        state.floor++;
        processFloorBasedStatusExpiry(state);
        if (state.shopFloors.includes(state.floor)) {
          state.phase = 'SHOP';
          addLogEntry(state, 'system', `🏪 商人出現在第 ${state.floor} 層！`);
        } else {
          state.phase = 'EXPLORE';
        }
        setState({ ...state });
        requestAINarrative(state, undefined, `在第 ${state.floor - 1} 層停留過久，你們被迫踏入第 ${state.floor} 層。`);
        return;
      }
      state.exploreRestCount++;
    }

    const result = processRestAction(index, state);
    addLogEntry(state, 'system', result.result);
    if (index === 3 && result.phaseChange === 'EXPLORE') {
      state.exploreRestCount = 0;
      state.floor++;
      processFloorBasedStatusExpiry(state);
      // Check shop
      if (state.shopFloors.includes(state.floor)) {
        state.phase = 'SHOP';
        addLogEntry(state, 'system', `🏪 商人出現在第 ${state.floor} 層！`);
      } else {
        state.phase = 'EXPLORE';
      }
    } else if (result.phaseChange) {
      state.phase = result.phaseChange;
      if (state.phase === 'EVENT') {
        state.currentEvent = getRandomEvent();
      }
    }
    saveGame(state);
    setState({ ...state });
    requestAINarrative(state, undefined, result.result);
  };

  const handleEventOption = (option: EventOption) => {
    if (!state || !state.currentEvent) return;

    const effects = option.successEffects; // Simplified: usually events have distinct success/fail but labels imply the check
    let actualEffects = effects;
    let wasSuccess = true;

    if (option.requiredCheck.includes('需持有')) {
      wasSuccess = hasEventRequirement(state.inventory, option.requiredCheck);
      actualEffects = wasSuccess ? option.successEffects : option.failEffects;
    } else if (option.requiredCheck !== '無') {
      // Basic stat check logic
      const isAgi = option.requiredCheck.includes('AGI') || option.requiredCheck.includes('DEX');
      const isStr = option.requiredCheck.includes('STR');
      const isInt = option.requiredCheck.includes('INT');
      const isVit = option.requiredCheck.includes('VIT') || option.requiredCheck.includes('WIL');

      const actor = state.players![0];
      const statVal = isAgi ? getEffectivePlayerStat(actor, 'agi') :
        isStr ? getEffectivePlayerStat(actor, 'str') :
          isInt ? getEffectivePlayerStat(actor, 'wil') : // Map INT to WIL
            isVit ? getEffectivePlayerStat(actor, 'wil') : 10;

      const roll = Math.floor(Math.random() * 100) + 1;
      // Formula: 1D100 <= 50 + stat*5
      const threshold = 50 + statVal * 5;
      const success = roll <= threshold;

      addLogEntry(state, 'dice', `【事件檢定】門檻: ${threshold}% | 擲骰: 1D100=${roll} → ${success ? '✓ 成功' : '✗ 失敗'}`);
      wasSuccess = success;
      actualEffects = success ? option.successEffects : option.failEffects;
    }

    addLogEntry(state, 'system', `事件結果：${actualEffects}`);

    // Basic state change parsing
    const hpMatch = actualEffects.match(/HP\s*([+-]\d+)/);
    if (hpMatch && state.players) {
      const val = parseInt(hpMatch[1]);
      state.players.forEach(p => p.hp = Math.max(0, Math.min(p.maxHp, p.hp + val)));
    }
    const desMatch = actualEffects.match(/DES\s*([+-]\d+)/);
    if (desMatch && state.players) {
      const val = parseInt(desMatch[1]);
      state.players.forEach((p) => {
        applyPlayerDesChange(p, val);
      });
    }
    if (actualEffects.includes('全身衣裝移除') && state.players) {
      state.players.forEach((p) => {
        if (removeAllOutfit(p)) {
          addLogEntry(state, 'system', `${p.name} 因衣裝被剝除而被控制 1 回合！`);
        }
      });
    }
    if (actualEffects.includes('Upper/Lower耐久') && state.players) {
      const bothMatch = actualEffects.match(/Upper\/Lower耐久\s*([+-]\d+)/);
      if (bothMatch) {
        const val = parseInt(bothMatch[1]);
        state.players.forEach((p) => {
          if (setEquippedItemDurability(p, 'Upper', p.upperDurability + val)) {
            addLogEntry(state, 'system', `${p.name} 因衣裝破損而被控制 1 回合！`);
          }
          if (setEquippedItemDurability(p, 'Lower', p.lowerDurability + val)) {
            addLogEntry(state, 'system', `${p.name} 因衣裝破損而被控制 1 回合！`);
          }
          recalculatePlayerStats(p);
        });
      }
    }
    const upperMatch = actualEffects.match(/Upper耐久\s*([+-]\d+)/);
    if (upperMatch && state.players && !actualEffects.includes('Upper/Lower耐久')) {
      const val = parseInt(upperMatch[1]);
      state.players.forEach((p) => {
        if (setEquippedItemDurability(p, 'Upper', p.upperDurability + val)) {
          addLogEntry(state, 'system', `${p.name} 因衣裝破損而被控制 1 回合！`);
        }
        recalculatePlayerStats(p);
      });
    }
    const lowerMatch = actualEffects.match(/Lower耐久\s*([+-]\d+)/);
    if (lowerMatch && state.players && !actualEffects.includes('Upper/Lower耐久')) {
      const val = parseInt(lowerMatch[1]);
      state.players.forEach((p) => {
        if (setEquippedItemDurability(p, 'Lower', p.lowerDurability + val)) {
          addLogEntry(state, 'system', `${p.name} 因衣裝破損而被控制 1 回合！`);
        }
        recalculatePlayerStats(p);
      });
    }

    const rewardMatches = [...actualEffects.matchAll(/獲得\s*([^；]+?)\s*x(\d+)/g)];
    for (const match of rewardMatches) {
      const rewardName = match[1].trim();
      const quantity = parseInt(match[2], 10);

      for (let count = 0; count < quantity; count++) {
        const reward =
          rewardName === '隨機道具'
            ? rollEventItemDrop(state.floor, 'event_random')
            : rewardName === '普通道具'
              ? rollEventItemDrop(state.floor, 'event_common')
              : rewardName === '貴重戰利品'
                ? rollEventItemDrop(state.floor, 'event_valuable')
                : createFixedEventItem(rewardName);

        if (!reward) continue;

        const addedItem = addItemToInventory(state.inventory, reward);
        const effectDesc = addedItem.effectSummary ? `（${addedItem.effectSummary}）` : '';
        addLogEntry(state, 'system', `🎁 獲得 ${addedItem.name} x${reward.quantity}${effectDesc}`);
      }
    }

    const consumeMatches = [...actualEffects.matchAll(/消耗\s*([^；]+?)\s*x(\d+)/g)];
    for (const match of consumeMatches) {
      const itemName = match[1].trim();
      const quantity = parseInt(match[2], 10);
      const consumed = consumeEventItem(state.inventory, itemName, quantity);
      if (consumed) {
        addLogEntry(state, 'system', `🧪 消耗 ${itemName} x${quantity}`);
      }
    }

    const appliedStatusEffects = wasSuccess ? option.successStatusEffects : option.failStatusEffects;
    if (appliedStatusEffects && state.players) {
      state.players.forEach((player) => {
        appliedStatusEffects.forEach((effect) => {
          const normalized = normalizeStatusEffect({
            ...effect,
            expiresAtFloor:
              effect.expiresAtFloor ??
              ((effect.removalCondition?.includes('前進五層後自動解除') ?? false) ? state.floor + 5 : effect.expiresAtFloor),
          });
          applyStatusEffect(player, normalized);
          addLogEntry(
            state,
            'system',
            `${player.name} 獲得[${STATUS_EFFECT_LABELS[getStatusEffectDisplayCategory(normalized)]}]【${normalized.name}】`,
          );
        });
      });
    }

    if (checkAndApplyBadEnd(state)) {
      state.currentEvent = null;
      setState({ ...state });
      requestAINarrative(state, undefined, `事件結束：${actualEffects}`);
      return;
    }

    if (actualEffects.includes('Phase->COMBAT')) {
      // Trigger combat directly rather than rolling another encounter/event.
      state.enemies = generateEnemies(state.floor);
      state.combat = initCombat(state.players!, state.enemies);
      state.phase = 'COMBAT';
      state.currentEvent = null;
      setActionState({ type: 'main' });

      const nextResults = advanceCombat(state);
      for (const res of nextResults) {
        logCombatResult(state, res);
      }

      setState({ ...state });
      requestAINarrative(state, nextResults.length > 0 ? nextResults : undefined, `事件導致了戰鬥！ ${actualEffects}`);
      return;
    }

    state.phase = 'REST'; // Most events transition to REST
    state.currentEvent = null;
    setState({ ...state });
    requestAINarrative(state, undefined, `事件結束：${actualEffects}`);
  };

  const handleSpecialAction = (actionType: string) => {
    if (state.specialTurn !== null && state.specialMaxTurn !== null) {
      state.specialTurn++;
      addLogEntry(state, 'system', `SPECIAL 回合 ${state.specialTurn}/${state.specialMaxTurn}: ${actionType}`);
      if (state.specialTurn > state.specialMaxTurn) {
        state.phase = 'REST';
        state.specialTurn = null;
        state.specialMaxTurn = null;
        addLogEntry(state, 'system', 'SPECIAL 結束，進入 REST');
      }
    }
    setState({ ...state });
    requestAINarrative(state, undefined, `SPECIAL 階段: ${actionType}`);
  };

  const handleRestart = () => {
    if (window.confirm('確定要放棄當前進度並重新開始嗎？')) {
      deleteSave();
      beginNewAdventure();
    }
  };

  const handleRegenerateNarrative = () => {
    if (!state || isStreaming) return;
    const lastLog = state.log[state.log.length - 1];
    let poppedNarrative = false;
    if (lastLog) {
      if (lastLog.type === 'narrative' || (lastLog.type === 'system' && lastLog.text.includes('AI 錯誤'))) {
        state.log.pop();
        if (lastLog.type === 'narrative') poppedNarrative = true;
      }
    }
    if (poppedNarrative && state.narrativeHistory.length > 0) {
      state.narrativeHistory.pop();
    }
    setState({ ...state });
    requestAINarrative(state, undefined, '【系統提示：請重新描述當前場景與狀態】', true);
  };

  // --- Render Game ---
  const aliveEnemies = state.enemies.filter(e => e.isAlive);
  const visibleLogEntries = state.log.slice(-50);
  const isEndingPhase = state.phase === 'badEnd' || state.phase === 'END';
  const effectiveEndReason: EndingReason = state.endReason ?? (
    state.phase === 'END'
      ? 'party_wipe'
      : protagonist?.isBD
        ? 'protagonist_des'
        : 'protagonist_hp'
  );
  const latestLogEntry = state.log[state.log.length - 1];
  const latestNarrativeText = latestLogEntry?.type === 'narrative' ? latestLogEntry.text : '';
  const endingCopy = ENDING_COPY[effectiveEndReason];
  // Phase actions are rendered inline per phase

  if (isEndingPhase) {
    const endingNarrative = isStreaming ? narrativeText : latestNarrativeText;

    return (
      <>
        <div className="ending-screen">
          <div className={`ending-shell ${effectiveEndReason}`}>
            <div className="ending-hero">
              <div className="ending-kicker">{endingCopy.label}</div>
              <h1 className="ending-title">Game Over</h1>
              <p className="ending-subtitle">【{endingCopy.heading}】第 {state.floor} 層的冒險在此終結。</p>
            </div>

            <div className="ending-body">
              <div className="ending-card">
                <div className="ending-card-title">結局敘述</div>
                {isStreaming && !narrativeText ? (
                  <div className="ending-loading">
                    <div className="typing-indicator"><span /><span /><span /></div>
                    <span>正在生成最後的結局敘述...</span>
                  </div>
                ) : (
                  <div className="ending-narrative">
                    <ReactMarkdown>{endingNarrative || endingCopy.fallback}</ReactMarkdown>
                  </div>
                )}
              </div>

              <div className="ending-actions">
                <p className="ending-prompt">{endingCopy.prompt}</p>
                <div className="ending-action-row">
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      deleteSave();
                      beginNewAdventure();
                    }}
                  >
                    重新開始
                  </button>
                  <button className="btn" onClick={returnToTitle}>回到標題</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="game-screen">
        {/* Left Panel - State */}
        {showPlayerPanel && (
          <div className="side-panel-overlay" onClick={() => setShowPlayerPanel(false)}>
            <div className="side-panel left-panel" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <span className="panel-title" style={{ margin: 0 }}>角色狀態</span>
                <button className="btn btn-sm" onClick={() => setShowPlayerPanel(false)}>✕</button>
              </div>
              <div className="panel-card">
                <div className="panel-title">冒險資訊</div>
                <div className="text-sm">Run: <span style={{ fontFamily: 'var(--font-mono)' }}>{state.runId}</span></div>
                <div className="flex-between mt-1">
                  <span className="text-sm gold">💰 {state.gold}</span>
                  <button className="btn btn-sm" onClick={() => { saveGame(state); log('system', '遊戲已儲存'); }}>💾 儲存</button>
                </div>
              </div>

              {state.players?.map((p, i) => (
                <div className="panel-card" key={i}>
                  <div className="player-name">
                    <span>{p.name}</span>
                    <span className="player-class">{p.className}</span>
                  </div>
                  {p.isControlled && (
                    <span className="badge danger">
                      被控制 ({p.controlSource ? `${p.controlSource} ` : ''}剩餘 {p.controlTurns} 回合)
                    </span>
                  )}
                  {p.isBD && <span className="badge danger">BD</span>}

                  <StatBar label="HP" value={p.hp} max={p.maxHp} type="hp" />
                  <StatBar label="SP" value={p.sp} max={p.maxSp} type="sp" />
                  <StatBar label="DES" value={getEffectivePlayerDes(p)} max={getEffectivePlayerDesMax(p)} type="des" />

                  <div className="mt-1 text-sm text-dim">
                    STR:{getEffectivePlayerStat(p, 'str')} AGI:{getEffectivePlayerStat(p, 'agi')} WIL:{getEffectivePlayerStat(p, 'wil')} DR:{p.drPercent}%
                    {p.ampPercent > 0 && ` 增傷:+${p.ampPercent}%`}
                    {p.flatDr > 0 && ` 減傷:-${p.flatDr}`}
                  </div>
                  <div className="text-sm text-dim">
                    上衣:{p.upperDurability}/100 下衣:{p.lowerDurability}/100
                  </div>
                  {getPlayerPenaltySummary(p).length > 0 && (
                    <div className="text-sm text-dim">
                      懲罰: {getPlayerPenaltySummary(p).join(' / ')}
                    </div>
                  )}
                  <div className="text-sm text-dim" style={{ marginTop: '0.3rem' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>裝備：</div>
                    <div style={{ paddingLeft: '0.5rem' }}>武器：{p.equippedWeapon?.name || '無'}</div>
                    <div style={{ paddingLeft: '0.5rem' }}>上裝：{p.equippedUpper?.name || '無'}</div>
                    <div style={{ paddingLeft: '0.5rem' }}>下裝：{p.equippedLower?.name || '無'}</div>
                  </div>
                  {p.isProtagonist && (
                    <div className="text-sm text-dim" style={{ marginTop: '0.3rem' }}>
                      <div style={{ color: 'var(--text-secondary)' }}>主角技能：</div>
                      <div style={{ paddingLeft: '0.5rem' }}>能力點：{p.statPoints}</div>
                      <div style={{ paddingLeft: '0.5rem' }}>
                        武器技能：{p.weaponSkillSlots.length > 0 ? p.weaponSkillSlots.map(skill => skill.name).join(' / ') : '無'}
                      </div>
                      <div style={{ paddingLeft: '0.5rem' }}>
                        身體槽 1：{p.bodySkillSlots[0] ? `${getBodySkillDef(p.bodySkillSlots[0].skillId)?.name ?? p.bodySkillSlots[0].skillId} Lv.${p.bodySkillSlots[0].level}` : '空'}
                      </div>
                      <div style={{ paddingLeft: '0.5rem' }}>
                        身體槽 2：{p.bodySkillSlots[1] ? `${getBodySkillDef(p.bodySkillSlots[1].skillId)?.name ?? p.bodySkillSlots[1].skillId} Lv.${p.bodySkillSlots[1].level}` : '空'}
                      </div>
                    </div>
                  )}
                  {p.statusEffects.length > 0 && (
                    <div className="text-sm" style={{ marginTop: '0.3rem' }}>
                      <div style={{ color: 'var(--text-secondary)' }}>狀態效果：</div>
                      {p.statusEffects.map((se, si) => (
                        <div
                          key={si}
                          style={{ paddingLeft: '0.5rem', color: STATUS_EFFECT_COLORS[getStatusEffectDisplayCategory(se)] }}
                        >
                          [{STATUS_EFFECT_LABELS[getStatusEffectDisplayCategory(se)]}] {se.name} ({se.effect}) - {formatStatusEffectMeta(se)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="panel-card">
                <div className="panel-title">背包</div>
                {state.inventory.length > 0 ? (
                  state.inventory.map(item => (
                    <div key={item.id} className="text-sm">{item.name} x{item.quantity}</div>
                  ))
                ) : (
                  <div className="text-sm text-dim">背包是空的</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Center - Narrative & Actions */}
        <div className="center-area">
          <div className="phase-bar">
            <div className="phase-indicator">
              <button className="btn btn-sm panel-toggle-btn" onClick={() => setShowPlayerPanel(!showPlayerPanel)}>
                {showPlayerPanel ? '◀ 角色' : '角色 ▶'}
              </button>
              <button className="btn btn-sm panel-toggle-btn log-toggle-btn" onClick={() => setShowLogPanel(!showLogPanel)}>
                {showLogPanel ? '日誌 ▶' : '◀ 日誌'}
              </button>
              <button className="btn btn-sm" onClick={() => setShowFullLog(true)}>
                📖 完整日誌
              </button>
              <div className="phase-dot" />
              <span className="phase-name">{state.phase}</span>
            </div>
            <span className="floor-info">第 {state.floor} 層 / {state.maxFloor}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-sm btn-danger" onClick={handleRestart}>重新開始</button>
              <button className="btn btn-sm" onClick={() => setShowSettings(true)}>⚙️</button>
            </div>
          </div>

          <div className="narrative-area" ref={scrollRef}>
            {state.phase === 'INIT' && initSubPhase === 'PROTAGONIST_SETUP' && (
              <div className="narrative-entry system">
                <p>帝國教會將你選為聖女候選人，命你深入地牢討伐魔物。</p>
                <p>主角職業固定，先為她命名後再挑選同行配角。</p>
                <div className="class-card selected" style={{ marginTop: '0.8rem' }}>
                  <h3>{PROTAGONIST_CLASS.className}</h3>
                  <div className="tags">{PROTAGONIST_CLASS.roleTags.join(' / ')}</div>
                  <div className="stats">STR:0 AGI:0 WIL:0</div>
                  <div className="stats">HP:60 SP:80</div>
                  <div className="stats">初始武器：鐵劍</div>
                </div>
                <div style={{ marginTop: '0.8rem' }}>
                  <div className="text-sm" style={{ marginBottom: '0.3rem' }}>主角名稱：</div>
                  <input
                    className="btn btn-sm"
                    style={{ width: '180px', background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '0.3rem 0.5rem' }}
                    placeholder="聖女候選人"
                    value={playerNames[0]}
                    onChange={e => { const n = [...playerNames] as [string, string]; n[0] = e.target.value; setPlayerNames(n); }}
                  />
                </div>
                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleProtagonistConfirm} disabled={!playerNames[0].trim()}>
                  下一步：選擇配角
                </button>
              </div>
            )}

            {state.phase === 'INIT' && initSubPhase === 'COMPANION_SELECT' && (
              <div className="narrative-entry system">
                <p>你可以攜帶一名同伴同行。請選擇配角職業與名稱。</p>
                <div className="text-sm" style={{ marginBottom: '0.3rem' }}>配角名稱：</div>
                <input
                  className="btn btn-sm"
                  style={{ width: '180px', background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '0.3rem 0.5rem' }}
                  placeholder="同行者"
                  value={playerNames[1]}
                  onChange={e => { const n = [...playerNames] as [string, string]; n[1] = e.target.value; setPlayerNames(n); }}
                />
                <div className="class-grid" style={{ marginTop: '0.8rem' }}>
                  {getAllCompanionClasses().map(cls => (
                    <div
                      key={cls.id}
                      className={`class-card ${classSelection[1] === cls.id ? 'selected' : ''}`}
                      onClick={() => { const s = [...classSelection] as [string, string]; s[1] = cls.id; setClassSelection(s); }}
                    >
                      <h3>{cls.className}</h3>
                      <div className="tags">{cls.roleTags.join(' / ')}</div>
                      <div className="stats">STR:{cls.autoStats.STR} AGI:{cls.autoStats.AGI} WIL:{cls.autoStats.WIL}</div>
                      <div className="stats">HP:{cls.baseHp} SP:{cls.baseSp}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button className="btn" onClick={() => setInitSubPhase('PROTAGONIST_SETUP')}>
                    ◀ 返回
                  </button>
                  <button className="btn btn-primary" onClick={handleCompanionConfirm} disabled={!classSelection[1]}>
                    下一步：設定角色身世
                  </button>
                </div>
              </div>
            )}

            {/* INIT: BIO_INPUT */}
            {state.phase === 'INIT' && initSubPhase === 'BIO_INPUT' && state.players && (
              <div className="narrative-entry system">
                <p>請為兩名角色填寫身世背景（作為 AI 生成角色簡歷的依據）：</p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                  {[0, 1].map(idx => (
                    <div key={idx} className="bio-form" style={{ flex: '1 1 300px' }}>
                      <h3 style={{ marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--sp-color)' }}>{state.players![idx].name} ({state.players![idx].className})</h3>
                      <div className="bio-input-group">
                        <label>種族</label>
                        <input className="btn btn-sm bio-input" placeholder="例如：人類、精靈、半獸人..." value={playerBios[idx].race} onChange={e => { const b = [...playerBios] as [BioInput, BioInput]; b[idx].race = e.target.value; setPlayerBios(b); }} />
                      </div>
                      <div className="bio-input-group">
                        <label>年齡</label>
                        <input className="btn btn-sm bio-input" placeholder="例如：19歲、未知..." value={playerBios[idx].age} onChange={e => { const b = [...playerBios] as [BioInput, BioInput]; b[idx].age = e.target.value; setPlayerBios(b); }} />
                      </div>
                      <div className="bio-input-group">
                        <label>外貌身材</label>
                        <input className="btn btn-sm bio-input" placeholder="例如：高大結實、銀髮紅眼..." value={playerBios[idx].appearance} onChange={e => { const b = [...playerBios] as [BioInput, BioInput]; b[idx].appearance = e.target.value; setPlayerBios(b); }} />
                      </div>
                      <div className="bio-input-group">
                        <label>簡單經歷與身分</label>
                        <textarea className="btn btn-sm bio-textarea" placeholder="例如：沒落貴族的騎士、被放逐的魔法學徒..." rows={2} value={playerBios[idx].background} onChange={e => { const b = [...playerBios] as [BioInput, BioInput]; b[idx].background = e.target.value; setPlayerBios(b); }} />
                      </div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleBioGenerate}>
                  ✨ 生成角色簡歷
                </button>
              </div>
            )}

            {/* INIT: BIO_GENERATE & BIO_CONFIRM */}
            {state.phase === 'INIT' && (initSubPhase === 'BIO_GENERATE' || initSubPhase === 'BIO_CONFIRM') && state.players && (
              <div className="narrative-entry system">
                <p>🎭 角色簡歷</p>
                <div className="biography-card">
                  <ReactMarkdown>{biographyText}</ReactMarkdown>
                  {isStreaming && <span className="typing-indicator" style={{ display: 'inline-block' }}><span /><span /><span /></span>}
                </div>
                {initSubPhase === 'BIO_CONFIRM' && (
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <button className="btn" onClick={() => setInitSubPhase('BIO_INPUT')}>
                      ◀ 重新填寫
                    </button>
                    <button className="btn" onClick={handleBioGenerate}>
                      🔄 重新生成
                    </button>
                    <button className="btn btn-primary" onClick={handleBioConfirm}>
                      ✅ 確認並開始冒險
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Log entries */}
            {visibleLogEntries.map((entry, i) => (
              <div key={i} className="narrative-entry-group">
                <div className={`narrative-entry ${entry.type}`}>
                  {entry.type === 'narrative' ? <ReactMarkdown>{entry.text}</ReactMarkdown> : entry.text}
                </div>
                {state.phase !== 'INIT' && i === visibleLogEntries.length - 1 && (
                  <button
                    className="regenerate-message-btn"
                    onClick={handleRegenerateNarrative}
                    disabled={isStreaming}
                    aria-label="重新生成對話"
                    title="重新生成對話"
                  >
                    🔄
                  </button>
                )}
              </div>
            ))}

            {/* Streaming narrative */}
            {isStreaming && narrativeText && (
              <div className="narrative-entry narrative">
                <ReactMarkdown>{narrativeText}</ReactMarkdown>
              </div>
            )}
            {isStreaming && !narrativeText && (
              <div className="typing-indicator"><span /><span /><span /></div>
            )}
          </div>

          {/* Action Area */}
          <div className="action-area">
            {state.phase === 'CUSTOM' && (
              <div className="action-buttons">
                <button className="btn" onClick={handleCustomDone}>完成自訂，開始探索 →</button>
              </div>
            )}
            {state.phase === 'EXPLORE' && (
              <div className="action-buttons">
                <button className="btn btn-primary" onClick={handleExplore} disabled={isStreaming}>⚔️ 前進探索</button>
              </div>
            )}
            {state.phase === 'COMBAT' && state.players && state.combat && state.combat.waitingForPlayer !== null && (
              <div className="action-buttons">
                {(() => {
                  const pIdx = state.combat.waitingForPlayer;
                  const currentPlayer = state.players[pIdx];

                  if (actionState.type === 'main') {
                    return (
                      <>
                        <div className="text-sm" style={{ width: '100%', marginBottom: '0.3rem', color: 'var(--sp-color)' }}>
                          行動階段：{currentPlayer.name} ({currentPlayer.className})
                        </div>
                        <button className="action-btn" disabled={isStreaming} onClick={() => setActionState({ type: 'attack_target' })}>
                          ⚔️ 攻擊
                        </button>
                        {currentPlayer.skills.filter(s => s.activation !== 'passive' && (!s.currentCooldown || s.currentCooldown === 0) && currentPlayer.sp >= s.spCost).map(s => (
                          <button key={s.id} className="action-btn skill" disabled={isStreaming} onClick={() => {
                            if (s.targeting === 'self') {
                              setActionState({ type: 'skill_confirm', selectedSkillId: s.id });
                            } else if (!skillNeedsTargetSelection(s)) {
                              setActionState({ type: 'skill_confirm', selectedSkillId: s.id });
                            } else {
                              setActionState({ type: 'skill_target', selectedSkillId: s.id });
                            }
                          }}>
                            ✨ {s.name} (SP:{s.spCost})
                          </button>
                        ))}
                        <button className="action-btn" disabled={isStreaming} onClick={() => handleCombatAction({ type: 'defend', playerIndex: pIdx })}>
                          🛡️ 防禦
                        </button>
                        <button className="action-btn" disabled={isStreaming} onClick={() => handleCombatAction({ type: 'flee', playerIndex: pIdx })}>
                          🏃 逃跑
                        </button>
                      </>
                    );
                  }

                  if (actionState.type === 'attack_target') {
                    return (
                      <>
                        <div className="text-sm" style={{ width: '100%', marginBottom: '0.3rem', color: 'var(--hp-color)' }}>
                          選擇攻擊目標：
                        </div>
                        {aliveEnemies.map(e => (
                          <button key={e.instanceId} className="action-btn" disabled={isStreaming} onClick={() => handleCombatAction({ type: 'attack', targetId: e.instanceId, playerIndex: pIdx })}>
                            🎯 {e.templateName}
                          </button>
                        ))}
                        <button className="action-btn" disabled={isStreaming} onClick={() => setActionState({ type: 'main' })}>
                          ↩️ 返回
                        </button>
                      </>
                    );
                  }

                  if (actionState.type === 'skill_target') {
                    const skill = currentPlayer.skills.find(s => s.id === actionState.selectedSkillId);
                    const isAllySkill = skill ? isAllyTargetingSkill(skill) : false;

                    return (
                      <>
                        <div className="text-sm" style={{ width: '100%', marginBottom: '0.3rem', color: 'var(--sp-color)' }}>
                          選擇技能目標：{skill?.name}
                        </div>
                        {skill && (
                          <div className="action-detail skill-detail">
                            技能描述：{getSkillDescription(skill)}
                          </div>
                        )}
                        {isAllySkill ? (
                          state.players.filter(p => !p.isBD).map((p, i) => (
                            <button key={i} className="action-btn skill" disabled={isStreaming} onClick={() => handleCombatAction({ type: 'skill', skillId: skill!.id, targetId: p.name /* uses name as id for player targets temporarily, though skill targeting players isn't fully using targetId yet */, playerIndex: pIdx })}>
                              ❤️ {p.name} (HP: {p.hp}/{p.maxHp})
                            </button>
                          ))
                        ) : (
                          aliveEnemies.map(e => (
                            <button key={e.instanceId} className="action-btn skill" disabled={isStreaming} onClick={() => handleCombatAction({ type: 'skill', skillId: skill!.id, targetId: e.instanceId, playerIndex: pIdx })}>
                              🎯 {e.templateName}
                            </button>
                          ))
                        )}
                        <button className="action-btn" disabled={isStreaming} onClick={() => setActionState({ type: 'main' })}>
                          ↩️ 返回
                        </button>
                      </>
                    );
                  }

                  if (actionState.type === 'skill_confirm') {
                    const skill = currentPlayer.skills.find(s => s.id === actionState.selectedSkillId);

                    if (!skill) {
                      return null;
                    }

                    return (
                      <>
                        <div className="text-sm" style={{ width: '100%', marginBottom: '0.3rem', color: 'var(--sp-color)' }}>
                          確認施放技能：{skill.name}
                        </div>
                        <div className="action-detail skill-detail">
                          技能描述：{getSkillDescription(skill)}
                        </div>
                        <button
                          className="action-btn skill"
                          disabled={isStreaming}
                          onClick={() => handleCombatAction({ type: 'skill', skillId: skill.id, playerIndex: pIdx })}
                        >
                          {skill.targeting === 'self' ? '✅ 對自己施放' : '✅ 確認施放'}
                        </button>
                        <button className="action-btn" disabled={isStreaming} onClick={() => setActionState({ type: 'main' })}>
                          ↩️ 返回
                        </button>
                      </>
                    );
                  }

                  return null;
                })()}
              </div>
            )}
            {state.phase === 'EVENT' && state.currentEvent && (
              <div className="action-buttons">
                <div className="text-sm" style={{ width: '100%', marginBottom: '0.3rem', color: 'var(--gold-color)' }}>
                  事件：{state.currentEvent.templateName}
                </div>
                {state.currentEvent.options.map(opt => (
                  <button key={opt.id} className="action-btn" disabled={isStreaming} onClick={() => handleEventOption(opt)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            {state.phase === 'REST' && protagonist && protagonist.statPoints > 0 && (
              <div className="action-buttons">
                <div className="text-sm" style={{ width: '100%', marginBottom: '0.3rem', color: 'var(--sp-color)' }}>
                  主角有 {protagonist.statPoints} 點能力點待分配
                </div>
                <button className="action-btn skill" disabled={isStreaming} onClick={() => handleAllocateStatPoint('str')}>STR +1</button>
                <button className="action-btn skill" disabled={isStreaming} onClick={() => handleAllocateStatPoint('agi')}>AGI +1</button>
                <button className="action-btn skill" disabled={isStreaming} onClick={() => handleAllocateStatPoint('wil')}>WIL +1</button>
                <button className="action-btn skill" disabled={isStreaming} onClick={() => handleAllocateStatPoint('maxHp')}>Max HP +8</button>
                <button className="action-btn skill" disabled={isStreaming} onClick={() => handleAllocateStatPoint('maxSp')}>Max SP +10</button>
              </div>
            )}
            {state.phase === 'REST' && protagonist && protagonist.statPoints <= 0 && state.pendingBodySkillDrop && (
              <div className="action-buttons">
                <div className="text-sm" style={{ width: '100%', marginBottom: '0.3rem', color: 'var(--sp-color)' }}>
                  獲得身體技能：{getBodySkillDef(state.pendingBodySkillDrop.skillId)?.name ?? state.pendingBodySkillDrop.skillId}
                </div>
                <button className="action-btn skill" disabled={isStreaming} onClick={() => handleBodySkillDecision('replace', 0)}>
                  替換槽 1
                </button>
                <button className="action-btn skill" disabled={isStreaming} onClick={() => handleBodySkillDecision('replace', 1)}>
                  替換槽 2
                </button>
                {protagonist.bodySkillSlots[0] && (protagonist.bodySkillSlots[0]!.level < (getBodySkillDef(protagonist.bodySkillSlots[0]!.skillId)?.maxLevel ?? 0)) && (
                  <button className="action-btn skill" disabled={isStreaming} onClick={() => handleBodySkillDecision('upgrade', 0)}>
                    升級槽 1
                  </button>
                )}
                {protagonist.bodySkillSlots[1] && (protagonist.bodySkillSlots[1]!.level < (getBodySkillDef(protagonist.bodySkillSlots[1]!.skillId)?.maxLevel ?? 0)) && (
                  <button className="action-btn skill" disabled={isStreaming} onClick={() => handleBodySkillDecision('upgrade', 1)}>
                    升級槽 2
                  </button>
                )}
                <button className="action-btn" disabled={isStreaming} onClick={() => handleBodySkillDecision('discard')}>
                  放棄
                </button>
              </div>
            )}
            {state.phase === 'REST' && (!protagonist || (protagonist.statPoints <= 0 && !state.pendingBodySkillDrop)) && (
              <div className="action-buttons">
                {[1, 2, 3, 4, 5].map(i => {
                  const remaining = Math.max(0, 3 - state.exploreRestCount);
                  let label = ['', `原地休息 [剩餘:${remaining}]`, `探索該層 [剩餘:${remaining}]`, '下一層', '檢查狀態 (不耗回合)', '修補裝備'][i];
                  if (i === 5) {
                    const mats = state.inventory.find(item => item.type === 'material')?.quantity || 0;
                    label = `修補裝備 (${mats}個備品)[剩餘:${remaining}]`;
                  }
                  const actionBtnClass = "action-btn" + ([1, 2, 5].includes(i) && remaining === 0 ? " disabled-looks" : "");
                  return (
                    <button key={i} className={actionBtnClass} disabled={isStreaming} onClick={() => handleRestAction(i)}>
                      {label}
                    </button>
                  );
                })}
                <button className="action-btn" disabled={isStreaming} onClick={() => setShowBackpackModal(true)}>
                  🎒 開啟背包 ({state.inventory.reduce((a, c) => a + c.quantity, 0)} 件)
                </button>
              </div>
            )}
            {state.phase === 'SPECIAL' && (
              <div className="action-buttons">
                <div className="text-sm" style={{ width: '100%', marginBottom: '0.3rem' }}>SPECIAL 回合 {state.specialTurn}/{state.specialMaxTurn}</div>
                {['嘗試掙脫', '觀察環境', '保守應對'].map(a => (
                  <button key={a} className="action-btn" disabled={isStreaming} onClick={() => handleSpecialAction(a)}>{a}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Combat/Info */}
        {showLogPanel && (
          <div className="side-panel-overlay" onClick={() => setShowLogPanel(false)}>
            <div className="side-panel right-panel" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <span className="panel-title" style={{ margin: 0 }}>日誌與資訊</span>
                <button className="btn btn-sm" onClick={() => setShowLogPanel(false)}>✕</button>
              </div>
              <div className="panel-card" style={{ padding: '0.5rem', marginBottom: '0.8rem', textAlign: 'center', fontWeight: 'bold', color: 'var(--sp-color)', border: '1px solid var(--border)' }}>
                📍 目前層數：第 {state.floor} 層 / {state.maxFloor}
              </div>
              {aliveEnemies.length > 0 && (
                <div className="panel-card">
                  <div className="panel-title">敵人</div>
                  {aliveEnemies.map(e => (
                    <div key={e.instanceId} className="enemy-item">
                      <span className="enemy-name">
                        {e.templateName}
                        {e.isControlled && <span className="badge danger" style={{ marginLeft: '0.4rem' }}>被控制 ({e.controlSource ? `${e.controlSource} ` : ''}剩餘 {e.controlTurns} 回合)</span>}
                      </span>
                      <div className="enemy-hp-bar">
                        <div className="enemy-hp-fill" style={{ width: `${(e.hp / e.maxHp) * 100}%` }} />
                      </div>
                      <span className="stat-value">{e.hp}/{e.maxHp}</span>
                    </div>
                  ))}
                </div>
              )}
              {state.combat && (
                <div className="panel-card">
                  <div className="panel-title">戰鬥資訊</div>
                  <div className="text-sm">回合: {state.combat.roundNumber}</div>
                  <div className="text-sm">預期: {state.combat.expectedRounds} 回合</div>
                  {state.combat.softPenalty > 0 && <div className="text-sm" style={{ color: 'var(--des-color)' }}>閃避懲罰: -{state.combat.softPenalty}</div>}
                </div>
              )}
              <div className="panel-card">
                <div className="panel-title">戰鬥日誌</div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {state.log.filter(l => l.type === 'dice' || l.type === 'combat').slice(-20).map((l, i) => (
                    <div key={i} className="text-sm" style={{ marginBottom: '0.3rem', color: l.type === 'dice' ? 'var(--gold-color)' : 'var(--text-secondary)' }}>{l.text}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {showSettings && <SettingsModal config={config} onSave={(c: GameConfig) => { updateConfig(c); if (state) { state.nsgEnabled = c.nsgEnabled; setState({ ...state }); } setShowSettings(false); }} onClose={() => setShowSettings(false)} />}
      {showFullLog && state && <LogViewerModal log={state.log} onClose={() => setShowFullLog(false)} />}
      {showBackpackModal && state && state.players && (
        <BackpackModal
          inventory={state.inventory}
          players={state.players}
          onUseItem={(itemId, playerIndex) => {
            const item = state.inventory.find(i => i.id === itemId);
            if (!item || !state.players) return;
            const player = state.players[playerIndex];
            const effects: string[] = [];
            const changes = item.stateChanges || {};
            if (changes.hp_delta) { player.hp = Math.min(player.maxHp, player.hp + changes.hp_delta); effects.push(`HP +${changes.hp_delta}`); }
            if (changes.sp_delta) { player.sp = Math.min(player.maxSp, player.sp + changes.sp_delta); effects.push(`SP +${changes.sp_delta}`); }
            if (typeof changes.des_set === 'number') {
              player.des = Math.max(0, Math.min(100, changes.des_set));
              effects.push(`DES 設為 ${player.des}`);
            }
            if (changes.des_delta) {
              const appliedDesDelta = applyPlayerDesChange(player, changes.des_delta);
              effects.push(`DES ${appliedDesDelta > 0 ? '+' : ''}${appliedDesDelta}`);
            }
            if (changes.des_cap_delta) {
              applyStatusEffect(player, {
                name: `${item.name}的代價`,
                effect: `DES 上限 ${changes.des_cap_delta}`,
                type: 'statMod',
                category: 'curse',
                expiresOnBattleEnd: false,
                removalCondition: '特殊手段解除',
                targetStat: 'desCap',
                amount: changes.des_cap_delta,
              });
              effects.push(`DES 上限 ${changes.des_cap_delta}`);
            }
            if (changes.amp_buff_delta) {
              applyStatusEffect(player, {
                name: `${item.name}增幅`,
                effect: `戰鬥傷害 +${changes.amp_buff_delta}%`,
                type: 'buff',
                category: 'buff',
                expiresOnBattleEnd: true,
                targetStat: 'amp',
                amount: changes.amp_buff_delta,
              });
              effects.push(`戰鬥傷害 +${changes.amp_buff_delta}%（持續至戰鬥結束）`);
            }
            if (changes.des_dot_delta) {
              applyStatusEffect(player, {
                name: `${item.name}副作用`,
                effect: `戰鬥中每回合 DES +${changes.des_dot_delta}`,
                type: 'dot',
                category: 'debuff',
                expiresOnBattleEnd: true,
                targetStat: 'des',
                amount: changes.des_dot_delta,
              });
              effects.push(`戰鬥中每回合 DES +${changes.des_dot_delta}`);
            }
            if (changes.dr_u_delta) {
              if (setEquippedItemDurability(player, 'Upper', player.upperDurability + changes.dr_u_delta)) {
                addLogEntry(state, 'system', `${player.name} 因衣裝破損而被控制 1 回合！`);
              }
              effects.push(`上衣耐久 +${changes.dr_u_delta}`);
            }
            if (changes.dr_l_delta) {
              if (setEquippedItemDurability(player, 'Lower', player.lowerDurability + changes.dr_l_delta)) {
                addLogEntry(state, 'system', `${player.name} 因衣裝破損而被控制 1 回合！`);
              }
              effects.push(`下衣耐久 +${changes.dr_l_delta}`);
            }
            recalculatePlayerStats(player);
            item.quantity--;
            if (item.quantity <= 0) state.inventory.splice(state.inventory.indexOf(item), 1);
            const effectStr = effects.length > 0 ? effects.join('、') : '無立即效果';
            addLogEntry(state, 'system', `${player.name} 使用了【${item.name}】→ ${effectStr}`);
            saveGame(state);
            if (checkAndApplyBadEnd(state)) {
              setShowBackpackModal(false);
              setState({ ...state });
              requestAINarrative(state, undefined, `${player.name} 使用了【${item.name}】，${effectStr}。`);
              return;
            }
            setState({ ...state });
            requestAINarrative(state, undefined, `${player.name} 從背包取出【${item.name}】服用，${effectStr}。`);
          }}
          onEquipItem={(itemId) => {
            const protagonist = state.players?.find((player) => player.isProtagonist);
            const itemIndex = state.inventory.findIndex((i) => i.id === itemId);
            if (!protagonist || itemIndex === -1) return;

            const item = state.inventory[itemIndex];
            const slotLabel =
              item.equipSlot === 'Weapon' ? '武器' : item.equipSlot === 'Upper' ? '上裝' : item.equipSlot === 'Lower' ? '下裝' : '裝備';
            const previousItemName =
              item.equipSlot === 'Weapon'
                ? protagonist.equippedWeapon?.name
                : item.equipSlot === 'Upper'
                  ? protagonist.equippedUpper?.name
                  : item.equipSlot === 'Lower'
                    ? protagonist.equippedLower?.name
                    : undefined;
            const previousItem = equipProtagonistEquipment(protagonist, item);
            const equippedItem =
              item.equipSlot === 'Weapon'
                ? protagonist.equippedWeapon
                : item.equipSlot === 'Upper'
                  ? protagonist.equippedUpper
                  : item.equipSlot === 'Lower'
                    ? protagonist.equippedLower
                    : null;
            if (!equippedItem) return;

            state.inventory.splice(itemIndex, 1);
            if (previousItem) state.inventory.push(previousItem);

            addLogEntry(
              state,
              'system',
              previousItemName
                ? `主角將${slotLabel}從【${previousItemName}】更換為【${equippedItem.name}】`
                : `主角裝備了【${equippedItem.name}】`,
            );
            saveGame(state);
            setState({ ...state });
          }}
          onUnequipItem={(slot) => {
            const protagonist = state.players?.find((player) => player.isProtagonist);
            if (!protagonist) return;

            const removedItem = unequipProtagonistEquipment(protagonist, slot);
            if (!removedItem) return;

            state.inventory.push(removedItem);
            addLogEntry(state, 'system', `主角脫下了【${removedItem.name}】`);
            saveGame(state);
            setState({ ...state });
          }}
          onClose={() => setShowBackpackModal(false)}
        />
      )}
    </>
  );
}

// --- Sub-components ---

function StatBar({ label, value, max, type }: { label: string; value: number; max: number; type: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  let cls = type;
  if (type === 'hp') { if (pct < 25) cls += ' low'; else if (pct < 50) cls += ' mid'; }
  if (type === 'des') {
    if (value <= 20) cls += ' des-low';
    else if (value <= 50) cls += ' des-mid';
    else if (value <= 80) cls += ' des-high';
    else cls += ' des-critical';
  }
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <div className="stat-bar-container"><div className={`stat-bar ${cls}`} style={{ width: `${pct}%` }} /></div>
      <span className="stat-value">{value}/{max}</span>
    </div>
  );
}

function SettingsModal({ config, onSave, onClose }: {
  config: GameConfig;
  onSave: (c: GameConfig) => void; onClose: () => void;
}) {
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [modelId, setModelId] = useState(config.modelId);
  const [nsg, setNsg] = useState(config.nsgEnabled);
  const [isValidating, setIsValidating] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'none' | 'valid' | 'invalid'>('none');

  useEffect(() => {
    if (!apiKey) {
      setKeyStatus('none');
      return;
    }
    const timer = setTimeout(async () => {
      setIsValidating(true);
      try {
        const res = await fetch('https://openrouter.ai/api/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        setKeyStatus(res.ok ? 'valid' : 'invalid');
      } catch {
        setKeyStatus('invalid');
      }
      setIsValidating(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [apiKey]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>⚙️ 設定</h2>
        <div className="modal-field">
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>OpenRouter API Key</span>
            {isValidating && <span style={{ color: 'var(--sp-color)', fontSize: '0.75rem' }}>驗證中...</span>}
            {!isValidating && keyStatus === 'valid' && <span style={{ color: 'var(--hp-high)', fontSize: '0.75rem' }}>✅ 驗證成功</span>}
            {!isValidating && keyStatus === 'invalid' && <span style={{ color: 'var(--hp-low)', fontSize: '0.75rem' }}>❌ 無效的憑證</span>}
          </label>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-or-..." />
        </div>
        <div className="modal-field">
          <label>AI 模型</label>
          <select value={modelId} onChange={e => setModelId(e.target.value)}>
            <optgroup label="推薦模型">
              {RECOMMENDED_MODELS.map(m => <option key={m.id} value={m.id}>{m.name} ({Math.round(m.contextLength / 1000)}K)</option>)}
            </optgroup>
            <optgroup label="NSFW模型">
              {NSFW_MODELS.map(m => <option key={m.id} value={m.id}>{m.name} ({Math.round(m.contextLength / 1000)}K)</option>)}
            </optgroup>
          </select>
        </div>
        <div className="modal-field">
          <div className="toggle-row">
            <label>NSG 敘事風格 (NSFW)</label>
            <button className={`toggle ${nsg ? 'active' : ''}`} onClick={() => setNsg(!nsg)} />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => onSave({ apiKey, modelId, modelName: [...RECOMMENDED_MODELS, ...NSFW_MODELS].find(m => m.id === modelId)?.name ?? modelId, nsgEnabled: nsg })}>儲存</button>
        </div>
      </div>
    </div>
  );
}

function BackpackModal({ inventory, players, onUseItem, onEquipItem, onUnequipItem, onClose }: {
  inventory: import('./types').InventoryItem[];
  players: [import('./types').PlayerState, import('./types').PlayerState];
  onUseItem: (itemId: string, playerIndex: number) => void;
  onEquipItem: (itemId: string) => void;
  onUnequipItem: (slot: 'Weapon' | 'Upper' | 'Lower') => void;
  onClose: () => void;
}) {
  const [selectingPlayerFor, setSelectingPlayerFor] = useState<string | null>(null);

  const protagonist = players.find((player) => player.isProtagonist) ?? null;
  const usableItems = inventory.filter(i => i.type === 'potion' && i.quantity > 0 && i.stateChanges && Object.keys(i.stateChanges).length > 0);
  const weaponItems = inventory.filter((i) => i.type === 'weapon' && i.quantity > 0);
  const upperArmorItems = inventory.filter((i) => i.type === 'armor_upper' && i.quantity > 0);
  const lowerArmorItems = inventory.filter((i) => i.type === 'armor_lower' && i.quantity > 0);
  const otherItems = inventory.filter(i =>
    i.type !== 'weapon' &&
    i.type !== 'armor_upper' &&
    i.type !== 'armor_lower' &&
    !(i.type === 'potion' && i.stateChanges && Object.keys(i.stateChanges).length > 0),
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '480px', width: '92vw' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>🎒 背包</h2>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>

        {selectingPlayerFor && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div className="text-sm" style={{ color: 'var(--sp-color)', marginBottom: '0.5rem' }}>
              選擇使用對象：{inventory.find(i => i.id === selectingPlayerFor)?.name}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {players.map((p, pi) => (
                <button key={pi} className="btn btn-primary btn-sm" disabled={!p.isAlive || p.isBD} onClick={() => {
                  onUseItem(selectingPlayerFor, pi);
                  setSelectingPlayerFor(null);
                }}>
                  {p.name} (HP:{p.hp}/{p.maxHp})
                </button>
              ))}
              <button className="btn btn-sm" onClick={() => setSelectingPlayerFor(null)}>取消</button>
            </div>
          </div>
        )}

        {usableItems.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div className="panel-title" style={{ marginBottom: '0.5rem' }}>可使用道具</div>
            {usableItems.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {item.name} <span style={{ color: 'var(--text-dim)' }}>x{item.quantity}</span>
                  </div>
                  {item.effectSummary && <div className="text-sm" style={{ color: 'var(--sp-color)' }}>{item.effectSummary}</div>}
                </div>
                <button
                  className="btn btn-sm btn-primary"
                  disabled={selectingPlayerFor !== null}
                  onClick={() => setSelectingPlayerFor(item.id)}
                >
                  使用
                </button>
              </div>
            ))}
          </div>
        )}

        {protagonist && (
          <div style={{ marginBottom: '1rem' }}>
            <div className="panel-title" style={{ marginBottom: '0.5rem' }}>目前穿戴裝備</div>
            {([
              { slot: 'Weapon', label: '武器', item: protagonist.equippedWeapon },
              { slot: 'Upper', label: '上裝', item: protagonist.equippedUpper },
              { slot: 'Lower', label: '下裝', item: protagonist.equippedLower },
            ] as const).map(({ slot, label, item }) => (
              <div key={slot} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {label}：{item?.name ?? '未裝備'}
                  </div>
                  {item && (
                    <div className="text-sm" style={{ color: 'var(--text-dim)' }}>
                      {slot === 'Weapon'
                        ? `ATK ${item.atk ?? 0}${typeof item.ampPercent === 'number' ? ` / AMP +${item.ampPercent}%` : ''}${typeof item.flatDr === 'number' ? ` / DR +${item.flatDr}` : ''}`
                        : `耐久 ${item.durability ?? item.durabilityMax ?? 100}/${item.durabilityMax ?? 100}`}
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-sm"
                  disabled={selectingPlayerFor !== null || !item}
                  onClick={() => onUnequipItem(slot)}
                >
                  脫下
                </button>
              </div>
            ))}
          </div>
        )}

        {weaponItems.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div className="panel-title" style={{ marginBottom: '0.5rem' }}>可裝備武器</div>
            {weaponItems.map((item) => {
              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {item.name}
                      {typeof item.atk === 'number' && <span style={{ color: 'var(--text-dim)' }}> / ATK {item.atk}</span>}
                      {typeof item.ampPercent === 'number' && <span style={{ color: 'var(--text-dim)' }}> / AMP +{item.ampPercent}%</span>}
                      {typeof item.flatDr === 'number' && <span style={{ color: 'var(--text-dim)' }}> / DR +{item.flatDr}</span>}
                    </div>
                    {protagonist?.equippedWeapon?.templateId === item.templateId && <div className="text-sm" style={{ color: 'var(--sp-color)' }}>與目前武器同型</div>}
                  </div>
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={selectingPlayerFor !== null || !item.templateId}
                    onClick={() => onEquipItem(item.id)}
                  >
                    裝備
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {upperArmorItems.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div className="panel-title" style={{ marginBottom: '0.5rem' }}>可裝備上裝</div>
            {upperArmorItems.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {item.name}
                    {typeof item.drU === 'number' && <span style={{ color: 'var(--text-dim)' }}> / DRU {item.drU}</span>}
                    {typeof item.flatDr === 'number' && <span style={{ color: 'var(--text-dim)' }}> / Flat DR +{item.flatDr}</span>}
                    {typeof item.ampPercent === 'number' && <span style={{ color: 'var(--text-dim)' }}> / AMP +{item.ampPercent}%</span>}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-dim)' }}>
                    耐久 {item.durability ?? item.durabilityMax ?? 100}/{item.durabilityMax ?? 100}
                  </div>
                  {protagonist?.equippedUpper?.templateId === item.templateId && <div className="text-sm" style={{ color: 'var(--sp-color)' }}>與目前上裝同型</div>}
                </div>
                <button
                  className="btn btn-sm btn-primary"
                  disabled={selectingPlayerFor !== null || !item.templateId}
                  onClick={() => onEquipItem(item.id)}
                >
                  裝備
                </button>
              </div>
            ))}
          </div>
        )}

        {lowerArmorItems.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div className="panel-title" style={{ marginBottom: '0.5rem' }}>可裝備下裝</div>
            {lowerArmorItems.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {item.name}
                    {typeof item.drL === 'number' && <span style={{ color: 'var(--text-dim)' }}> / DRL {item.drL}</span>}
                    {typeof item.flatDr === 'number' && <span style={{ color: 'var(--text-dim)' }}> / Flat DR +{item.flatDr}</span>}
                    {typeof item.ampPercent === 'number' && <span style={{ color: 'var(--text-dim)' }}> / AMP +{item.ampPercent}%</span>}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-dim)' }}>
                    耐久 {item.durability ?? item.durabilityMax ?? 100}/{item.durabilityMax ?? 100}
                  </div>
                  {protagonist?.equippedLower?.templateId === item.templateId && <div className="text-sm" style={{ color: 'var(--sp-color)' }}>與目前下裝同型</div>}
                </div>
                <button
                  className="btn btn-sm btn-primary"
                  disabled={selectingPlayerFor !== null || !item.templateId}
                  onClick={() => onEquipItem(item.id)}
                >
                  裝備
                </button>
              </div>
            ))}
          </div>
        )}

        {otherItems.length > 0 && (
          <div>
            <div className="panel-title" style={{ marginBottom: '0.5rem' }}>其他物品</div>
            {otherItems.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
                <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  {item.name} <span style={{ color: 'var(--text-dim)' }}>x{item.quantity}</span>
                </div>
                <div className="text-sm" style={{ color: 'var(--text-dim)' }}>{item.type === 'material' ? '材料' : item.type}</div>
              </div>
            ))}
          </div>
        )}

        {inventory.length === 0 && (
          <div className="text-sm text-dim" style={{ textAlign: 'center', padding: '2rem 0' }}>背包是空的</div>
        )}
      </div>
    </div>
  );
}

function LogViewerModal({ log, onClose }: { log: GameLogEntry[]; onClose: () => void }) {
  const [filter, setFilter] = useState<'all' | 'narrative' | 'combat' | 'system'>('all');

  const filteredLog = log.filter(l => {
    if (filter === 'all') return true;
    if (filter === 'narrative') return l.type === 'narrative';
    if (filter === 'combat') return l.type === 'combat' || l.type === 'dice';
    if (filter === 'system') return l.type === 'system' || l.type === 'state_change';
    return true;
  });

  const handleExport = () => {
    let content = `地牢探索完整日誌\n匯出時間：${new Date().toLocaleString()}\n\n`;
    content += `--- 日誌開始 ---\n\n`;
    log.forEach(l => {
      const time = new Date(l.timestamp).toLocaleTimeString();
      let prefix = `[${time}] [層數:${l.floor}] [${l.phase}] `;
      if (l.type === 'system') prefix += '🔧 系統: ';
      else if (l.type === 'combat') prefix += '⚔️ 戰鬥: ';
      else if (l.type === 'dice') prefix += '🎲 擲骰: ';
      else if (l.type === 'narrative') prefix += '📖 敘事: ';
      else if (l.type === 'event') prefix += '📜 事件: ';

      content += `${prefix}${l.text}\n`;
      if (l.type === 'narrative') content += '\n';
    });
    content += `\n--- 日誌結束 ---`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `地牢日誌_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '800px', width: '90vw', height: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>📖 完整冒險日誌 ({log.length} 筆)</h2>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : ''}`} onClick={() => setFilter('all')}>全部</button>
          <button className={`btn btn-sm ${filter === 'narrative' ? 'btn-primary' : ''}`} onClick={() => setFilter('narrative')}>📖 劇情與敘事</button>
          <button className={`btn btn-sm ${filter === 'combat' ? 'btn-primary' : ''}`} onClick={() => setFilter('combat')}>⚔️ 戰鬥與擲骰</button>
          <button className={`btn btn-sm ${filter === 'system' ? 'btn-primary' : ''}`} onClick={() => setFilter('system')}>🔧 系統紀錄</button>

          <div style={{ flex: 1 }} />
          <button className="btn btn-sm btn-primary" onClick={handleExport}>📥 匯出為 TXT</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
          {filteredLog.map((entry, i) => (
            <div key={i} className={`narrative-entry ${entry.type}`} style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.2rem' }}>
                [{new Date(entry.timestamp).toLocaleTimeString()}] F{entry.floor} - {entry.phase}
              </div>
              {entry.type === 'narrative' ? <ReactMarkdown>{entry.text}</ReactMarkdown> : entry.text}
            </div>
          ))}
          {filteredLog.length === 0 && <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '2rem' }}>無符合條件的日誌</div>}
        </div>
      </div>
    </div>
  );
}

