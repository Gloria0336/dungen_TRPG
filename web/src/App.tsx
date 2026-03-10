import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import type {
  GameState, GameConfig, CombatAction, CombatTurnResult,
  GameLogEntry, ModelInfo,
} from './types';
import { getAllClasses } from './data/classes';
import {
  createNewRun, initializePlayer, saveGame, loadGame,
  hasSave, deleteSave, addLogEntry, createSnapshot,
} from './engine/stateManager';
import {
  initCombat, processPlayerAction, processEnemyAttack,
  chooseEnemyAction, processEndOfRound, isCombatVictory,
  checkHiddenTrigger,
} from './engine/combatEngine';
import { generateExploreEncounter, processRestAction } from './engine/phaseEngine';
import { getCounterEffects } from './engine/counterEngine';
import { generateGoldDrop, rollItemDrop, processGrowth } from './engine/lootEngine';
// shop engine used indirectly via phase transitions
import { formatDiceResult } from './engine/diceEngine';
import { requestNarrative, addNarrativeToHistory } from './ai/narrativeService';
import { RECOMMENDED_MODELS, fetchAvailableModels } from './ai/openrouter';
import './index.css';

const CONFIG_KEY = 'dungen_trpg_config';

function loadConfig(): GameConfig {
  try {
    const d = localStorage.getItem(CONFIG_KEY);
    if (d) return JSON.parse(d);
  } catch { /* noop */ }
  return { apiKey: '', modelId: 'google/gemini-2.5-flash-preview', modelName: 'Gemini 2.5 Flash', nsgEnabled: true };
}
function saveConfig(c: GameConfig) { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); }

export default function App() {
  const [screen, setScreen] = useState<'start' | 'game'>('start');
  const [config, setConfig] = useState<GameConfig>(loadConfig);
  const [state, setState] = useState<GameState | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [narrativeText, setNarrativeText] = useState('');
  const [models, setModels] = useState<ModelInfo[]>(RECOMMENDED_MODELS);
  const [classSelection, setClassSelection] = useState<[string, string]>(['', '']);
  const [playerNames, setPlayerNames] = useState<[string, string]>(['', '']);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [state?.log.length, narrativeText]);
  useEffect(() => { if (config.apiKey) fetchAvailableModels(config.apiKey).then(setModels); }, [config.apiKey]);

  const updateConfig = (patch: Partial<GameConfig>) => {
    const c = { ...config, ...patch };
    setConfig(c); saveConfig(c);
  };

  const log = (type: GameLogEntry['type'], text: string) => {
    if (state) { addLogEntry(state, type, text); setState({ ...state }); }
  };

  const requestAINarrative = useCallback(async (
    gs: GameState, results?: CombatTurnResult[], extra?: string
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
    setIsStreaming(false); setState({ ...gs });
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
        {showSettings && <SettingsModal config={config} models={models} onSave={(c: GameConfig) => { updateConfig(c); setShowSettings(false); }} onClose={() => setShowSettings(false)} />}
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
    state.phase = 'CUSTOM';
    addLogEntry(state, 'system', `角色建立完成: ${p1.name}(${p1.className}) & ${p2.name}(${p2.className})`);
    addLogEntry(state, 'system', `角色1絕對被克制族群: ${p1.absoluteCounter}`);
    addLogEntry(state, 'system', `角色2絕對被克制族群: ${p2.absoluteCounter}`);
    createSnapshot(state);
    setState({ ...state });
    requestAINarrative(state, undefined, '冒險開始！兩名角色剛踏入地牢入口，空氣混雜著潮濕與古老石塵的味道。請描述開場場景。');
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
      addLogEntry(state, 'system', `遭遇敵人！${encounter.enemies.map(e => `${e.templateName}(${e.tier})`).join('、')}`);
      createSnapshot(state);
      setState({ ...state });
      requestAINarrative(state, undefined, `探索途中遭遇了 ${encounter.enemies.map(e => e.templateName).join('和')}！戰鬥即將開始。`);
    } else if (encounter.type === 'event') {
      state.phase = 'EVENT';
      addLogEntry(state, 'system', `觸發事件: ${encounter.event?.templateName ?? '未知事件'}`);
      setState({ ...state });
      requestAINarrative(state, undefined, `探索途中觸發了事件。`);
    }
  };

  const handleCombatAction = (action: CombatAction) => {
    if (!state.combat || !state.players) return;
    const player = state.players[action.playerIndex];
    const result = processPlayerAction(action, player, state.enemies, state);

    result.diceResults.forEach(d => addLogEntry(state, 'dice', formatDiceResult(d)));
    if (result.damageDealt > 0) addLogEntry(state, 'combat', `${result.actorName} 對 ${result.targetName} 造成 ${result.damageDealt} 點傷害`);

    state.combat.pendingResults.push(result);

    // Process enemy turns
    const enemyResults: CombatTurnResult[] = [];
    for (const enemy of state.enemies.filter(e => e.isAlive)) {
      if (enemy.isControlled) {
        addLogEntry(state, 'combat', `${enemy.templateName} 被控制中，跳過行動`);
        continue;
      }
      const { skill, targetPlayerIndex } = chooseEnemyAction(enemy, state.players);
      const target = state.players[targetPlayerIndex];
      const counter = getCounterEffects(enemy, target, state.floor);
      const eResult = processEnemyAttack(enemy, target, skill, counter?.hitMod ?? 0, state.combat.softPenalty, state.nsgEnabled);

      eResult.diceResults.forEach(d => addLogEntry(state, 'dice', formatDiceResult(d)));
      if (eResult.damageDealt > 0) addLogEntry(state, 'combat', `${enemy.templateName} 對 ${eResult.targetName} 造成 ${eResult.damageDealt} 點傷害`);
      if (eResult.controlApplied) addLogEntry(state, 'combat', `${eResult.targetName} 被控制！`);
      if (counter) addLogEntry(state, 'system', `克制效果: ${counter.reason} (${counter.level})`);

      // Hidden trigger check
      const htResult = checkHiddenTrigger(enemy, target);
      if (htResult?.success) {
        addLogEntry(state, 'system', `⚠️ 隱藏觸發！進入 SPECIAL 階段`);
        state.phase = 'SPECIAL';
        state.specialTurn = 1;
        state.specialMaxTurn = 4;
      }

      enemyResults.push(eResult);
      state.combat.pendingResults.push(eResult);
    }

    processEndOfRound(state.players, state.enemies, state.combat);
    state.combat.roundNumber++;

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
        if (state.players.every(p => !p.isAlive)) {
          state.phase = 'END';
          addLogEntry(state, 'system', '💀 兩名角色皆陣亡，冒險結束。');
        }
      }
    }

    createSnapshot(state);
    setState({ ...state });
    requestAINarrative(state, [result, ...enemyResults]);
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
    }
    saveGame(state);
    setState({ ...state });
    requestAINarrative(state, undefined, result.result);
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

  // --- Render Game ---
  const aliveEnemies = state.enemies.filter(e => e.isAlive);
  // Phase actions are rendered inline per phase

  return (
    <>
      <div className="game-screen">
        {/* Left Panel - State */}
        <div className="side-panel">
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

        {/* Center - Narrative & Actions */}
        <div className="center-area">
          <div className="phase-bar">
            <div className="phase-indicator">
              <div className="phase-dot" />
              <span className="phase-name">{state.phase}</span>
            </div>
            <span className="floor-info">第 {state.floor} 層 / {state.maxFloor}</span>
            <button className="btn btn-sm" onClick={() => setShowSettings(true)}>⚙️</button>
          </div>

          <div className="narrative-area" ref={scrollRef}>
            {/* INIT: Class selection */}
            {state.phase === 'INIT' && !state.players && (
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
                  確認並開始冒險
                </button>
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
            {state.phase === 'COMBAT' && state.players && (
              <div className="action-buttons">
                {aliveEnemies.map(e => (
                  <span key={e.instanceId}>
                    {state.players!.filter(p => p.isAlive && !p.isBD && !p.isControlled).map((p, pi) => (
                      <span key={pi}>
                        <button className="action-btn" disabled={isStreaming} onClick={() => handleCombatAction({ type: 'attack', targetId: e.instanceId, playerIndex: state.players!.indexOf(p) })}>
                          {p.name}: 攻擊 {e.templateName}
                        </button>
                        {p.skills.filter(s => (!s.currentCooldown || s.currentCooldown === 0) && p.sp >= s.spCost).map(s => (
                          <button key={s.id} className="action-btn skill" disabled={isStreaming} onClick={() => handleCombatAction({ type: 'skill', skillId: s.id, targetId: e.instanceId, playerIndex: state.players!.indexOf(p) })}>
                            {p.name}: {s.name} (SP:{s.spCost})
                          </button>
                        ))}
                      </span>
                    ))}
                  </span>
                ))}
                <button className="action-btn" disabled={isStreaming} onClick={() => handleCombatAction({ type: 'defend', playerIndex: 0 })}>防禦</button>
              </div>
            )}
            {state.phase === 'REST' && (
              <div className="action-buttons">
                {[1,2,3,4,5,6].map(i => (
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
        <div className="side-panel">
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
      {showSettings && <SettingsModal config={config} models={models} onSave={(c: GameConfig) => { updateConfig(c); if (state) { state.nsgEnabled = c.nsgEnabled; setState({...state}); } setShowSettings(false); }} onClose={() => setShowSettings(false)} />}
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

function SettingsModal({ config, models, onSave, onClose }: {
  config: GameConfig; models: ModelInfo[];
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
              {RECOMMENDED_MODELS.map(m => <option key={m.id} value={m.id}>{m.name} ({Math.round(m.contextLength/1000)}K)</option>)}
            </optgroup>
            {models.length > RECOMMENDED_MODELS.length && (
              <optgroup label="所有模型">
                {models.filter(m => !RECOMMENDED_MODELS.some(r => r.id === m.id)).map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({Math.round(m.contextLength/1000)}K)</option>
                ))}
              </optgroup>
            )}
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
          <button className="btn btn-primary" onClick={() => onSave({ apiKey, modelId, modelName: models.find(m => m.id === modelId)?.name ?? modelId, nsgEnabled: nsg })}>儲存</button>
        </div>
      </div>
    </div>
  );
}
