/**
 * BattleScreen.tsx — 杀戮尖塔风格战斗界面（全面重构版）
 * 设计哲学：炼金术士实验室 × 赛博朋克
 * 布局：顶部状态栏 | 左侧护甲/玩家 | 中央战场 | 右侧预告 | 底部手牌
 */

import { AnimatePresence, motion } from 'framer-motion';
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

// Boss 图片路径
const getBossImageUrl = (levelId: number): string => `/bosses/boss_${levelId}.webp`;

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
    getCurrentLevel,
    pendingFailureReason,
    clearPendingFailureReason,
  } = useGame();
  const level = getCurrentLevel();

  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const selectedCard = selectedCardIdx !== null && battleState ? (battleState.hand[selectedCardIdx] ?? null) : null;
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [draggingCardIdx, setDraggingCardIdx] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dragOverBoss, setDragOverBoss] = useState(false);
  const [playedCardIdx, setPlayedCardIdx] = useState<number | null>(null);
  const [playingCardIds, setPlayingCardIds] = useState<Set<string>>(new Set());
  const [showIntentTooltip, setShowIntentTooltip] = useState(false);
  const [showBossTooltip, setShowBossTooltip] = useState(false);
  const battlefieldRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [flyingCard, setFlyingCard] = useState<{
    id: number; cardId: string;
    fromX: number; fromY: number;
    toX: number; toY: number;
  } | null>(null);
  const flyIdRef = useRef(0);
  const enemyRef = useRef<HTMLDivElement>(null);
  const [impactEffect, setImpactEffect] = useState<{ id: number; x: number; y: number; color: string } | null>(null);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; angle: number; color: string }>>([]);
  const [showDiscardPile, setShowDiscardPile] = useState(false);
  const [showDrawPile, setShowDrawPile] = useState(false);
  const [waitingForRecover, setWaitingForRecover] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<Array<{
    id: number; text: string; x: number; y: number; color: string;
  }>>([])
  const [shakeEnemy, setShakeEnemy] = useState(false);
  const [hitFlash, setHitFlash] = useState<'damage' | 'success' | null>(null);
  const [lastEquation, setLastEquation] = useState<string | null>(null);
  const [showEquation, setShowEquation] = useState(false);
  const [failureReason, setFailureReason] = useState<FailureReason | null>(null);
  const [showTurnCutscene, setShowTurnCutscene] = useState(false);
  const [cutsceneRound, setCutsceneRound] = useState(1);
  const [cutsceneEnemyAction, setCutsceneEnemyAction] = useState<{ label: string; icon: string; type: string; value: number } | null>(null);
  const [cutsceneNextArmor, setCutsceneNextArmor] = useState<string | null>(null);
  const prevRoundRef = useRef<number>(1);
  const prevArmorIndexRef = useRef<number>(0);
  const prevEnemyHPRef = useRef<number>(-1);
  const floatIdRef = useRef(0);

  useEffect(() => {
    if (!battleState || battleState.phase !== 'player' || battleState.hand.length > 0) return;
    const timer = setTimeout(() => {
      endTurnAction();
    }, 600);
    return () => clearTimeout(timer);
  }, [battleState?.hand.length, battleState?.phase, endTurnAction]);

  useEffect(() => {
    if (pendingFailureReason) {
      setFailureReason(pendingFailureReason.reason);
      clearPendingFailureReason();
    }
  }, [pendingFailureReason, clearPendingFailureReason]);

  useEffect(() => {
    if (!battleState) return;
    const newArmorIdx = battleState.currentArmorIndex;
    if (newArmorIdx > prevArmorIndexRef.current) {
      setHitFlash('success');
      setTimeout(() => setHitFlash(null), 600);
      addFloatingText('破甲！', 50, 30, '#22c55e');
    }
    prevArmorIndexRef.current = newArmorIdx;
  }, [battleState?.currentArmorIndex]);

  useEffect(() => {
    if (!battleState) return;
    const newHP = battleState.enemyHP;
    if (prevEnemyHPRef.current >= 0 && newHP < prevEnemyHPRef.current) {
      const dmg = prevEnemyHPRef.current - newHP;
      addFloatingText(`-${dmg}`, 50, 25, '#f87171');
    }
    prevEnemyHPRef.current = newHP;
  }, [battleState?.enemyHP]);

  useEffect(() => {
    if (!battleState || !level) return;
    const newRound = battleState.currentRound;
    if (newRound > prevRoundRef.current && battleState.phase === 'player') {
      const actionIdx = (newRound - 2) % level.enemyActions.length;
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

  if (!level || !battleState) return null;

  const currentArmor = level.armorSequence[battleState.currentArmorIndex] ?? null;
  const currentArmorId = currentArmor?.armorId ?? null;
  const armorInfo = currentArmorId ? ARMOR_TYPES[currentArmorId] : null;
  const isGameOver = battleState.phase === 'victory' || battleState.phase === 'defeat';
  const playerHPPercent = (battleState.playerHP / battleState.playerMaxHP) * 100;
  const enemyHPPercent = (battleState.enemyHP / battleState.enemyMaxHP) * 100;

  const addFloatingText = (text: string, x: number, y: number, color: string) => {
    const id = floatIdRef.current++;
    setFloatingTexts(prev => [...prev, { id, text, x, y, color }]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(f => f.id !== id)), 1500);
  };

  const handleCardClick = (cardId: string, idx: number) => {
    if (isGameOver) return;
    if (selectedCardIdx === idx) {
      setSelectedCardIdx(null);
      const res = playCardAction(idx);
      if (res.equation) {
        setLastEquation(res.equation);
        setShowEquation(true);
        setTimeout(() => setShowEquation(false), 2000);
      }
    } else {
      setSelectedCardIdx(idx);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 font-sans overflow-hidden relative select-none">
      <div className="absolute inset-0 pointer-events-none z-50">
        <AnimatePresence>{floatingTexts.map(ft => <motion.div key={ft.id} className="absolute font-black text-2xl drop-shadow-lg" style={{ left: `${ft.x}%`, top: `${ft.y}%`, color: ft.color }} initial={{ opacity: 0, y: 0, scale: 0.5 }} animate={{ opacity: 1, y: -80, scale: 1.2 }} exit={{ opacity: 0 }} transition={{ duration: 1.2, ease: "easeOut" }}>{ft.text}</motion.div>)}</AnimatePresence>
      </div>
      <div className="fixed inset-0 pointer-events-none z-[60]">
        <AnimatePresence>
          {flyingCard && (() => {
            const card = CARD_MAP[flyingCard.cardId];
            const dx = flyingCard.toX - flyingCard.fromX;
            const dy = flyingCard.toY - flyingCard.fromY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
              <motion.div key={flyingCard.id} className="absolute" style={{ left: flyingCard.fromX - 48, top: flyingCard.fromY - 68, width: 96, height: 136, borderRadius: 10, background: `linear-gradient(160deg, rgba(10,18,36,0.98) 0%, rgba(20,32,56,0.98) 100%)`, border: `2px solid ${card?.glowColor ?? '#60a5fa'}`, boxShadow: `0 0 32px ${card?.glowColor ?? '#60a5fa'}80, 0 0 12px ${card?.glowColor ?? '#60a5fa'}40, 0 12px 40px rgba(0,0,0,0.9)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transformOrigin: 'center center', overflow: 'hidden' }} initial={{ opacity: 1, scale: 1.25, rotate: 0 }} animate={{ x: [0, dx * 0.25, dx * 0.7, dx], y: [0, dy * 0.15 - dist * 0.22, dy * 0.65 - dist * 0.08, dy], scale: [1.25, 1.3, 1.0, 0.6], rotate: [0, -8, angle * 0.6, angle * 1.1], opacity: [1, 1, 0.9, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.42, ease: [0.22, 0.61, 0.36, 1] }}>
                <div style={{ fontSize: '2.2rem', lineHeight: 1, color: card?.glowColor ?? '#60a5fa', filter: `drop-shadow(0 0 10px ${card?.glowColor ?? '#60a5fa'})` }}>{card?.symbol ?? card?.id?.slice(0, 2) ?? '?'}</div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
      <div className="relative z-10 flex items-center px-4 py-2" style={{ background: 'linear-gradient(180deg, rgba(2,6,4,0.92) 0%, rgba(2,8,5,0.75) 100%)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={exitBattle} className="text-sm rounded-lg px-2.5 py-1.5 text-white/50 hover:text-white/90">←</button>
        <div className="flex-1 flex flex-col items-center">
          <div className="text-cyan-400 font-black text-xl tracking-widest">ROUND {battleState.currentRound}</div>
        </div>
      </div>
      <div className="flex-1 relative flex flex-col items-center justify-center">
        {/* Boss 区域 */}
        <div className="flex flex-col items-center mb-12">
          <motion.div ref={enemyRef} className="relative" animate={shakeEnemy ? { x: [-10, 10, -10, 10, 0] } : { y: [0, 5, 0] }} transition={{ duration: 0.4 }}>
            <img src={getBossImageUrl(level.id)} style={{ height: '380px', objectFit: 'contain' }} />
          </motion.div>
          {/* Boss 血条对齐 */}
          <div className="mt-4 w-64 flex flex-col items-center">
             <div className="flex items-center gap-2 w-full">
               <div className="flex-1 h-3 rounded-full bg-white/10 border border-white/20 overflow-hidden">
                 <motion.div className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" animate={{ width: `${enemyHPPercent}%` }} />
               </div>
               <span className="text-xs font-mono text-white/80">{battleState.enemyHP}/{battleState.enemyMaxHP}</span>
             </div>
          </div>
        </div>
        {/* 玩家区域：换成兜帽人，去除边框，血条对齐 */}
        <div className="flex flex-col items-center mt-12">
          <motion.div className="relative">
            <img src="/player-character-v2.png" style={{ height: '380px', objectFit: 'contain' }} />
          </motion.div>
          {/* 玩家血条对齐 */}
          <div className="mt-4 w-64 flex flex-col items-center">
             <div className="flex items-center gap-2 w-full">
               <div className="flex-1 h-3 rounded-full bg-white/10 border border-white/20 overflow-hidden">
                 <motion.div className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" animate={{ width: `${playerHPPercent}%` }} />
               </div>
               <span className="text-xs font-mono text-white/80">{battleState.playerHP}/{battleState.playerMaxHP}</span>
             </div>
          </div>
        </div>
      </div>
      <div className="h-[210px] relative z-20 flex flex-col justify-end pb-4">
        <div className="flex justify-center items-end px-12 h-full relative">
          <AnimatePresence mode="popLayout">
            {battleState.hand.map((cardId, idx) => (
              <motion.div key={`hand-${cardId}-${idx}`} layout style={{ marginLeft: idx === 0 ? 0 : '-20px', zIndex: idx + 1 }} onHoverStart={() => setHoveredCard(`${cardId}-${idx}`)} onHoverEnd={() => setHoveredCard(null)} onClick={() => handleCardClick(cardId, idx)}>
                <ElementCardComponent cardId={cardId} size="lg" isSelected={selectedCardIdx === idx} disabled={isGameOver} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
