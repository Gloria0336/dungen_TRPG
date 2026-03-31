# 角色選擇大修計畫：固定主角 + 可選配角系統

## Context
將原本「雙角色自選職業」改為「1名固定主角 + 1名可選配角」，
收束世界觀（帝國教會聖女候選人奉命清掃地牢），
並引入主角獨立成長系統（能力點分配、武器技能槽、身體技能槽）。

---

## 主角設計

### 身份
帝國教會聖女候選人，受命前往地牢清除魔物，可攜帶一名同伴同行。

### 初始數值（白板）
| 屬性 | 初始值 |
|------|--------|
| STR  | 0      |
| AGI  | 0      |
| WIL  | 0      |
| HP   | 60     |
| SP   | 80     |

### 技能槽結構（共4槽）
- **武器技能槽 1-2**：由裝備的武器決定，換武器時自動更新
- **身體技能槽 1-2**：透過戰利品獲得，可替換或升級

### 能力點系統
- 每層通關後獲得：`3 + Math.floor(floor/10)` 點（層1-9: 3點, 層10-19: 4點）
- 可分配目標：STR+1(1pt), AGI+1(1pt), WIL+1(1pt), MaxHP+8(1pt), MaxSP+10(1pt)
- 分配完畢後才可進行正常 REST 行動

---

## 武器系統（weapons.ts）

Tier-to-floor 對應：`Math.min(5, Math.ceil(floor/4))`

| Tier | Floor | 武器列表 |
|------|-------|---------|
| 1 | 1-4   | 鐵劍(atk10), 見習法杖(atk4/amp8%), 木弓(atk9/amp5%), 匕首(atk8/flatDr3) |
| 2 | 5-8   | 精鋼巨劍(18), 水晶魔杖(6/amp15%), 鋼鞭(14/amp10%), 圓盾劍(12/flatDr8) |
| 3 | 9-12  | 符文劍(22/amp8%), 大法師權杖(8/amp22%), 鬼哭刀(26), 聖光槍(24/amp5%) |
| 4 | 13-16 | 滅世巨劍(35/amp5%), 奧秘法杖(10/amp30%), 雙影刃(28/amp12%), 聖十字矛(30/flatDr5) |
| 5 | 17-20 | 弒神刃(50), 虛空法典(5/amp45%), 混沌雙刃(42/amp18%), 天罰聖劍(44/amp10%) |

每把武器攜帶 2 個武器技能，裝備後填入武器技能槽。

---

## 身體技能系統（skills.ts）

共 14 個技能，升級上限各有不同（3 或 5 級）。

### 被動技能（5個）
| ID | 名稱 | 效果概述 | 最大等級 |
|----|------|---------|---------|
| BSK-IRON-BODY | 鐵壁身軀 | DR% 提升 | 5 |
| BSK-SWIFT-STEP | 疾風步 | 閃避率提升 | 3 |
| BSK-MANA-FLOW | 魔力流通 | 每回合 SP 回復 | 3 |
| BSK-BATTLE-FURY | 戰鬥狂熱 | HP<50% 時增傷 | 3 |
| BSK-PAIN-RESIST | 苦痛抵抗 | MaxHP 提升 | 3 |

### 主動-自身（3個）
| ID | 名稱 | 效果概述 | 最大等級 |
|----|------|---------|---------|
| BSK-SECOND-WIND | 第二口氣 | 回復 HP | 3 |
| BSK-FOCUS | 集中意志 | 下次技能強化 | 3 |
| BSK-EVASIVE | 殘影步 | 本回合高閃避 | 3 |

### 主動-敵方（5個）
| ID | 名稱 | 效果概述 | 最大等級 |
|----|------|---------|---------|
| BSK-BREAK | 破甲衝擊 | 低傷+降 DR | 3 |
| BSK-STUN | 震懾打擊 | 傷害+控制 | 3 |
| BSK-DRAIN | 生命吸取 | 傷害回血 | 3 |
| BSK-PIERCE | 貫穿刺擊 | 忽略 DR | 5 |
| BSK-AREA | 旋風斬 | 全體攻擊 | 3 |

### 主動-隊友（1個）
| ID | 名稱 | 效果概述 | 最大等級 |
|----|------|---------|---------|
| BSK-HEAL-TOUCH | 治癒之觸 | 治療隊友 | 3 |

### 技能獲取流程
1. 戰鬥勝利後有機率掉落身體技能
2. **技能槽有空**：自動填入
3. **技能槽全滿**，顯示選項：
   - A/B. 替換槽1或槽2（棄置舊技能）
   - C/D. 升級槽1或槽2（未達上限時可選，捨棄新技能）
   - E. 放棄新技能

---

## 配角系統
玩家從 7 個職業選擇（過濾 教團聖女 `CL-PRST` 與主角職業）：

| ID | 職業名 | 特色 |
|----|--------|------|
| CL-KNGT | 王國騎士 | 坦克/近戰/防禦 |
| CL-MAGE | 法師 | 爆發/遠程/魔法 |
| CL-FIGHT | 自由鬥士 | 平衡/物理/靈巧 |
| CL-ASSN | 刺客 | 爆發/隱蔽/物理 |
| CL-MSWD | 魔法劍士 | 混傷/全面 |
| CL-DIVA | 歌姬 | 輔助/治癒/強化 |
| CL-PIRT | 海盜 | 掠奪/物理 |

配角維持原有職業成長系統（自動成長 + 職業技能解鎖）。

---

## 檔案修改清單

| 檔案 | 類型 | 變更 |
|------|------|------|
| `web/src/types.ts` | 修改 | 新增 WeaponDef, BodySkillDef 等介面；擴展 PlayerState, GameState |
| `web/src/data/weapons.ts` | **新增** | WEAPON_DB (20把武器, Tier1-5) |
| `web/src/data/skills.ts` | **新增** | BODY_SKILL_DB (14個身體技能) |
| `web/src/data/classes.ts` | 修改 | 新增 PROTAGONIST 條目；新增 getAllCompanionClasses() |
| `web/src/engine/stateManager.ts` | 修改 | initializeProtagonist(), synthesizeProtagonistSkills() |
| `web/src/engine/combatEngine.ts` | 修改 | calculateATK/DR 主角分支、被動技能加成 |
| `web/src/engine/lootEngine.ts` | 修改 | processGrowth 跳過主角、rollBodySkillDrop() |
| `web/src/App.tsx` | 修改 | 角色選擇重構、能力點 UI、技能決策 UI、技能面板 |

---

## 角色選擇流程

```
PROTAGONIST_SETUP  → 顯示主角固定身份卡 + 名字輸入 → 下一步
COMPANION_SELECT   → 選擇配角職業 + 名字輸入 → 下一步
BIO_INPUT          → 雙角色外貌/背景輸入
BIO_GENERATE       → AI 生成傳記
BIO_CONFIRM        → 確認進入遊戲
```

---

## 驗證檢查清單

- [ ] 新遊戲啟動 → 顯示 PROTAGONIST_SETUP
- [ ] COMPANION_SELECT 顯示 7 個職業，無教團聖女
- [ ] 主角初始：STR/AGI/WIL=0，只有普攻+防禦
- [ ] 初始武器（鐵劍）武器技能正常顯示
- [ ] 戰鬥後主角武器技能可使用
- [ ] 通關後顯示能力點分配介面
- [ ] 分配完才可進行 REST 行動
- [ ] 身體技能掉落 → 決策介面正常運作（替換/升級/放棄）
- [ ] 配角職業技能/成長維持正常
- [ ] 舊存檔載入不崩潰
