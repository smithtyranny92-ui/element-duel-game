import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { LEVELS, Level, KNOWLEDGE_MAP, KnowledgeCard } from '../lib/levelData';
import { BattleState, FailureReason, initBattle, playCard, discardCard, executeEnemyTurn, endPlayerTurn, calculateBattleScore } from '../lib/battleEngine';

export interface LevelProgress {
  levelId: number;
  completed: boolean;
  stars: number;
  bestScore: number;
  attempts: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface GameState {
  // 当前关卡
  currentLevelId: number | null;
  // 战斗状态
  battleState: BattleState | null;
  // 关卡进度
  levelProgress: Record<number, LevelProgress>;
  // 已解锁知识卡片
  unlockedKnowledge: string[];
  // 成就
  achievements: Achievement[];
  // 显示知识卡片弹窗
  showKnowledgeCard: KnowledgeCard | null;
  // 显示弃牌堆
  showDiscardPile: boolean;
  // 石蕊揭示状态
  revealActive: boolean;
  // 等待回收选择
  waitingForRecover: boolean;
  // 总XP
  totalXP: number;
  // 最近一次出牌失败原因（保留兼容性）
  lastFailureReason: FailureReason | null;
  // 待显示的教学提示（带时间戳，确保每次失败都能触发弹窗）
  pendingFailureReason: { reason: FailureReason; ts: number } | null;
}

interface GameContextValue extends GameState {
  startLevel: (levelId: number) => void;
  playCardAction: (cardId: string, discardCardId?: string) => void;
  discardCardAction: (cardId: string) => void;
  endTurnAction: () => void;
  restartLevel: () => void;
  exitBattle: () => void;
  dismissKnowledgeCard: () => void;
  toggleDiscardPile: () => void;
  setWaitingForRecover: (v: boolean) => void;
  clearFailureReason: () => void;
  clearPendingFailureReason: () => void;
  // 注册破甲失败回调（保留兼容性，已弃用）
  registerFailureCallback: (cb: ((reason: FailureReason) => void) | null) => void;
  getCurrentLevel: () => Level | null;
  getUnlockedLevels: () => number[];
}

const ACHIEVEMENTS_TEMPLATE: Achievement[] = [
  { id: 'first-win', title: '初次点火', description: '完成第一关', icon: '🔥', unlocked: false },
  { id: 'no-mistake', title: '完美反应', description: '零失误通关任意一关', icon: '⭐', unlocked: false },
  { id: 'speed-clear', title: '速战速决', description: '在一半回合内通关任意一关', icon: '⚡', unlocked: false },
  { id: 'chapter1', title: '元素初识', description: '完成第一章全部关卡', icon: '🧪', unlocked: false },
  { id: 'chapter2', title: '反应大师', description: '完成第二章全部关卡', icon: '⚗️', unlocked: false },
  { id: 'chapter3', title: '金属专家', description: '完成第三章全部关卡', icon: '🔩', unlocked: false },
  { id: 'chapter4', title: '化学博士', description: '完成第四章全部关卡', icon: '🎓', unlocked: false },
  { id: 'all-clear', title: '元素之神', description: '完成全部关卡', icon: '👑', unlocked: false },
  { id: 'knowledge-5', title: '好学者', description: '解锁5张知识卡片', icon: '📚', unlocked: false },
  { id: 'knowledge-all', title: '知识图鉴完成', description: '解锁全部知识卡片', icon: '📖', unlocked: false },
  { id: 'three-stars', title: '三星闪耀', description: '任意一关获得三星', icon: '🌟', unlocked: false },
];

const SAVE_KEY = 'element-duel-save';

function loadSave(): Partial<GameState> {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveToDisk(state: GameState) {
  try {
    const toSave = {
      levelProgress: state.levelProgress,
      unlockedKnowledge: state.unlockedKnowledge,
      achievements: state.achievements,
      totalXP: state.totalXP,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
  } catch {}
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const saved = loadSave();

  const [state, setState] = useState<GameState>({
    currentLevelId: null,
    battleState: null,
    levelProgress: saved.levelProgress ?? {},
    unlockedKnowledge: saved.unlockedKnowledge ?? [],
    achievements: saved.achievements ?? ACHIEVEMENTS_TEMPLATE,
    showKnowledgeCard: null,
    showDiscardPile: false,
    revealActive: false,
    waitingForRecover: false,
    totalXP: saved.totalXP ?? 0,
    lastFailureReason: null,
    pendingFailureReason: null,
  });

  // 用 ref 存储最新 state，供 playCardAction 直接读取（避免 stale closure）
  const stateRef = useRef(state);
  // 同步更新 stateRef（在渲染期间，不是 useEffect）
  stateRef.current = state;

  // 破甲失败回调 ref —— BattleScreen 注册，playCardAction 直接调用
  // 使用 ref 而非 state，避免 React 批量更新导致的时序问题
  const failureCallbackRef = useRef<((reason: FailureReason) => void) | null>(null);

  const registerFailureCallback = useCallback((cb: ((reason: FailureReason) => void) | null) => {
    failureCallbackRef.current = cb;
  }, []);

  // 自动存档
  useEffect(() => {
    saveToDisk(state);
  }, [state.levelProgress, state.unlockedKnowledge, state.achievements, state.totalXP]);

  const getCurrentLevel = useCallback((): Level | null => {
    if (state.currentLevelId === null) return null;
    return LEVELS.find(l => l.id === state.currentLevelId) ?? null;
  }, [state.currentLevelId]);

  const getUnlockedLevels = useCallback((): number[] => {
    const unlocked = [1];
    LEVELS.forEach(level => {
      const prog = state.levelProgress[level.id];
      if (prog?.completed) {
        const next = level.id + 1;
        if (next <= LEVELS.length) unlocked.push(next);
      }
    });
    return unlocked;
  }, [state.levelProgress]);

  const startLevel = useCallback((levelId: number) => {
    const level = LEVELS.find(l => l.id === levelId);
    if (!level) return;
    const battleState = initBattle(level);
    setState(prev => ({
      ...prev,
      currentLevelId: levelId,
      battleState,
      showKnowledgeCard: null,
      showDiscardPile: false,
      revealActive: false,
      waitingForRecover: false,
    }));
  }, []);

  const checkAchievements = useCallback((newState: GameState, justCompletedLevel: Level, stars: number, mistakes: number, roundsUsed: number) => {
    const updated = [...newState.achievements];
    const unlock = (id: string) => {
      const idx = updated.findIndex(a => a.id === id);
      if (idx >= 0 && !updated[idx].unlocked) {
        updated[idx] = { ...updated[idx], unlocked: true, unlockedAt: new Date().toISOString() };
      }
    };

    // 首次通关
    const totalCompleted = Object.values(newState.levelProgress).filter(p => p.completed).length;
    if (totalCompleted >= 1) unlock('first-win');

    // 零失误
    if (mistakes === 0) unlock('no-mistake');

    // 速战速决
    if (roundsUsed <= Math.floor(justCompletedLevel.maxRounds / 2)) unlock('speed-clear');

    // 三星
    if (stars === 3) unlock('three-stars');

    // 章节完成
    const ch1 = LEVELS.filter(l => l.chapter === 1).every(l => newState.levelProgress[l.id]?.completed);
    const ch2 = LEVELS.filter(l => l.chapter === 2).every(l => newState.levelProgress[l.id]?.completed);
    const ch3 = LEVELS.filter(l => l.chapter === 3).every(l => newState.levelProgress[l.id]?.completed);
    const ch4 = LEVELS.filter(l => l.chapter === 4).every(l => newState.levelProgress[l.id]?.completed);
    if (ch1) unlock('chapter1');
    if (ch2) unlock('chapter2');
    if (ch3) unlock('chapter3');
    if (ch4) unlock('chapter4');
    if (ch1 && ch2 && ch3 && ch4) unlock('all-clear');

    // 知识卡片
    if (newState.unlockedKnowledge.length >= 5) unlock('knowledge-5');
    const totalKnowledge = Object.keys(KNOWLEDGE_MAP).length;
    if (newState.unlockedKnowledge.length >= totalKnowledge) unlock('knowledge-all');

    return updated;
  }, []);

  // ── playCardAction：直接使用 stateRef.current 读取最新 state，避免 setState updater 副作用问题 ──
  const playCardAction = useCallback((cardId: string, discardCardId?: string) => {
    const prev = stateRef.current;
    
    if (!prev.battleState || !prev.currentLevelId) return;
    const level = LEVELS.find(l => l.id === prev.currentLevelId);
    if (!level) return;

    const result = playCard(cardId, level, prev.battleState, discardCardId);
    let newBattleState = result.newState;
    

    // 如果是石蕊揭示技能
    const revealActive = result.skillActivated === 'reveal';

    // 催化剂：不结束回合，给额外行动
    if (result.extraTurn) {
      setState({
        ...prev,
        battleState: { ...newBattleState, catalyzed: false },
        revealActive: prev.revealActive || revealActive,
        waitingForRecover: false,
      });
      return;
    }

    // 如果是回收技能，等待玩家选择弃牌堆中的牌
    if (result.skillActivated === 'recover' && !discardCardId) {
      setState({
        ...prev,
        battleState: newBattleState,
        waitingForRecover: true,
        showDiscardPile: true,
      });
      return;
    }

    // 检查胜利
    if (newBattleState.phase === 'victory') {
      const { stars, score } = calculateBattleScore(newBattleState, level);
      const prevProgress = prev.levelProgress[level.id];
      const newProgress: LevelProgress = {
        levelId: level.id,
        completed: true,
        stars: Math.max(stars, prevProgress?.stars ?? 0),
        bestScore: Math.max(score, prevProgress?.bestScore ?? 0),
        attempts: (prevProgress?.attempts ?? 0) + 1,
      };

      // 解锁知识卡片
      const newUnlocked = prev.unlockedKnowledge.includes(level.knowledgeCardId)
        ? prev.unlockedKnowledge
        : [...prev.unlockedKnowledge, level.knowledgeCardId];

      const newLevelProgress = { ...prev.levelProgress, [level.id]: newProgress };
      const newXP = prev.totalXP + score;

      const tempState: GameState = {
        ...prev,
        levelProgress: newLevelProgress,
        unlockedKnowledge: newUnlocked,
        totalXP: newXP,
        battleState: newBattleState,
      };

      const updatedAchievements = checkAchievements(
        tempState, level, stars,
        newBattleState.totalMistakes,
        newBattleState.currentRound
      );

      const knowledgeCard = KNOWLEDGE_MAP[level.knowledgeCardId] ?? null;

      setState({
        ...tempState,
        achievements: updatedAchievements,
        showKnowledgeCard: knowledgeCard,
      });
      return;
    }

    // 如果是失败（出牌直接导致玩家HP为0）
    if (newBattleState.phase === 'defeat') {
      const prevProgress = prev.levelProgress[level.id];
      const newProgress: LevelProgress = {
        levelId: level.id,
        completed: prevProgress?.completed ?? false,
        stars: prevProgress?.stars ?? 0,
        bestScore: prevProgress?.bestScore ?? 0,
        attempts: (prevProgress?.attempts ?? 0) + 1,
      };
      setState({
        ...prev,
        battleState: newBattleState,
        levelProgress: { ...prev.levelProgress, [level.id]: newProgress },
        revealActive: prev.revealActive || revealActive,
      });
      return;
    }

    // 出牌失败（破甲失败）：捕获失败原因，将通过 pendingFailureReason state 触发弹窗
    const failureReason: FailureReason | null = result.failureReason ?? null;

    // 固定发牌制：出牌后继续玩家回合，不自动触发敵人回合
    // 玩家需要主动点击「结束回合」按钮来触发敵人回合
    setState({
      ...prev,
      battleState: { ...newBattleState, catalyzed: false },
      revealActive: prev.revealActive || revealActive,
      waitingForRecover: false,
      pendingFailureReason: failureReason ? { reason: failureReason, ts: Date.now() } : prev.pendingFailureReason,
    });
  }, [checkAchievements]);

  const discardCardAction = useCallback((cardId: string) => {
    setState(prev => {
      if (!prev.battleState || !prev.currentLevelId) return prev;
      const level = LEVELS.find(l => l.id === prev.currentLevelId);
      if (!level) return prev;

      const { newState } = discardCard(cardId, prev.battleState);

      // 固定发牌制：弃牌后继续玩家回合，不自动触发敵人回合
      return { ...prev, battleState: newState };
    });
  }, []);

  const endTurnAction = useCallback(() => {
    setState(prev => {
      if (!prev.battleState || !prev.currentLevelId) return prev;
      const level = LEVELS.find(l => l.id === prev.currentLevelId);
      if (!level) return prev;

      const enemyResult = executeEnemyTurn(level, prev.battleState);
      let afterEnemy = enemyResult.newState;

      if (afterEnemy.phase !== 'defeat') {
        afterEnemy = endPlayerTurn(level, afterEnemy);
      }

      return { ...prev, battleState: afterEnemy };
    });
  }, []);

  const restartLevel = useCallback(() => {
    setState(prev => {
      if (!prev.currentLevelId) return prev;
      const level = LEVELS.find(l => l.id === prev.currentLevelId);
      if (!level) return prev;
      return {
        ...prev,
        battleState: initBattle(level),
        showKnowledgeCard: null,
        showDiscardPile: false,
        revealActive: false,
        waitingForRecover: false,
      };
    });
  }, []);

  const exitBattle = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentLevelId: null,
      battleState: null,
      showKnowledgeCard: null,
      showDiscardPile: false,
      revealActive: false,
      waitingForRecover: false,
    }));
  }, []);

  const dismissKnowledgeCard = useCallback(() => {
    setState(prev => ({ ...prev, showKnowledgeCard: null }));
  }, []);

  const toggleDiscardPile = useCallback(() => {
    setState(prev => ({ ...prev, showDiscardPile: !prev.showDiscardPile }));
  }, []);

  const setWaitingForRecover = useCallback((v: boolean) => {
    setState(prev => ({ ...prev, waitingForRecover: v }));
  }, []);

  const clearFailureReason = useCallback(() => {
    setState(prev => ({ ...prev, lastFailureReason: null }));
  }, []);

  const clearPendingFailureReason = useCallback(() => {
    setState(prev => ({ ...prev, pendingFailureReason: null }));
  }, []);

  const value: GameContextValue = {
    ...state,
    startLevel,
    playCardAction,
    discardCardAction,
    endTurnAction,
    restartLevel,
    exitBattle,
    dismissKnowledgeCard,
    toggleDiscardPile,
    setWaitingForRecover,
    clearFailureReason,
    clearPendingFailureReason,
    registerFailureCallback,
    getCurrentLevel,
    getUnlockedLevels,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
