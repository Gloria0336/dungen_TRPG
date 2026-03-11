import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import type {
  GameState, GameConfig, CombatAction, CombatTurnResult,
  GameLogEntry, EventOption,
} from './types';
import { getAllClasses } from './data/classes';
import {
  createNewRun, initializePlayer, saveGame, loadGame,
  hasSave, deleteSave, addLogEntry, createSnapshot,
} from './engine/stateManager';
import {
  initCombat, processPlayerAction,
  isCombatVictory, advanceCombat
} from './engine/combatEngine';
import { generateExploreEncounter, processRestAction } from './engine/phaseEngine';
import { generateGoldDrop, rollItemDrop, processGrowth } from './engine/lootEngine';
// shop engine used indirectly via phase transitions
import { formatDiceResult } from './engine/diceEngine';
import { requestNarrative, addNarrativeToHistory } from './ai/narrativeService';
import { generateBiography, type BioInput } from './ai/biographyService';
import { RECOMMENDED_MODELS, NSFW_MODELS } from './ai/openrouter';
import { getRandomEvent } from './data/events';
import './index.css';

const CONFIG_KEY = 'dungen_trpg_config';

type ActionSelectionState = {
  type: 'main' | 'attack_target' | 'skill_target' | 'item_target';
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
  const [classSelection, setClassSelection] = useState<[string, string]>(['', '']);
  const [playerNames, setPlayerNames] = useState<[string, string]>(['', '']);
  const [showPlayerPanel, setShowPlayerPanel] = useState(false);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [showFullLog, setShowFullLog] = useState(false);
  const [initSubPhase, setInitSubPhase] = useState<'CLASS_SELECT' | 'BIO_INPUT' | 'BIO_GENERATE' | 'BIO_CONFIRM'>('CLASS_SELECT');
  const [playerBios, setPlayerBios] = useState<[BioInput, BioInput]>([
    { race: '', age: '', appearance: '', background: '' },
    { race: '', age: '', appearance: '', background: '' }
  ]);
  const [biographyText, setBiographyText] = useState('');
  const [actionState, setActionState] = useState<ActionSelectionState>({ type: 'main' });
  const scrollRef = useRef<HTMLDivElement>(null);

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
    gs: GameState, results?: CombatTurnResult[], extra?: string, skipAutoTrigger?: boolean
  ) => {
    if (!config.apiKey) return;
    setIsStreaming(true); setNarrativeText('');
    let full = '';
    try {
      for await (const chunk of requestNarrative(config.apiKey, config.modelId, gs, results, extra)) {
        full += chunk; setNarrativeText(full);
      }
      addNarrativeToHistory(gs, full);
      addLogEntry(gs, 'narrative', full);
    } catch (e: any) {
      addLogEntry(gs, 'system', `❌ AI 錯誤: ${e.message}`);
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
            res.diceResults.forEach(d => addLogEntry(gs, 'dice', formatDiceResult(d)));
            if (res.damageDealt > 0) addLogEntry(gs, 'combat', `${res.actorName} 對 ${res.targetName} 造成 ${res.damageDealt} 點傷害`);
            if (res.controlApplied) addLogEntry(gs, 'combat', `${res.targetName} 被控制！`);
            if (res.action === '被控制，無法行動') addLogEntry(gs, 'combat', `${res.actorName} 被控制中，跳過行動`);
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

  // --- Start Screen ---
  if (screen === 'start') {
    return (
      <>
        <div className="start-screen">
          <h1 className="start-title">地牢探索</h1>
          <p className="start-subtitle">通用回合制地牢探索系統 v1.4</p>
          <div className="start-buttons">
            <button className="btn btn-primary" onClick={() => {
              const gs = createNewRun();
              gs.nsgEnabled = config.nsgEnabled;
              setInitSubPhase('CLASS_SELECT');
              setPlayerBios([{ race: '', age: '', appearance: '', background: '' }, { race: '', age: '', appearance: '', background: '' }]);
              setBiographyText('');
              setState(gs); setScreen('game');
              addLogEntry(gs, 'system', `新冒險開始！Run ID: ${gs.runId}`);
              addLogEntry(gs, 'system', `商人出現點: 第${gs.shopFloors[0]}層、第${gs.shopFloors[1]}層`);
            }}>開始新冒險</button>
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

  // --- INIT: Class Selection ---
  const handleClassConfirm = () => {
    if (!classSelection[0] || !classSelection[1]) return;
    const p1 = initializePlayer(classSelection[0], playerNames[0] || '角色1', 0);
    const p2 = initializePlayer(classSelection[1], playerNames[1] || '角色2', 1);
    state.players = [p1, p2];
    setInitSubPhase('BIO_INPUT');
    addLogEntry(state, 'system', `職業與名稱選擇完成，請填寫角色身世。`);
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
    requestAINarrative(state, undefined, '冒險開始！兩名角色剛踏入地牢入口，空氣混雜著潮濕與古老石塵的味道。請結合這份角色簡歷描述開場場景。');
    setInitSubPhase('CLASS_SELECT');
  };

  const handleCustomDone = () => {
    state.phase = 'EXPLORE';
    addLogEntry(state, 'system', `進入第 ${state.floor} 層 - 探索階段`);
    setState({ ...state });
  };

  const handleExplore = () => {
    const encounter = generateExploreEncounter(state.floor, state);
    if (encounter.type === 'combat' && encounter.enemies) {
      state.enemies = encounter.enemies;
      state.combat = initCombat(state.players!, state.enemies);
      state.phase = 'COMBAT';
      setActionState({ type: 'main' });
      addLogEntry(state, 'system', `遭遇敵人！${encounter.enemies.map(e => `${e.templateName}(${e.tier})`).join('、')}`);

      const nextResults = advanceCombat(state);
      for (const res of nextResults) {
        res.diceResults.forEach(d => addLogEntry(state, 'dice', formatDiceResult(d)));
        if (res.damageDealt > 0) addLogEntry(state, 'combat', `${res.actorName} 對 ${res.targetName} 造成 ${res.damageDealt} 點傷害`);
        if (res.controlApplied) addLogEntry(state, 'combat', `${res.targetName} 被控制！`);
        if (res.action === '被控制，無法行動') addLogEntry(state, 'combat', `${res.actorName} 被控制中，跳過行動`);
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
    const result = processPlayerAction(action, player, state.enemies, state);

    result.diceResults.forEach(d => addLogEntry(state, 'dice', formatDiceResult(d)));
    if (result.damageDealt > 0) addLogEntry(state, 'combat', `${result.actorName} 對 ${result.targetName} 造成 ${result.damageDealt} 點傷害`);
    if (result.controlApplied) addLogEntry(state, 'combat', `${result.targetName} 被控制！`);

    state.combat.pendingResults.push(result);

    // Continue the turn loop by processing the rest of the queue
    const nextResults = advanceCombat(state);
    let specialTriggered = false;
    for (const res of nextResults) {
      res.diceResults.forEach(d => {
        addLogEntry(state, 'dice', formatDiceResult(d));
        if (d.purpose.includes('隱藏觸發') && d.success) specialTriggered = true;
      });
      if (res.damageDealt > 0) addLogEntry(state, 'combat', `${res.actorName} 對 ${res.targetName} 造成 ${res.damageDealt} 點傷害`);
      if (res.controlApplied) addLogEntry(state, 'combat', `${res.targetName} 被控制！`);
      if (res.action === '被控制，無法行動') addLogEntry(state, 'combat', `${res.actorName} 被控制中，跳過行動`);
    }

    if (specialTriggered) {
      addLogEntry(state, 'system', `⚠️ 隱藏觸發！進入 SPECIAL 階段`);
      state.phase = 'SPECIAL';
      state.specialTurn = 1;
      state.specialMaxTurn = 4;
    }

    if (state.combat.isComplete) {
      if (isCombatVictory(state.enemies)) {
        const gold = generateGoldDrop(state.enemies, state.floor);
        state.gold += gold;
        addLogEntry(state, 'system', `🎉 戰鬥勝利！獲得 ${gold} 金幣`);
        const drop = rollItemDrop(state.floor);
        if (drop) { state.inventory.push(drop); addLogEntry(state, 'system', `掉落: ${drop.name}`); }
        for (const p of state.players) {
          if (p.isAlive && !p.isBD) {
            const growth = processGrowth(p, state.floor);
            if (growth.length) addLogEntry(state, 'system', `${p.name} 成長: ${growth.join(', ')}`);
          }
        }
        state.phase = 'REST';
        state.combat = null;
        state.enemies = [];
      } else {
        if (state.players.every(p => !p.isAlive || p.isBD)) {
          state.phase = 'END';
          addLogEntry(state, 'system', '💀 兩名角色皆陣亡，冒險結束。');
        }
      }
    }

    setActionState({ type: 'main' });
    createSnapshot(state);
    setState({ ...state });
    requestAINarrative(state, [result, ...nextResults]);
  };

  const handleRestAction = (index: number) => {
    const result = processRestAction(index, state);
    addLogEntry(state, 'system', result.result);
    if (index === 3 && result.phaseChange === 'EXPLORE') {
      state.floor++;
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

    if (option.requiredCheck !== '無') {
      // Basic stat check logic
      const isAgi = option.requiredCheck.includes('AGI') || option.requiredCheck.includes('DEX');
      const isStr = option.requiredCheck.includes('STR');
      const isInt = option.requiredCheck.includes('INT');
      const isVit = option.requiredCheck.includes('VIT') || option.requiredCheck.includes('WIL');

      const statVal = isAgi ? state.players![0].agi :
        isStr ? state.players![0].str :
          isInt ? state.players![0].wil : // Map INT to WIL
            isVit ? state.players![0].wil : 10;

      const roll = Math.floor(Math.random() * 100) + 1;
      // Formula: 1D100 <= 50 + stat*5
      const threshold = 50 + statVal * 5;
      const success = roll <= threshold;

      addLogEntry(state, 'dice', `【事件檢定】門檻: ${threshold}% | 擲骰: 1D100=${roll} → ${success ? '✓ 成功' : '✗ 失敗'}`);
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
      state.players.forEach(p => p.des = Math.max(0, Math.min(100, p.des + val)));
    }

    if (actualEffects.includes('Phase->COMBAT')) {
      // Trigger combat
      const encounter = generateExploreEncounter(state.floor, state);
      state.enemies = encounter.enemies || [];
      state.combat = initCombat(state.players!, state.enemies);
      state.phase = 'COMBAT';
      state.currentEvent = null;
      setState({ ...state });
      requestAINarrative(state, undefined, `事件導致了戰鬥！ ${actualEffects}`);
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
      setScreen('start');
      setInitSubPhase('CLASS_SELECT');
      setPlayerBios([{ race: '', age: '', appearance: '', background: '' }, { race: '', age: '', appearance: '', background: '' }]);
      setBiographyText('');
      setState(null);
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
  // Phase actions are rendered inline per phase

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
                  {p.isControlled && <span className="badge danger">被控制</span>}
                  {p.isBD && <span className="badge danger">BD</span>}

                  <StatBar label="HP" value={p.hp} max={p.maxHp} type="hp" />
                  <StatBar label="SP" value={p.sp} max={p.maxSp} type="sp" />
                  <StatBar label="DES" value={p.des} max={100} type="des" />

                  <div className="mt-1 text-sm text-dim">
                    STR:{p.str} AGI:{p.agi} WIL:{p.wil} DR:{p.drPercent}%
                  </div>
                  <div className="text-sm text-dim">
                    上衣:{p.upperDurability}/100 下衣:{p.lowerDurability}/100
                  </div>
                </div>
              ))}

              {state.inventory.length > 0 && (
                <div className="panel-card">
                  <div className="panel-title">背包</div>
                  {state.inventory.map(item => (
                    <div key={item.id} className="text-sm">{item.name} x{item.quantity}</div>
                  ))}
                </div>
              )}
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
              {state.phase !== 'INIT' && (
                <button className="btn btn-sm" onClick={handleRegenerateNarrative} disabled={isStreaming}>
                  🔄 重新生成對話
                </button>
              )}
              <button className="btn btn-sm btn-danger" onClick={handleRestart}>重新開始</button>
              <button className="btn btn-sm" onClick={() => setShowSettings(true)}>⚙️</button>
            </div>
          </div>

          <div className="narrative-area" ref={scrollRef}>
            {/* INIT: Class selection */}
            {state.phase === 'INIT' && initSubPhase === 'CLASS_SELECT' && (
              <div className="narrative-entry system">
                <p>你踏入地牢入口，空氣混雜著潮濕與古老石塵的味道。</p>
                <p>請為兩名角色選擇職業：</p>
                {[0, 1].map(idx => (
                  <div key={idx} style={{ marginTop: '0.5rem' }}>
                    <div className="text-sm" style={{ marginBottom: '0.3rem' }}>角色 {idx + 1} 名稱：</div>
                    <input
                      className="btn btn-sm" style={{ width: '150px', background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '0.3rem 0.5rem' }}
                      placeholder={`角色${idx + 1}`}
                      value={playerNames[idx]}
                      onChange={e => { const n = [...playerNames] as [string, string]; n[idx] = e.target.value; setPlayerNames(n); }}
                    />
                    <div className="class-grid">
                      {getAllClasses().map(cls => (
                        <div
                          key={cls.id}
                          className={`class-card ${classSelection[idx] === cls.id ? 'selected' : ''}`}
                          onClick={() => { const s = [...classSelection] as [string, string]; s[idx] = cls.id; setClassSelection(s); }}
                        >
                          <h3>{cls.className}</h3>
                          <div className="tags">{cls.roleTags.join(' / ')}</div>
                          <div className="stats">STR:{cls.autoStats.STR} AGI:{cls.autoStats.AGI} WIL:{cls.autoStats.WIL}</div>
                          <div className="stats">HP:{cls.baseHp} SP:{cls.baseSp}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleClassConfirm} disabled={!classSelection[0] || !classSelection[1]}>
                  下一步：設定角色身世
                </button>
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
            {state.log.slice(-50).map((entry, i) => (
              <div key={i} className={`narrative-entry ${entry.type}`}>
                {entry.type === 'narrative' ? <ReactMarkdown>{entry.text}</ReactMarkdown> : entry.text}
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
                        {currentPlayer.skills.filter(s => (!s.currentCooldown || s.currentCooldown === 0) && currentPlayer.sp >= s.spCost).map(s => (
                          <button key={s.id} className="action-btn skill" disabled={isStreaming} onClick={() => {
                            if (s.hitRule.includes('全體') || s.hitRule.includes('自身')) {
                              handleCombatAction({ type: 'skill', skillId: s.id, playerIndex: pIdx });
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
                    const isHealing = skill?.effectSummary.includes('回復') || skill?.effectSummary.includes('治癒') || skill?.effectSummary.includes('護盾');

                    return (
                      <>
                        <div className="text-sm" style={{ width: '100%', marginBottom: '0.3rem', color: 'var(--sp-color)' }}>
                          選擇技能目標：{skill?.name}
                        </div>
                        {isHealing ? (
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
            {state.phase === 'REST' && (
              <div className="action-buttons">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <button key={i} className="action-btn" disabled={isStreaming} onClick={() => handleRestAction(i)}>
                    {['', '原地休息', '探索該層', '下一層', '檢查狀態', '修補裝備', '使用藥水'][i]}
                  </button>
                ))}
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
            {state.phase === 'END' && (
              <div className="action-buttons">
                <button className="btn btn-primary" onClick={() => { deleteSave(); setScreen('start'); setState(null); }}>回到標題</button>
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
              {aliveEnemies.length > 0 && (
                <div className="panel-card">
                  <div className="panel-title">敵人</div>
                  {aliveEnemies.map(e => (
                    <div key={e.instanceId} className="enemy-item">
                      <span className="enemy-name">{e.templateName}</span>
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
    </>
  );
}

// --- Sub-components ---

function StatBar({ label, value, max, type }: { label: string; value: number; max: number; type: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  let cls = type;
  if (type === 'hp') { if (pct < 25) cls += ' low'; else if (pct < 50) cls += ' mid'; }
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
