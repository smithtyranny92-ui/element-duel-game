/**
 * BattleScreen.tsx — 杀戮尖塔风格战斗界面（全面重构版）
 * 设计哲学：炼金术士实验室 × 赛博朋克
 * 布局：顶部状态栏 | 左侧护甲/玩家 | 中央战场 | 右侧预告 | 底部手牌
 *
 * 本次重构重点：
 * 1. 顶部状态栏：牌库/弃牌堆视觉化（卡牌叠加图标）、回合进度更醒目
 * 2. 左侧护甲：护甲序列改为竖向时间轴、化学方程式实时显示
 * 3. 中央战场：战斗日志优化（方程式高亮展示）
 * 4. 底部手牌：操作引导更清晰、手牌状态指示
 */

import { AnimatePresence, motion } from 'framer-motion';

// Boss 图片路径（本地 public/bosses 目录，AI 重绘版）
const getBossImageUrl = (levelId: number): string => `/bosses/boss_${levelId}.webp`;
import { useRef, useState, useCallback, useEffect } from 'react';
import { ARMOR_TYPES, CARD_MAP } from '@/lib/cardData';
import { useGame } from '@/contexts/GameContext';
import { KNOWLEDGE_MAP } from '@/lib/levelData';
import type { ArmorLayer, EnemyAction } from '@/lib/levelData';
import type { FailureReason } from '@/lib/battleEngine';
import ElementCardComponent from './ElementCard';
import KnowledgeCardModal from './KnowledgeCardModal';
import DiscardPileModal from './DiscardPileModal';
import DrawPileModal from './DrawPileModal';
import BattleResultModal from './BattleResultModal';
import FailureHintModal from './FailureHintModal';

// ───────────────────────────────────────────────────────────────
// 回合过场动画组件
// ───────────────────────────────────────────────────────────────
interface TurnCutsceneProps {
  currentRound: number;
  enemyAction: { label: string; icon: string; type: string; value: number } | null;
  nextArmorLabel: string | null;
  onDone: () => void;
}

function TurnCutscene({ currentRound, enemyAction, nextArmorLabel, onDone }: TurnCutsceneProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1800);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="flex flex-col items-center gap-6 px-12 py-10 rounded-2xl border border-slate-600/60 bg-slate-900/95 shadow-2xl"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.7, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      >
        {/* 回合数 */}
        <div className="text-center">
          <motion.div
            className="text-5xl font-black tracking-widest text-cyan-400"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            回合 {currentRound}
          </motion.div>
          <div className="mt-1 text-sm text-slate-400">──────────────────────────────</div>
        </div>

        {/* 敌人行动预告 */}
        {enemyAction && (
          <motion.div
            className="flex flex-col items-center gap-2"
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <div className="text-xs text-slate-500 uppercase tracking-widest">敌人行动</div>
            <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border ${
              enemyAction.type === 'attack' ? 'border-red-500/40 bg-red-900/20 text-red-300' :
              enemyAction.type === 'shield' ? 'border-blue-500/40 bg-blue-900/20 text-blue-300' :
              enemyAction.type === 'strengthen' ? 'border-yellow-500/40 bg-yellow-900/20 text-yellow-300' :
              enemyAction.type === 'corrode' ? 'border-purple-500/40 bg-purple-900/20 text-purple-300' :
              'border-green-500/40 bg-green-900/20 text-green-300'
            }`}>
              <span className="text-2xl">{enemyAction.icon}</span>
              <div>
                <div className="font-semibold text-sm">{enemyAction.label}</div>
                {enemyAction.type === 'attack' && (
                  <div className="text-xs opacity-70">伤害 {enemyAction.value}</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* 下一个护甲预告 */}
        {nextArmorLabel && (
          <motion.div
            className="flex flex-col items-center gap-2"
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="text-xs text-slate-500 uppercase tracking-widest">下一护甲</div>
            <div className="px-5 py-2 rounded-xl border border-cyan-500/40 bg-cyan-900/20 text-cyan-300 font-semibold text-sm">
              {nextArmorLabel}
            </div>
          </motion.div>
        )}

        {/* 进入下一回合提示 */}
        <motion.div
          className="text-xs text-slate-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ delay: 0.8, duration: 0.8, repeat: Infinity }}
        >
          准备下一回合...
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default function BattleScreen() {
  const {
    battleState,
    playCardAction,
    discardCardAction,
    endTurnAction,
    exitBattle,
    restartLevel,
    startLevel,
    showKnowledgeCard,
    dismissKnowledgeCard,
    getCurrentLevel,
    revealActive,
    pendingFailureReason,
    clearPendingFailureReason,
  } = useGame();
  const level = getCurrentLevel();

  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  // 从索引派生出cardId，避免同类型牌都被标记为选中
  const selectedCard = selectedCardIdx !== null && battleState ? (battleState.hand[selectedCardIdx] ?? null) : null;
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  // 拖拽出牌状态
  const [draggingCardIdx, setDraggingCardIdx] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dragOverBoss, setDragOverBoss] = useState(false);
  // 已出牌的卡牌索引（用于立即隐藏，避免回弹）
  const [playedCardIdx, setPlayedCardIdx] = useState<number | null>(null);
  // 记录正在出牌的卡牌 ID，用于在 AnimatePresence 中保持占位
  const [playingCardIds, setPlayingCardIds] = useState<Set<string>>(new Set());
  // Boss 意图悬停状态
  const [showIntentTooltip, setShowIntentTooltip] = useState(false);
  // Boss 介绍悬停状态
  const [showBossTooltip, setShowBossTooltip] = useState(false);
  const battlefieldRef = useRef<HTMLDivElement>(null);
  const bossImageRef = useRef<HTMLDivElement>(null);
  const intentIconRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  // 飞牌动画状态
  const [flyingCard, setFlyingCard] = useState<{
    id: number; cardId: string;
    fromX: number; fromY: number;
    toX: number; toY: number;
  } | null>(null);
  const flyIdRef = useRef(0);
  const enemyRef = useRef<HTMLDivElement>(null);
  // 命中特效状态
  const [impactEffect, setImpactEffect] = useState<{ id: number; x: number; y: number; color: string } | null>(null);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; angle: number; color: string }>>([]);
  const [showDiscardPile, setShowDiscardPile] = useState(false);
  const [showDrawPile, setShowDrawPile] = useState(false);
  const [waitingForRecover, setWaitingForRecover] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<Array<{
    id: number; text: string; x: number; y: number; color: string;
  }>>([])
  const [shakeEnemy, setShakeEnemy] = useState(false);
  const [shakePlayer, setShakePlayer] = useState(false);
  const [hitFlash, setHitFlash] = useState<'damage' | 'success' | null>(null);  // 受击闪光类型
  const [showBattleLog, setShowBattleLog] = useState(false);  // 战斗日志折叠状态
  const [showOpeningHint, setShowOpeningHint] = useState(true);  // 开局提示是否显示
  const [showArmorHint, setShowArmorHint] = useState(true);       // 护甲提示是否显示
  const [showBossTraitHint, setShowBossTraitHint] = useState(true); // Boss特性提示是否显示
  const [hiddenIndicators, setHiddenIndicators] = useState<Set<string>>(new Set()); // 已关闭的状态指示器
  const [lastEquation, setLastEquation] = useState<string | null>(null);
  const [showEquation, setShowEquation] = useState(false);
  const [failureReason, setFailureReason] = useState<FailureReason | null>(null);
  // 元素手册：手动触发显示知识卡
  const [manualKnowledgeCard, setManualKnowledgeCard] = useState<import('@/lib/levelData').KnowledgeCard | null>(null);
  // 元素图鉴弹窗状态
  const [showElementCompendium, setShowElementCompendium] = useState(false);
  const [compendiumSelectedCard, setCompendiumSelectedCard] = useState<import('@/lib/levelData').KnowledgeCard | null>(null);
  // 回合过场动画状态
  const [showTurnCutscene, setShowTurnCutscene] = useState(false);
  const [cutsceneRound, setCutsceneRound] = useState(1);
  const [cutsceneEnemyAction, setCutsceneEnemyAction] = useState<{ label: string; icon: string; type: string; value: number } | null>(null);
  const [cutsceneNextArmor, setCutsceneNextArmor] = useState<string | null>(null);
  // 记录上一次回合数，用于检测回合切换
  const prevRoundRef = useRef<number>(1);
  const prevArmorIndexRef = useRef<number>(0);
  const prevEnemyHPRef = useRef<number>(-1);
  const logRef = useRef<HTMLDivElement>(null);
  const floatIdRef = useRef(0);

  // 无手牌自动结束回合
  useEffect(() => {
    if (!battleState || battleState.phase !== 'player' || battleState.hand.length > 0) return;
    // 手牌为空且在玩家回合，延迟 600ms 自动结束回合（给玩家视觉反馈时间）
    const timer = setTimeout(() => {
      endTurnAction();
    }, 600);
    return () => clearTimeout(timer);
  }, [battleState?.hand.length, battleState?.phase, endTurnAction]);

  // 监听 pendingFailureReason state：当破甲失败时，显示教学提示弹窗
  useEffect(() => {
    if (pendingFailureReason) {
      setFailureReason(pendingFailureReason.reason);
      clearPendingFailureReason();
    }
  }, [pendingFailureReason, clearPendingFailureReason]);

  // 监听护甲索引变化：破甲成功时触发绿闪 + 浮动文字
  useEffect(() => {
    if (!battleState) return;
    const newArmorIdx = battleState.currentArmorIndex;
    if (newArmorIdx > prevArmorIndexRef.current) {
      // 破甲成功！
      setHitFlash('success');
      setTimeout(() => setHitFlash(null), 600);
      addFloatingText('破甲！', 50, 30, '#22c55e');
    }
    prevArmorIndexRef.current = newArmorIdx;
  }, [battleState?.currentArmorIndex]);

  // 监听敌人 HP 变化：显示伤害数字
  useEffect(() => {
    if (!battleState) return;
    const newHP = battleState.enemyHP;
    if (prevEnemyHPRef.current >= 0 && newHP < prevEnemyHPRef.current) {
      const dmg = prevEnemyHPRef.current - newHP;
      addFloatingText(`-${dmg}`, 50, 25, '#f87171');
    }
    prevEnemyHPRef.current = newHP;
  }, [battleState?.enemyHP]);

  // 监听回合切换：当 currentRound 增加时显示过场动画
  useEffect(() => {
    if (!battleState || !level) return;
    const newRound = battleState.currentRound;
    if (newRound > prevRoundRef.current && battleState.phase === 'player') {
      // 准备过场信息
      const actionIdx = (newRound - 2) % level.enemyActions.length; // 上一回合敌人行动
      const action = level.enemyActions[actionIdx] ?? null;
      const nextArmorIdx = battleState.currentArmorIndex;
      const nextArmor = level.armorSequence[nextArmorIdx] ?? null;
      setCutsceneRound(newRound);
      setCutsceneEnemyAction(action ? { label: action.label, icon: action.icon, type: action.type, value: action.value } : null);
      setCutsceneNextArmor(nextArmor?.label ?? null);
      setShowTurnCutscene(true);
    }
    prevRoundRef.current = newRound;
  }, [battleState?.currentRound, battleState?.phase, level]);

  const handleCutsceneDone = useCallback(() => {
    setShowTurnCutscene(false);
  }, []);

  const handleCloseFailureHint = useCallback(() => {
    setFailureReason(null);
  }, []);

  if (!level || !battleState) return null;

  const currentArmor = level.armorSequence[battleState.currentArmorIndex] ?? null;
  const currentArmorId = currentArmor?.armorId ?? null;
  const armorInfo = currentArmorId ? ARMOR_TYPES[currentArmorId] : null;
  const isGameOver = battleState.phase === 'victory' || battleState.phase === 'defeat';
  const roundPercent = Math.min(100, ((battleState.currentRound - 1) / level.maxRounds) * 100);
  const playerHPPercent = (battleState.playerHP / battleState.playerMaxHP) * 100;
  const enemyHPPercent = (battleState.enemyHP / battleState.enemyMaxHP) * 100;

  // 敌人行动预告（从当前回合开始，最多显示5个）
  const enemyActions = level.enemyActions.slice(
    (battleState.currentRound - 1) % level.enemyActions.length,
    (battleState.currentRound - 1) % level.enemyActions.length + 5
  ).concat(
    level.enemyActions.slice(0, Math.max(0, 5 - (level.enemyActions.length - (battleState.currentRound - 1) % level.enemyActions.length)))
  ).slice(0, 5);

  // 石蕊揭示
  const armorForecast = level.armorSequence.slice(battleState.currentArmorIndex);

  const addFloatingText = (text: string, x: number, y: number, color: string) => {
    const id = floatIdRef.current++;
    setFloatingTexts(prev => [...prev, { id, text, x, y, color }]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(f => f.id !== id)), 1500);
  };

  const toggleDiscardPile = () => setShowDiscardPile(prev => !prev);

  // 飞牌动画函数：从手牌位置飞向敌人
  const triggerPlayAnimation = (cardId: string, cardEl: HTMLElement | null) => {
    const card = CARD_MAP[cardId];
    const glowColor = card?.glowColor ?? '#60a5fa';

    // 计算起始位置（手牌卡牌中心）
    let fromX = window.innerWidth / 2;
    let fromY = window.innerHeight - 120;
    if (cardEl) {
      const rect = cardEl.getBoundingClientRect();
      fromX = rect.left + rect.width / 2;
      fromY = rect.top + rect.height / 2;
    }

    // 计算目标位置（敌人区域中心）
    let toX = window.innerWidth * 0.72;
    let toY = window.innerHeight * 0.38;
    if (enemyRef.current) {
      const rect = enemyRef.current.getBoundingClientRect();
      toX = rect.left + rect.width / 2;
      toY = rect.top + rect.height / 2;
    }

    const id = flyIdRef.current++;
    setFlyingCard({ id, cardId, fromX, fromY, toX, toY });

    // 飞行时间后触发命中特效
    setTimeout(() => {
      setFlyingCard(null);
      // 冲击波
      setImpactEffect({ id, x: toX, y: toY, color: glowColor });
      setTimeout(() => setImpactEffect(null), 600);
      // 粒子爆炸
      const newParticles = Array.from({ length: 10 }, (_, i) => ({
        id: id * 100 + i,
        x: toX, y: toY,
        angle: (i / 10) * 360,
        color: glowColor,
      }));
      setParticles(prev => [...prev, ...newParticles]);
      setTimeout(() => setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id))), 700);
      // 震动 + 闪光
      setShakeEnemy(true);
      setHitFlash('damage');
      setTimeout(() => { setShakeEnemy(false); setHitFlash(null); }, 500);
    }, 380);
  };

  const handleCardClick = (cardId: string, idx: number) => {
    if (isGameOver || battleState.phase !== 'player') return;
    if (waitingForRecover) return;
    // 如果正在拖拽中，点击不触发
    if (draggingCardIdx !== null) return;
    // 直接出牌，不再需要选中状态
    const card = CARD_MAP[cardId];
    if (card?.reactionEquation) {
      setLastEquation(card.reactionEquation);
      setShowEquation(true);
      setTimeout(() => setShowEquation(false), 3000);
    }
    if (card?.skill === 'recover') {
      setWaitingForRecover(true);
      setShowDiscardPile(true);
    }
    const cardEl = cardRefs.current.get(idx);
    setPlayingCardIds(prev => new Set(prev).add(cardId));
    triggerPlayAnimation(cardId, cardEl ?? null);
    playCardAction(cardId);
    setSelectedCardIdx(null);
    setTimeout(() => {
      setPlayingCardIds(prev => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    }, 600);
  };

  // 拖拽开始
  const handleDragStart = (idx: number) => {
    if (isGameOver || battleState.phase !== 'player' || waitingForRecover) return;
    setDraggingCardIdx(idx);
    setSelectedCardIdx(null);
  };

  // 拖拽移动（跟踪鼠标位置）
  const handleDragMove = (_e: MouseEvent | TouchEvent | PointerEvent, info: { point: { x: number; y: number } }) => {
    setDragPos({ x: info.point.x, y: info.point.y });
    // 检测是否拖到了战场区域
    if (battlefieldRef.current) {
      const rect = battlefieldRef.current.getBoundingClientRect();
      const isOver = info.point.x >= rect.left && info.point.x <= rect.right &&
                     info.point.y >= rect.top && info.point.y <= rect.bottom;
      setDragOverBoss(isOver);
    }
  };

  // 拖拽结束：只要松手位置不在手牌区（底部 210px）就触发出牌
  const handleDragEnd = (idx: number, cardId: string) => {
    if (draggingCardIdx === null) return;
    // 判断松手位置是否在手牌区内（底部 210px 高度区域）
    const isInHandZone = dragPos !== null && dragPos.y > window.innerHeight - 220;
    if (!isInHandZone && dragPos !== null) {
      // 离开手牌区，触发出牌
      setPlayedCardIdx(idx);
      setPlayingCardIds(prev => new Set(prev).add(cardId));
      const card = CARD_MAP[cardId];
      if (card?.reactionEquation) {
        setLastEquation(card.reactionEquation);
        setShowEquation(true);
        setTimeout(() => setShowEquation(false), 3000);
      }
      if (card?.skill === 'recover') {
        setWaitingForRecover(true);
        setShowDiscardPile(true);
      }
      // 飞牌动画
      const cardEl = cardRefs.current.get(idx);
      triggerPlayAnimation(cardId, cardEl ?? null);
      playCardAction(cardId);
      setTimeout(() => {
        setPlayedCardIdx(null);
        setPlayingCardIds(prev => {
          const next = new Set(prev);
          next.delete(cardId);
          return next;
        });
      }, 600);
    }
    setDraggingCardIdx(null);
    setDragPos(null);
    setDragOverBoss(false);
  };

  const handlePlaySelected = () => {
    if (!selectedCard || selectedCardIdx === null) return;
    const cardId = selectedCard;
    const card = CARD_MAP[cardId];
    // 显示化学方程式
    if (card?.reactionEquation) {
      setLastEquation(card.reactionEquation);
      setShowEquation(true);
      setTimeout(() => setShowEquation(false), 3000);
    }
    // 触发视觉反馈
    if (card?.skill === 'recover') {
      setWaitingForRecover(true);
      setShowDiscardPile(true);
    }
    // 飞牌动画
    const cardEl = cardRefs.current.get(selectedCardIdx);
    setPlayingCardIds(prev => new Set(prev).add(cardId));
    triggerPlayAnimation(cardId, cardEl ?? null);
    playCardAction(cardId);
    setSelectedCardIdx(null);
    setTimeout(() => {
      setPlayingCardIds(prev => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    }, 600);
  };

  const handleDiscardSelected = () => {
    if (!selectedCard) return;
    discardCardAction(selectedCard);
    setSelectedCardIdx(null);
  };

  const handleRecoverCard = (cardId: string) => {
    if (!waitingForRecover) return;
    playCardAction('Heat', cardId);
    setWaitingForRecover(false);
    setShowDiscardPile(false);
  };

  // 扇形手牌角度计算
  const handCount = battleState.hand.length;
  const getCardRotation = (idx: number) => {
    if (handCount <= 1) return 0;
    const spread = Math.min(24, handCount * 5);
    return -spread / 2 + (spread / (handCount - 1)) * idx;
  };
  const getCardTranslateY = (idx: number) => {
    if (handCount <= 1) return 80;
    const mid = (handCount - 1) / 2;
    // 基础偏移80px让卡牌底部沉入画面以下，弧形效果保留
    return 80 + Math.abs(idx - mid) * 10;
  };

  // 获取护甲序列状态颜色
  const getArmorStatusColor = (idx: number) => {
    if (idx < battleState.currentArmorIndex) return 'text-slate-600';
    if (idx === battleState.currentArmorIndex) return 'text-amber-300';
    return 'text-slate-400';
  };

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        backgroundImage: `url('/bg-battle-new.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 62%',
        overflow: 'hidden',
      }}
    >
      {/* 暗色遮罩：顶部较暗、中部透明、底部较浅以显示地面 */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(2,8,5,0.80) 0%, rgba(2,8,5,0.45) 35%, rgba(2,8,5,0.30) 60%, rgba(2,8,5,0.55) 100%)' }} />

      {/* 回合过场动画 */}
      <AnimatePresence>
        {showTurnCutscene && (
          <TurnCutscene
            currentRound={cutsceneRound}
            enemyAction={cutsceneEnemyAction}
            nextArmorLabel={cutsceneNextArmor}
            onDone={handleCutsceneDone}
          />
        )}
      </AnimatePresence>

      {/* 浮动伤害数字 */}
      <div className="absolute inset-0 pointer-events-none z-50">
        <AnimatePresence>
          {floatingTexts.map(ft => (
            <motion.div
              key={ft.id}
              className="absolute font-black text-2xl select-none"
              style={{
                color: ft.color,
                left: `${ft.x}%`,
                top: `${ft.y}%`,
                textShadow: `0 0 12px ${ft.color}, 0 2px 4px rgba(0,0,0,0.8)`,
              }}
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -80, scale: 1.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
            >
              {ft.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 飞牌动画层：幽灵卡牌从手牌飞向敌人 */}
      <div className="fixed inset-0 pointer-events-none z-[60]">
        <AnimatePresence>
          {flyingCard && (() => {
            const card = CARD_MAP[flyingCard.cardId];
            const dx = flyingCard.toX - flyingCard.fromX;
            const dy = flyingCard.toY - flyingCard.fromY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
              <motion.div
                key={flyingCard.id}
                className="absolute"
                style={{
                  left: flyingCard.fromX - 48,
                  top: flyingCard.fromY - 68,
                  width: 96, height: 136,
                  borderRadius: 10,
                  background: `linear-gradient(160deg, rgba(10,18,36,0.98) 0%, rgba(20,32,56,0.98) 100%)`,
                  border: `2px solid ${card?.glowColor ?? '#60a5fa'}`,
                  boxShadow: [
                    `0 0 32px ${card?.glowColor ?? '#60a5fa'}80`,
                    `0 0 12px ${card?.glowColor ?? '#60a5fa'}40`,
                    `0 12px 40px rgba(0,0,0,0.9)`,
                  ].join(', '),
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  transformOrigin: 'center center',
                  overflow: 'hidden',
                }}
                initial={{ opacity: 1, scale: 1.25, rotate: 0 }}
                animate={{
                  x: [0, dx * 0.25, dx * 0.7, dx],
                  y: [0, dy * 0.15 - dist * 0.22, dy * 0.65 - dist * 0.08, dy],
                  scale: [1.25, 1.3, 1.0, 0.6],
                  rotate: [0, -8, angle * 0.6, angle * 1.1],
                  opacity: [1, 1, 0.9, 0],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.42, ease: [0.22, 0.61, 0.36, 1] }}
              >
                {/* 卡面内容 */}
                <div style={{ fontSize: '2.2rem', lineHeight: 1, color: card?.glowColor ?? '#60a5fa', filter: `drop-shadow(0 0 10px ${card?.glowColor ?? '#60a5fa'})` }}>
                  {card?.symbol ?? card?.id?.slice(0, 2) ?? '?'}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', marginTop: 5, letterSpacing: '0.05em' }}>{card?.name ?? flyingCard.cardId}</div>
                {/* 内光效果 */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `radial-gradient(ellipse at 50% 40%, ${card?.glowColor ?? '#60a5fa'}25 0%, transparent 65%)`,
                }} />
                {/* 拖尾光迹 */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(${angle + 90}deg, ${card?.glowColor ?? '#60a5fa'}40 0%, transparent 50%)`,
                  }}
                  animate={{ opacity: [0.8, 0.3, 0] }}
                  transition={{ duration: 0.42 }}
                />
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* 命中冲击波 */}
        <AnimatePresence>
          {impactEffect && (
            <motion.div
              key={impactEffect.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: impactEffect.x - 60,
                top: impactEffect.y - 60,
                width: 120, height: 120,
                border: `3px solid ${impactEffect.color}`,
                boxShadow: `0 0 30px ${impactEffect.color}80, inset 0 0 20px ${impactEffect.color}30`,
              }}
              initial={{ scale: 0.2, opacity: 1 }}
              animate={{ scale: 2.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>

        {/* 命中粒子爆炸 */}
        <AnimatePresence>
          {particles.map(p => {
            const rad = p.angle * (Math.PI / 180);
            const dist = 55 + Math.random() * 30;
            return (
              <motion.div
                key={p.id}
                className="absolute rounded-full pointer-events-none"
                style={{
                  left: p.x - 4, top: p.y - 4,
                  width: 8, height: 8,
                  background: p.color,
                  boxShadow: `0 0 8px ${p.color}`,
                }}
                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                animate={{
                  x: Math.cos(rad) * dist,
                  y: Math.sin(rad) * dist,
                  opacity: 0,
                  scale: 0.3,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {/* 化学方程式浮现动画（升级版：扰光 + 大字 + 强光晕） */}
      <AnimatePresence>
        {showEquation && lastEquation && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* 背景晕光 */}
            <motion.div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.15) 0%, transparent 60%)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.6] }}
              transition={{ duration: 0.4 }}
            />
            {/* 方程式卡片 */}
            <motion.div
              className="relative overflow-hidden rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(8,47,73,0.97) 0%, rgba(6,78,59,0.97) 100%)',
                border: '1.5px solid rgba(34,211,238,0.7)',
                boxShadow: '0 0 40px rgba(34,211,238,0.4), 0 0 80px rgba(34,211,238,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
                padding: '20px 40px',
                minWidth: '320px',
              }}
              initial={{ scale: 0.7, y: 20, rotateX: -15 }}
              animate={{ scale: 1, y: 0, rotateX: 0 }}
              exit={{ scale: 0.9, y: -10, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {/* 扰光扫过效果 */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(105deg, transparent 40%, rgba(34,211,238,0.25) 50%, transparent 60%)',
                  backgroundSize: '200% 100%',
                }}
                animate={{ backgroundPosition: ['-100% 0', '200% 0'] }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
              />
              <div className="text-cyan-400/80 text-xs font-medium mb-2 text-center tracking-widest uppercase">⚗️ 化学反应方程式</div>
              <motion.div
                className="text-cyan-100 font-mono font-black text-center"
                style={{ fontSize: '1.4rem', letterSpacing: '0.05em', textShadow: '0 0 20px rgba(34,211,238,0.8)' }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                {lastEquation}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════
          顶部状态栏（设计图风格：回合居中 + 右侧按钮）
      ═══════════════════════════════════════ */}
      <div className="relative z-10 flex items-center px-4 py-2 backdrop-blur-sm" style={{ background: 'linear-gradient(180deg, rgba(2,6,4,0.92) 0%, rgba(2,8,5,0.75) 100%)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>

        {/* 左：退出按钮 */}
        <div className="flex items-center gap-3" style={{ width: '160px' }}>
          <button
            onClick={exitBattle}
            className="flex items-center gap-1.5 transition-colors text-sm rounded-lg px-2.5 py-1.5"
            style={{ color: 'rgba(255,255,255,0.5)', background: 'transparent', border: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
          >
            <span className="text-xl">←</span>
          </button>
        </div>

        {/* 中：回合进度（设计图风格：居中大字） */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-1.5">
              <span
                className="font-light tracking-widest"
                style={{
                  fontSize: '1.4rem',
                  color: 'rgba(255,255,255,0.9)',
                  fontFamily: '"Noto Sans SC", sans-serif',
                  letterSpacing: '0.1em',
                }}
              >
                回合 {battleState.currentRound}/{level.maxRounds}
              </span>
              {battleState.currentRound > level.maxRounds - 2 && (
                <motion.span
                  className="text-red-400 font-bold text-xs"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  ⚠️
                </motion.span>
              )}
            </div>
            <div
              className="w-32 h-1 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <motion.div
                className="h-full bg-cyan-500/60"
                animate={{ width: `${roundPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>

        {/* 右：重开/帮助按钮 */}
        <div className="flex items-center justify-end gap-2" style={{ width: '160px' }}>
          <button
            onClick={restartLevel}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)', background: 'transparent', border: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
            title="重新开始"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          中央战场区域（设计图风格：左右对峙）
      ═══════════════════════════════════════ */}
      <div
        ref={battlefieldRef}
        className="flex-1 relative flex items-stretch overflow-hidden"
        style={{ padding: '20px 40px' }}
      >
        {/* ── 左侧：玩家区域 ── */}
        <div className="flex-1 flex flex-col items-center justify-end relative" style={{ paddingBottom: '40px' }}>
          {/* 玩家受击闪光 */}
          <AnimatePresence>
            {shakePlayer && (
              <motion.div
                className="absolute inset-0 z-10 pointer-events-none"
                style={{ background: 'rgba(239,68,68,0.15)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            )}
          </AnimatePresence>

          {/* 玩家形象（设计图风格：左侧剪影） */}
          <motion.div
            className="relative"
            animate={shakePlayer ? { x: [-10, 10, -10, 10, 0] } : { y: [0, -6, 0] }}
            transition={shakePlayer ? { duration: 0.4 } : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <img
              src="/player-character-v2.png"
              alt="Player"
              style={{
                height: '320px',
                filter: 'drop-shadow(0 0 20px rgba(96,165,250,0.3))',
                maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
              }}
            />
            {/* 玩家脚底光环 */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-6 rounded-[100%] blur-xl" style={{ background: 'rgba(96,165,250,0.2)', zIndex: -1 }} />
          </motion.div>

          {/* 玩家血条与状态（设计图风格：紧凑型） */}
          <motion.div
            className="mt-4 w-48 flex flex-col gap-1.5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Player Status</span>
              <span className="text-[10px] text-cyan-400 font-mono">LV.01</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 h-2.5 rounded-full p-[1px]"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
                }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    // 护盾时：血条变蓝色；否则白色
                    background: battleState.playerShield > 0
                      ? 'rgba(96,165,250,0.9)'
                      : 'rgba(255,255,255,0.7)',
                  }}
                  animate={{ width: `${playerHPPercent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span
                className="text-xs font-mono"
                style={{ color: 'rgba(255,255,255,0.5)', minWidth: '50px', textAlign: 'right' }}
              >
                {battleState.playerHP}/{battleState.playerMaxHP}
              </span>
            </div>

            {/* 玩家状态标签 */}
            <div className="flex flex-wrap gap-1 mt-1">
              {battleState.playerShield > 0 && (
                <div className="text-base px-3 py-1 rounded-lg" style={{ background: 'rgba(29,78,216,0.25)', border: '2px solid rgba(96,165,250,0.7)', color: 'rgba(147,197,253,1)', fontWeight: 700, boxShadow: '0 0 12px rgba(59,130,246,0.5)', fontSize: '1rem' }}>
                  🛡️ {battleState.playerShield}
                </div>
              )}
              {battleState.catalyzed && (
                <div className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: 'rgba(216,180,254,0.8)' }}>
                  ⚡ 催化
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── 右侧：敌人区域 ── */}
        <div className="flex-1 flex flex-col items-center justify-end relative" style={{ paddingBottom: '0px', marginBottom: '-36px' }}>



          {/* ── Boss 下步行动图标（头顶居中，悬停弹出 Tooltip） ── */}
          {(() => {
            const nextActionIdx = (battleState.currentRound - 1) % level.enemyActions.length;
            const nextAction = level.enemyActions[nextActionIdx];
            if (!nextAction) return null;
            const actionColorMap: Record<string, string> = {
              attack: '#f87171',
              shield: '#60a5fa',
              strengthen: '#fbbf24',
              corrode: '#c084fc',
              heal: '#34d399',
            };
            const actionDescMap: Record<string, string> = {
              attack: `攻击玩家，造成 ${nextAction.value} 点伤害`,
              shield: `为自身添加 ${nextAction.value} 点护盾`,
              strengthen: `蓄力，下次攻击伤害提升 ${nextAction.value}`,
              corrode: `腐蚀玩家，降低 ${nextAction.value} 点防御`,
              heal: `回复 ${nextAction.value} 点生命`,
            };
            const color = actionColorMap[nextAction.type] ?? '#fff';
            const desc = actionDescMap[nextAction.type] ?? nextAction.label;
            return (
              <div className="flex justify-center mb-1" style={{ position: 'relative', zIndex: 30 }}>
                <div
                  ref={intentIconRef}
                  className="relative flex flex-col items-center justify-center cursor-pointer"
                  style={{ minWidth: '56px' }}
                  onMouseEnter={() => setShowIntentTooltip(true)}
                  onMouseLeave={() => setShowIntentTooltip(false)}
                >
                  <motion.div
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px' }}
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {/* 杀戮尖塔风格图标：无圆框，大图标+数值 */}
                    {nextAction.type === 'attack' && (
                      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* 交叉双剑攻击 - 杀戮尖塔风格 */}
                        <filter id="glow-atk">
                          <feGaussianBlur stdDeviation="1.5" result="blur"/>
                          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                        <g filter="url(#glow-atk)">
                          <line x1="8" y1="32" x2="32" y2="8" stroke={color} strokeWidth="3" strokeLinecap="round"/>
                          <polygon points="28,8 32,8 32,12" fill={color}/>
                          <line x1="8" y1="28" x2="12" y2="32" stroke={color} strokeWidth="4.5" strokeLinecap="round"/>
                          <line x1="32" y1="32" x2="8" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.45"/>
                          <polygon points="12,32 8,32 8,28" fill={color} opacity="0.45"/>
                        </g>
                      </svg>
                    )}
                    {nextAction.type === 'shield' && (
                      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* 盾牌 - 杀戮尖塔风格 */}
                        <filter id="glow-shd">
                          <feGaussianBlur stdDeviation="1.5" result="blur"/>
                          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                        <g filter="url(#glow-shd)">
                          <path d="M20 5 L32 10 L32 21 C32 28 26 34 20 36 C14 34 8 28 8 21 L8 10 Z" stroke={color} strokeWidth="2.5" fill={`${color}20`} strokeLinejoin="round"/>
                          <path d="M14 20 L18 24 L26 15" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        </g>
                      </svg>
                    )}
                    {nextAction.type === 'strengthen' && (
                      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* 闪电蓄力 - 杀戮尖塔风格 */}
                        <filter id="glow-str">
                          <feGaussianBlur stdDeviation="1.5" result="blur"/>
                          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                        <g filter="url(#glow-str)">
                          <polygon points="22,5 12,22 19,22 18,35 28,18 21,18" fill={`${color}30`} stroke={color} strokeWidth="2" strokeLinejoin="round"/>
                          <line x1="20" y1="8" x2="20" y2="12" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/>
                          <line x1="14" y1="10" x2="16" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
                          <line x1="26" y1="10" x2="24" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
                        </g>
                      </svg>
                    )}
                    {nextAction.type === 'corrode' && (
                      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* 毒瓶腐蚀 - 杀戮尖塔风格 */}
                        <filter id="glow-cor">
                          <feGaussianBlur stdDeviation="1.5" result="blur"/>
                          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                        <g filter="url(#glow-cor)">
                          <path d="M15 8 L15 14 L9 22 L9 32 L31 32 L31 22 L25 14 L25 8 Z" stroke={color} strokeWidth="2" fill={`${color}15`} strokeLinejoin="round"/>
                          <line x1="13" y1="8" x2="27" y2="8" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
                          <path d="M12 24 Q15 20 20 22 Q25 24 28 20" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"/>
                          <circle cx="16" cy="27" r="2" fill={color} opacity="0.7"/>
                          <circle cx="24" cy="26" r="1.5" fill={color} opacity="0.5"/>
                        </g>
                      </svg>
                    )}
                    {nextAction.type === 'heal' && (
                      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* 治愈十字 - 杀戮尖塔风格 */}
                        <filter id="glow-heal">
                          <feGaussianBlur stdDeviation="1.5" result="blur"/>
                          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                        <g filter="url(#glow-heal)">
                          <path d="M20 32 C20 32 8 25 8 16 C8 11 11.5 8 15 8 C17 8 18.5 9 20 10.5 C21.5 9 23 8 25 8 C28.5 8 32 11 32 16 C32 25 20 32 20 32Z" stroke={color} strokeWidth="2.2" fill={`${color}20`} strokeLinejoin="round"/>
                          <line x1="20" y1="12" x2="20" y2="22" stroke={color} strokeWidth="3" strokeLinecap="round"/>
                          <line x1="15" y1="17" x2="25" y2="17" stroke={color} strokeWidth="3" strokeLinecap="round"/>
                        </g>
                      </svg>
                    )}
                    {!['attack','shield','strengthen','corrode','heal'].includes(nextAction.type) && (
                      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                        <text x="20" y="26" textAnchor="middle" fill={color} fontSize="18" fontWeight="bold">?</text>
                      </svg>
                    )}
                    {/* 数值标签 - 杀戮尖塔风格 */}
                    <div style={{
                      color: color,
                      fontSize: '15px',
                      fontWeight: 'bold',
                      fontFamily: 'monospace',
                      textShadow: `0 0 8px ${color}`,
                      letterSpacing: '0.5px',
                      lineHeight: 1,
                    }}>
                      {nextAction.value}
                    </div>
                  </motion.div>
                  {/* 悬停 Tooltip（向上弹出） */}
                  <AnimatePresence>
                    {showIntentTooltip && (
                      <motion.div
                        className="absolute bottom-full mb-2 left-1/2 z-50"
                        style={{
                          transform: 'translateX(-50%)',
                          background: 'rgba(4,8,18,0.97)',
                          border: `1px solid ${color}60`,
                          borderRadius: '10px',
                          padding: '8px 12px',
                          minWidth: '150px',
                          maxWidth: '210px',
                          boxShadow: `0 4px 20px rgba(0,0,0,0.8), 0 0 12px ${color}30`,
                          backdropFilter: 'blur(12px)',
                          pointerEvents: 'none',
                          whiteSpace: 'nowrap',
                        }}
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      >
                        <div className="text-[10px] uppercase tracking-widest mb-1 opacity-50" style={{ color }}>Enemy Intent</div>
                        <div className="text-xs font-bold text-white mb-1">{nextAction.label}</div>
                        <div className="text-[10px] text-slate-400 leading-relaxed whitespace-normal">{desc}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })()}

          {/* 敌人形象（设计图风格：右侧剪影） */}
          <motion.div
            ref={enemyRef}
            className="relative"
            animate={shakeEnemy ? { x: [-12, 12, -12, 12, 0] } : { y: [0, 8, 0] }}
            transition={shakeEnemy ? { duration: 0.4 } : { duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            onMouseEnter={() => setShowBossTooltip(true)}
            onMouseLeave={() => setShowBossTooltip(false)}
          >
            {/* 受击红闪 */}
            <AnimatePresence>
              {hitFlash === 'damage' && (
                <motion.div
                  className="absolute inset-0 z-10 rounded-full blur-2xl"
                  style={{ background: 'rgba(239,68,68,0.4)' }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1.2 }}
                  exit={{ opacity: 0 }}
                />
              )}
              {hitFlash === 'success' && (
                <motion.div
                  className="absolute inset-0 z-10 rounded-full blur-3xl"
                  style={{ background: 'rgba(34,197,94,0.4)' }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1.5 }}
                  exit={{ opacity: 0 }}
                />
              )}
            </AnimatePresence>

            <img
              src={getBossImageUrl(level.id)}
              alt={level.enemyName}
              style={{
                height: '420px',
                filter: 'drop-shadow(0 0 30px rgba(239,68,68,0.2))',
                maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
              }}
            />
            {/* 敌人脚底光环 */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-8 rounded-[100%] blur-2xl" style={{ background: 'rgba(239,68,68,0.15)', zIndex: -1 }} />

            {/* Boss 介绍 Tooltip */}
            <AnimatePresence>
              {showBossTooltip && (
                <motion.div
                  className="absolute top-0 right-full mr-4 z-50"
                  style={{
                    background: 'rgba(4,8,18,0.97)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    padding: '16px',
                    width: '240px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(12px)',
                    pointerEvents: 'none',
                  }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <div className="text-red-400 text-[10px] uppercase tracking-widest mb-1 font-bold">Target Identified</div>
                  <div className="text-lg font-black text-white mb-1">{level.enemyName}</div>
                  <div className="text-xs text-slate-400 leading-relaxed mb-3">{level.enemyDescription}</div>
                  {level.bossTraits && (
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 uppercase">Weakness</span>
                        <div className="flex gap-1">
                          {level.bossTraits.weakToCards?.map(c => (
                            <span key={c} className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 text-[9px] border border-green-500/20">{c}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* 敌人血条与状态（设计图风格：紧凑型） */}
          <motion.div
            className="mt-4 w-64 flex flex-col gap-1.5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Enemy Core</span>
              <span className="text-[10px] text-red-400 font-mono">HP {Math.round(enemyHPPercent)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-mono"
                style={{ color: 'rgba(255,255,255,0.5)', minWidth: '50px' }}
              >
                {battleState.enemyHP}/{battleState.enemyMaxHP}
              </span>
              <div
                className="flex-1 h-2.5 rounded-full p-[1px]"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
                }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #f87171 0%, #ef4444 100%)',
                    boxShadow: '0 0 10px rgba(239,68,68,0.4)',
                  }}
                  animate={{ width: `${enemyHPPercent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* 敌人状态标签 */}
            <div className="flex flex-wrap gap-1 mt-1 justify-end">
              {battleState.enemyShield > 0 && (
                <div className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: 'rgba(147,197,253,0.8)' }}>
                  🛡️ {battleState.enemyShield}
                </div>
              )}
              {battleState.enemyStrengthened > 0 && (
                <motion.div
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', color: 'rgba(252,211,77,0.8)' }}
                  animate={{ opacity: [1, 0.6, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  ⚡ 蓄力 +{battleState.enemyStrengthened}
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── 元素速查竖向按钮（右侧边缘，缩小 0.75x，向下移动） ── */}
        <div
          className="absolute z-20"
          style={{ right: '12px', top: 'calc(50% + 40px)', transform: 'translateY(-50%) scale(0.75)', transformOrigin: 'right center', pointerEvents: 'auto' }}
        >
          <button
            onClick={() => {
              // 元素图鉴：显示本局所有出现的元素
              setShowElementCompendium(true);
              setCompendiumSelectedCard(null);
            }}
            className="flex flex-col items-center justify-center rounded-l-xl transition-all"
            style={{
              background: 'rgba(4,10,16,0.80)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRight: 'none',
              backdropFilter: 'blur(10px)',
              padding: '40px 16px',
              boxShadow: '-2px 0 12px rgba(0,0,0,0.4)',
            }}
            title="元素速查"
          >
            {/* < 箭头 */}
            <svg width="20" height="32" viewBox="0 0 10 16" fill="none" className="mb-3">
              <path d="M8 2L2 8L8 14" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span
              style={{
                color: 'rgba(255,255,255,0.55)',
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                fontSize: '1.4rem',
                letterSpacing: '0.12em',
                fontFamily: '"Noto Sans SC", sans-serif',
              }}
            >
              元素速查
            </span>
          </button>
        </div>

        {/* ── Boss特殊状态指示器（左下角，统一紧凑样式） ── */}
        {(() => {
          const traits = level.bossTraits;
          if (!traits) return null;

          // 效果图样式：圆形图标 + 气泡
          const SideCard = ({ id, accentColor, icon, children }: { id: string; accentColor: string; icon: string; children: React.ReactNode }) => {
            if (hiddenIndicators.has(id)) return null;
            return (
              <motion.div
                key={id}
                className="flex items-start"
                initial={{ opacity: 0, x: -240 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -240 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              >
                {/* 圆形图标 */}
                <div className="flex-shrink-0 flex items-center justify-center rounded-full z-10" style={{
                  width: '32px', height: '32px',
                  background: 'rgba(10,20,40,0.92)',
                  border: `2px solid ${accentColor}`,
                  boxShadow: `0 0 10px ${accentColor}60`,
                  marginRight: '-6px',
                  marginTop: '4px',
                }}>
                  <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>{icon}</span>
                </div>
                {/* 气泡 */}
                <div className="relative rounded-lg px-3 py-2 text-xs" style={{
                  background: 'rgba(8,16,32,0.88)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(14px)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
                  minWidth: '130px',
                  maxWidth: '180px',
                }}>
                  <button className="absolute top-1 right-1.5" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.6rem', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => setHiddenIndicators(prev => new Set(Array.from(prev).concat(id)))}>×</button>
                  <div style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, paddingRight: '10px' }}>{children}</div>
                </div>
              </motion.div>
            );
          };

          const cards: React.ReactNode[] = [];

          if (traits.sodiumExplosion && currentArmor?.armorId === 'Na') {
            cards.push(
              <SideCard key="sodium" id="sodium" accentColor="rgba(249,115,22,0.9)" icon="💥">
                用 H₂O 破甲将触发溅射 {traits.sodiumExplosionDamage ?? 10} 点伤害
              </SideCard>
            );
          }
          if (traits.armorRegen && battleState.armorRegenMax > 0) {
            const regenInterval = traits.armorRegenInterval ?? 3;
            cards.push(
              <SideCard key="regen" id="regen" accentColor="rgba(16,185,129,0.9)" icon="♻️">
                护甲再生（剩 {battleState.armorRegenMax} 次）
                <div className="flex gap-1 mt-1">
                  {Array.from({ length: regenInterval }).map((_, i) => (
                    <div key={i} className="flex-1 h-1 rounded-full" style={{ backgroundColor: i < battleState.armorRegenCounter ? '#10b981' : 'rgba(255,255,255,0.1)' }} />
                  ))}
                </div>
              </SideCard>
            );
          }
          if (traits.activityLock && battleState.activityLockActive) {
            cards.push(
              <SideCard key="actlock" id="actlock" accentColor="rgba(239,68,68,0.9)" icon="🔒">
                活动性锁定（剩 {battleState.activityLockRounds} 回合），高活性金属无法使用
              </SideCard>
            );
          }
          if (traits.redoxArmor && battleState.redoxArmorState) {
            const isOxidized = battleState.redoxArmorState === 'oxidized';
            cards.push(
              <SideCard key="redox" id="redox" accentColor={isOxidized ? 'rgba(168,85,247,0.9)' : 'rgba(59,130,246,0.9)'} icon={isOxidized ? '🔵' : '🟦'}>
                {isOxidized ? '氧化态护甲' : '还原态护甲'}，需要{isOxidized ? '还原剂' : '氧化剂'}才能破除
              </SideCard>
            );
          }

          if (cards.length === 0) return null;
          return (
            <AnimatePresence>
              <div className="absolute left-0 bottom-3 z-20 flex flex-col gap-3" style={{ maxWidth: '220px' }}>
                {cards}
              </div>
            </AnimatePresence>
          );
        })()}

        {/* ── 开局提示（从左侧滑入，可点击关闭） ── */}
        <AnimatePresence>
          {showOpeningHint && level.hint && (
            <motion.div
              className="absolute left-0 top-4 z-30 flex items-start"
              style={{ maxWidth: '220px' }}
              initial={{ opacity: 0, x: -240 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -240 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.5 }}
            >
              {/* 圆形图标 */}
              <div className="flex-shrink-0 flex items-center justify-center rounded-full z-10" style={{
                width: '32px', height: '32px',
                background: 'rgba(10,20,40,0.92)',
                border: '2px solid rgba(96,165,250,0.8)',
                boxShadow: '0 0 10px rgba(96,165,250,0.4)',
                marginRight: '-6px',
                marginTop: '4px',
              }}>
                <span style={{ fontSize: '0.85rem' }}>💡</span>
              </div>
              {/* 气泡 */}
              <div className="relative rounded-lg px-3 py-2 text-xs" style={{
                background: 'rgba(8,16,32,0.88)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(14px)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
                minWidth: '130px',
                maxWidth: '180px',
              }}>
                <button className="absolute top-1 right-1.5" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.6rem', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => setShowOpeningHint(false)}>×</button>
                <div style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, paddingRight: '10px' }}>{level.hint}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 石蕊揭示（圆形图标+气泡样式） */}
        {revealActive && armorForecast.length > 1 && (
          <motion.div
            className="absolute left-0 top-4 z-20 flex items-start"
            style={{ maxWidth: '220px' }}
            initial={{ opacity: 0, x: -240 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          >
            {/* 圆形图标 */}
            <div className="flex-shrink-0 flex items-center justify-center rounded-full z-10" style={{
              width: '32px', height: '32px',
              background: 'rgba(10,20,40,0.92)',
              border: '2px solid rgba(236,72,153,0.8)',
              boxShadow: '0 0 10px rgba(236,72,153,0.4)',
              marginRight: '-6px',
              marginTop: '4px',
            }}>
              <span style={{ fontSize: '0.85rem' }}>🔍</span>
            </div>
            {/* 气泡 */}
            <div className="relative rounded-lg px-3 py-2 text-xs" style={{
              background: 'rgba(8,16,32,0.88)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(14px)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
              minWidth: '130px',
              maxWidth: '180px',
            }}>
              <div style={{ color: 'rgba(249,168,212,0.9)', fontSize: '0.6rem', marginBottom: '4px' }}>石蕊揭示</div>
              <div className="flex flex-wrap gap-1.5">
                {armorForecast.slice(1, 4).map((a, i) => (
                  <div key={i} className="px-1.5 py-0.5 rounded bg-pink-500/10 border border-pink-500/20 text-pink-300 font-bold" style={{ fontSize: '9px' }}>
                    {a.label ?? a.armorId}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── 左侧：护甲序列（设计图风格：竖向时间轴） ── */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-4">
        <div className="flex flex-col items-center gap-1 mb-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black">Armor Layers</div>
          <div className="w-8 h-0.5 bg-amber-500/40 rounded-full" />
        </div>

        <div className="flex flex-col gap-3 relative">
          {/* 时间轴连线 */}
          <div className="absolute left-[15px] top-4 bottom-4 w-[1px] bg-gradient-to-bottom from-amber-500/40 via-slate-700 to-slate-800" />

          {level.armorSequence.map((armor, idx) => {
            const isCurrent = idx === battleState.currentArmorIndex;
            const isBroken = idx < battleState.currentArmorIndex;
            const armorType = ARMOR_TYPES[armor.armorId];

            return (
              <motion.div
                key={idx}
                className="flex items-center gap-3 group"
                initial={false}
                animate={{
                  opacity: isBroken ? 0.4 : 1,
                  x: isCurrent ? 4 : 0,
                }}
              >
                {/* 节点圆圈 */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
                    isCurrent ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)] scale-110 border-2 border-white/20' :
                    isBroken ? 'bg-slate-800 border border-slate-700' :
                    'bg-slate-900 border border-slate-800'
                  }`}
                >
                  {isBroken ? (
                    <span className="text-slate-500 text-xs">✓</span>
                  ) : (
                    <span className={`text-xs font-black ${isCurrent ? 'text-slate-900' : 'text-slate-500'}`}>
                      {idx + 1}
                    </span>
                  )}
                </div>

                {/* 护甲标签 */}
                <div className="flex flex-col">
                  <div className={`text-sm font-black tracking-tight transition-colors ${getArmorStatusColor(idx)}`}>
                    {armor.label ?? armor.armorId}
                  </div>
                  {isCurrent && armorType && (
                    <motion.div
                      className="text-[9px] text-amber-500/70 font-medium uppercase tracking-wider"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      {armorType.name}
                    </motion.div>
                  )}
                </div>

                {/* 护甲数值（如果是当前护甲） */}
                {isCurrent && battleState.enemyShield > 0 && (
                  <div className="ml-2 px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-bold">
                    SHIELD {battleState.enemyShield}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════
          底部手牌区域（设计图风格：扇形展开）
      ═══════════════════════════════════════ */}
      <div className="relative z-30 mt-auto">
        {/* 手牌扇形区（相对定位容器，卡牌部分沉于底部以下） */}
        <div className="relative flex items-end justify-center px-8 pt-3"
          style={{ minHeight: '180px', overflow: 'visible', paddingBottom: '0px' }}>

          <AnimatePresence mode="popLayout">
            {battleState.hand.map((cardId, idx) => {
              const rotation = getCardRotation(idx);
              const translateY = getCardTranslateY(idx);
              const isSelected = selectedCardIdx === idx;
              const isHovered = hoveredCard === `${cardId}-${idx}`;
              const card = CARD_MAP[cardId];
              const canBreakArmor = currentArmorId ? card?.breaksArmor.includes(currentArmorId) : false;

              const isDragging = draggingCardIdx === idx;
              const isPlaying = playedCardIdx === idx || playingCardIds.has(cardId);

              return (
                <motion.div
                  key={`hand-${cardId}-${idx}`}
                  layout
                  style={{
                    position: 'relative',
                    transformOrigin: 'bottom center',
                    marginLeft: idx === 0 ? 0 : '-20px',
                    zIndex: isDragging ? 9999 : isSelected || isHovered ? 50 : idx + 1,
                    pointerEvents: isPlaying ? 'none' : 'auto',
                  }}
                  initial={{ opacity: 0, y: translateY + 40, rotate: rotation, scale: 0.85 }}
                  animate={{
                    opacity: isPlaying ? 0 : 1,
                    y: isPlaying ? translateY - 100 : (isSelected ? translateY - 55 : isHovered ? translateY - 28 : translateY),
                    rotate: isSelected || isHovered ? 0 : rotation,
                    scale: isSelected ? 1.15 : isHovered ? 1.08 : 1,
                  }}
                  exit={{ opacity: 0, y: translateY - 100, scale: 0.8, transition: { duration: 0.2 } }}
                  transition={{
                    opacity: { duration: isPlaying ? 0.1 : 0.25 },
                    y: { type: 'spring', stiffness: 320, damping: 26 },
                    rotate: { type: 'spring', stiffness: 220, damping: 22 },
                    scale: { type: 'spring', stiffness: 380, damping: 28 },
                    layout: { type: 'spring', stiffness: 300, damping: 30 }
                  }}
                  onHoverStart={() => !isDragging && setHoveredCard(`${cardId}-${idx}`)}
                  onHoverEnd={() => setHoveredCard(null)}
                  onClick={() => handleCardClick(cardId, idx)}
                >
                  {/* 内层：拖拽层，独立处理 drag 位移，不影响卡面内容居中 */}
                  <motion.div
                    ref={(el) => {
                      if (el) cardRefs.current.set(idx, el as HTMLDivElement);
                      else cardRefs.current.delete(idx);
                    }}
                    style={{
                      cursor: isDragging ? 'grabbing' : 'grab',
                      position: 'relative',
                    }}
                    animate={{
                      scale: isDragging ? 1.22 : 1,
                      filter: isDragging
                        ? 'drop-shadow(0 20px 40px rgba(0,0,0,0.9)) drop-shadow(0 0 24px rgba(255,255,255,0.18))'
                        : 'none',
                      y: isDragging ? -60 : 0,
                      rotate: isDragging ? 0 : 0,
                    }}
                    transition={{
                      scale: { type: 'spring', stiffness: 400, damping: 28 },
                      filter: { duration: 0.12 },
                      y: { type: 'spring', stiffness: 500, damping: 32 },
                    }}
                    drag={!isGameOver && battleState.phase === 'player' && !waitingForRecover}
                    dragConstraints={false}
                    dragElastic={0.05}
                    dragMomentum={false}
                    onDragStart={() => handleDragStart(idx)}
                    onDrag={handleDragMove}
                    onDragEnd={() => handleDragEnd(idx, cardId)}
                  >
                    {/* 可破甲绿色光晕（仅前4关显示） */}
                    {canBreakArmor && !isSelected && level.id < 5 && (
                      <motion.div
                        className="absolute -inset-1 rounded-xl bg-green-500/15 border border-green-500/40"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}

                    {/* 拖拽时显示的投出区域提示光晕 */}
                    {isDragging && dragPos !== null && dragPos.y < window.innerHeight - 220 && (
                      <motion.div
                        className="absolute -inset-2 rounded-xl"
                        style={{
                          border: `2px solid ${card?.glowColor ?? '#60a5fa'}`,
                          boxShadow: `0 0 20px ${card?.glowColor ?? '#60a5fa'}60`,
                        }}
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 0.6, repeat: Infinity }}
                      />
                    )}

                    <ElementCardComponent
                      cardId={cardId}
                      size="lg"
                      currentArmorId={currentArmorId ?? undefined}
                      currentArmorLabel={currentArmor?.label ?? currentArmorId ?? undefined}
                      isSelected={isSelected}
                      disabled={isGameOver || battleState.phase !== 'player'}
                      hiddenGuideMode={level.id >= 5}
                      bossWeakToCards={level.bossTraits?.weakToCards}
                      bossImmuneCards={level.bossTraits?.immuneToCards}
                    />
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* 固定发牌制：不再显示手牌为空提示 */}

        </div>

        {/* 底部操作区：左弃牌堆 + 右抄牌堆（浮动，无背景框） */}
        <div className="flex items-center justify-between px-4 pb-2 pt-1" style={{ position: 'relative', zIndex: 150 }}>

          {/* 左：弃牌堆图标（增大为 2 倍尺寸） */}
          <button
            onClick={toggleDiscardPile}
            className="relative flex flex-col items-center justify-center transition-all gap-1"
            style={{ width: '128px', height: '152px' }}
            title={`弃牌堆 ${battleState.discardPile.length} 张`}
          >
            <svg width="104" height="128" viewBox="0 0 52 64" fill="none">
              <rect x="1" y="1" width="50" height="62" rx="6" fill="rgba(20,30,40,0.88)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5"/>
              <rect x="5" y="5" width="42" height="54" rx="4" fill="rgba(30,45,60,0.8)"/>
              <path d="M14 30 Q26 20 38 30 Q26 40 14 30Z" fill="rgba(255,255,255,0.07)"/>
              <path d="M14 30 Q26 20 38 30" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
            </svg>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.2rem', letterSpacing: '0.05em', fontWeight: 600 }}>弃牌堆</span>
            {battleState.discardPile.length > 0 && (
              <div
                className="absolute top-0 right-0 flex items-center justify-center rounded-full"
                style={{ width: '44px', height: '44px', background: '#ef4444', fontSize: '1.4rem', fontWeight: 700, color: '#fff', boxShadow: '0 2px 8px rgba(239,68,68,0.5)' }}
              >
                {battleState.discardPile.length}
              </div>
            )}
          </button>

          {/* 中间空白占位 */}
          <div className="flex-1" />

          {/* 失误统计（小字标签） */}
          {battleState.totalMistakes > 0 && (
            <div
              className="text-sm px-3 py-1 rounded mr-4"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: 'rgba(252,165,165,0.8)' }}
            >
              ❌ {battleState.totalMistakes}次失误
            </div>
          )}

          {/* 右：抽牌堆图标（增大为 2 倍尺寸） */}
          <button
            onClick={() => setShowDrawPile(prev => !prev)}
            className="relative flex flex-col items-center justify-center transition-all gap-1"
            style={{ width: '128px', height: '152px' }}
            title={`抽牌堆 ${battleState.drawPile.length} 张`}
          >
            <svg width="104" height="128" viewBox="0 0 52 64" fill="none">
              <rect x="1" y="1" width="50" height="62" rx="6" fill="rgba(20,30,40,0.88)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5"/>
              {/* 烧杯形状 */}
              <path d="M19 46 L16 56 L36 56 L33 46Z" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8"/>
              <path d="M14 46 L38 46" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5"/>
              <ellipse cx="26" cy="28" rx="9" ry="13" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5"/>
              <ellipse cx="26" cy="15" rx="9" ry="3" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8"/>
            </svg>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.2rem', letterSpacing: '0.05em', fontWeight: 600 }}>手牌堆</span>
            <div
              className="absolute top-0 right-0 flex items-center justify-center rounded-full"
              style={{ width: '44px', height: '44px', background: 'rgba(30,40,55,0.95)', border: '1px solid rgba(255,255,255,0.25)', fontSize: '1.4rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
            >
              {battleState.drawPile.length}
            </div>
          </button>
        </div>
      </div>

      {/* 结束回合按钮（固定在左下角，向左移动一大步） */}
      {battleState.phase === 'player' && !isGameOver && (
        <motion.button
          onClick={() => {
            setSelectedCardIdx(null);
            endTurnAction();
          }}
          className="cursor-pointer font-light"
          style={{
            position: 'fixed',
            left: '90px',
            bottom: '110px',
            background: 'rgba(8,16,28,0.82)',
            border: '1px solid rgba(255,255,255,0.28)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: '1rem',
            letterSpacing: '0.08em',
            fontFamily: '"Noto Sans SC", sans-serif',
            borderRadius: '12px',
            padding: '12px 22px',
            backdropFilter: 'blur(12px)',
            zIndex: 200,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
          }}
          whileHover={{
            background: 'rgba(255,255,255,0.12)',
            borderColor: 'rgba(255,255,255,0.55)',
            color: 'rgba(255,255,255,1)',
            boxShadow: '0 6px 28px rgba(0,0,0,0.8)',
          }}
          whileTap={{ scale: 0.95 }}
        >
          结束回合
        </motion.button>
      )}

      {/* 元素图鉴弹窗（本局所有出现的元素） */}
      <AnimatePresence>
        {showElementCompendium && (() => {
          // 收集本局所有出现的元素 ID
          const deckCardIds = Array.from(new Set(level.playerDeck));
          const armorIds = Array.from(new Set(level.armorSequence.map(a => a.armorId)));
          // 将卡牌和护甲的知识卡合并
          const allKcIds = new Set<string>();
          deckCardIds.forEach(id => {
            const card = CARD_MAP[id];
            if (card?.knowledgeCardId) allKcIds.add(card.knowledgeCardId);
          });
          armorIds.forEach(id => {
            // 护甲类型对应的知识卡（如果有）
            const kcId = `kc-${id}`;
            if (KNOWLEDGE_MAP[kcId]) allKcIds.add(kcId);
          });
          // 加入关卡知识卡
          if (level.knowledgeCardId) allKcIds.add(level.knowledgeCardId);
          const compendiumCards = Array.from(allKcIds).map(id => KNOWLEDGE_MAP[id]).filter(Boolean) as import('@/lib/levelData').KnowledgeCard[];

          return (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowElementCompendium(false)} />
              <motion.div
                className="relative w-full"
                style={{
                  maxWidth: '720px',
                  background: 'rgba(4,10,18,0.98)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  boxShadow: '0 16px 50px rgba(0,0,0,0.9)',
                  overflow: 'hidden',
                  maxHeight: '72vh',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 22 }}
              >
                {/* 标题栏 */}
                <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700, fontSize: '1rem' }}>元素图鉴</div>
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', marginTop: '2px' }}>本局出现的 {compendiumCards.length} 种元素</div>
                  </div>
                  <button onClick={() => setShowElementCompendium(false)} style={{ color: 'rgba(255,255,255,0.35)', fontSize: '1.2rem', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                  {/* 左侧列表 — 与右侧等宽，各占50% */}
                  <div style={{ flex: '0 0 50%', borderRight: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', padding: '12px' }}>
                    {compendiumCards.map(card => (
                      <button
                        key={card.id}
                        onClick={() => setCompendiumSelectedCard(card)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '12px 16px',
                          borderRadius: '10px', marginBottom: '6px',
                          background: compendiumSelectedCard?.id === card.id ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.03)',
                          border: compendiumSelectedCard?.id === card.id ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.06)',
                          cursor: 'pointer', transition: 'all 0.15s',
                          display: 'flex', alignItems: 'center', gap: '12px',
                        }}
                      >
                        <div style={{ fontSize: '1.6rem', minWidth: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.9)', fontWeight: 800 }}>{card.symbol}</div>
                        <div>
                          <div style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: '0.9rem' }}>{card.name}</div>
                          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>{card.family}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* 右侧详情 — 占50% */}
                  <div style={{ flex: '0 0 50%', overflowY: 'auto', padding: '20px', background: 'rgba(255,255,255,0.01)' }}>
                    {compendiumSelectedCard ? (
                      <motion.div
                        key={compendiumSelectedCard.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
                          <span style={{ fontSize: '2.4rem', fontWeight: 900, color: '#fff' }}>{compendiumSelectedCard.symbol}</span>
                          <span style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.5)' }}>{compendiumSelectedCard.name}</span>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>化学特性</div>
                          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', lineHeight: 1.6 }}>{compendiumSelectedCard.description}</div>
                        </div>

                        {compendiumSelectedCard.reactions && compendiumSelectedCard.reactions.length > 0 && (
                          <div>
                            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>常见反应</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {compendiumSelectedCard.reactions.map((r, i) => (
                                <div key={i} style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                  <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem', fontFamily: 'monospace', marginBottom: '4px' }}>{r.equation}</div>
                                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{r.description}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '0.85rem' }}>
                        选择左侧元素查看详情
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* 各种弹窗 */}
      <KnowledgeCardModal
        card={showKnowledgeCard}
        onClose={dismissKnowledgeCard}
      />

      {/* 手动触发的知识卡弹窗 */}
      <KnowledgeCardModal
        card={manualKnowledgeCard}
        onClose={() => setManualKnowledgeCard(null)}
      />

      <DiscardPileModal
        isOpen={showDiscardPile}
        onClose={() => {
          setShowDiscardPile(false);
          setWaitingForRecover(false);
        }}
        discardPile={battleState.discardPile}
        onSelectCard={handleRecoverCard}
        isRecoverMode={waitingForRecover}
      />

      <DrawPileModal
        isOpen={showDrawPile}
        onClose={() => setShowDrawPile(false)}
        drawPile={battleState.drawPile}
      />

      <BattleResultModal
        phase={battleState.phase}
        onRestart={restartLevel}
        onExit={exitBattle}
        level={level}
        battleState={battleState}
      />

      <FailureHintModal
        reason={failureReason}
        onClose={handleCloseFailureHint}
      />
    </div>
  );
}
