import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CARD_MAP, ARMOR_TYPES } from '@/lib/cardData';
import { useGame } from '@/contexts/GameContext';
import type { FailureReason } from '@/lib/battleEngine';
import ElementCardComponent from './ElementCard';
import KnowledgeCardModal from './KnowledgeCardModal';
import DiscardPileModal from './DiscardPileModal';
import DrawPileModal from './DrawPileModal';
import BattleResultModal from './BattleResultModal';
import FailureHintModal from './FailureHintModal';
import RoundTransition from './RoundTransition';

const getBossImageUrl = (levelId: number): string => `/bosses/boss_${levelId}.webp`;

const ACTION_COLOR_MAP: Record<string, string> = {
  attack: '#f87171',
  shield: '#60a5fa',
  strengthen: '#fbbf24',
  corrode: '#c084fc',
  heal: '#34d399',
};

const ACTION_DESC_MAP: Record<string, string> = {
  attack: '攻击玩家并造成对应伤害。',
  shield: '为自身添加对应数值的护盾。',
  strengthen: '进行蓄力，使后续攻击更强。',
  corrode: '施加腐蚀类效果，干扰玩家状态。',
  heal: '回复对应数值的生命值。',
};

function renderIntentIcon(actionType: string, color: string, size = 34) {
  const svgProps = { width: size, height: size, viewBox: '0 0 40 40', fill: 'none' as const, xmlns: 'http://www.w3.org/2000/svg' };

  if (actionType === 'attack') {
    return (
      <svg {...svgProps}>
        <line x1="8" y1="32" x2="32" y2="8" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <polygon points="28,8 32,8 32,12" fill={color} />
        <line x1="8" y1="28" x2="12" y2="32" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
        <line x1="32" y1="32" x2="8" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
        <polygon points="12,32 8,32 8,28" fill={color} opacity="0.45" />
      </svg>
    );
  }

  if (actionType === 'shield') {
    return (
      <svg {...svgProps}>
        <path d="M20 5 L32 10 L32 21 C32 28 26 34 20 36 C14 34 8 28 8 21 L8 10 Z" stroke={color} strokeWidth="2.5" fill={`${color}20`} strokeLinejoin="round" />
        <path d="M14 20 L18 24 L26 15" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }

  if (actionType === 'strengthen') {
    return (
      <svg {...svgProps}>
        <polygon points="22,5 12,22 19,22 18,35 28,18 21,18" fill={`${color}30`} stroke={color} strokeWidth="2" strokeLinejoin="round" />
        <line x1="20" y1="8" x2="20" y2="12" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
        <line x1="14" y1="10" x2="16" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
        <line x1="26" y1="10" x2="24" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      </svg>
    );
  }

  if (actionType === 'corrode') {
    return (
      <svg {...svgProps}>
        <path d="M15 8 L15 14 L9 22 L9 32 L31 32 L31 22 L25 14 L25 8 Z" stroke={color} strokeWidth="2" fill={`${color}15`} strokeLinejoin="round" />
        <line x1="13" y1="8" x2="27" y2="8" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M12 24 Q15 20 20 22 Q25 24 28 20" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="16" cy="27" r="2" fill={color} opacity="0.7" />
        <circle cx="24" cy="26" r="1.5" fill={color} opacity="0.5" />
      </svg>
    );
  }

  if (actionType === 'heal') {
    return (
      <svg {...svgProps}>
        <path d="M20 32 C20 32 8 25 8 16 C8 11 11.5 8 15 8 C17 8 18.5 9 20 10.5 C21.5 9 23 8 25 8 C28.5 8 32 11 32 16 C32 25 20 32 20 32Z" stroke={color} strokeWidth="2.2" fill={`${color}20`} strokeLinejoin="round" />
        <line x1="20" y1="12" x2="20" y2="22" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="15" y1="17" x2="25" y2="17" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg {...svgProps}>
      <text x="20" y="26" textAnchor="middle" fill={color} fontSize="18" fontWeight="bold">?</text>
    </svg>
  );
}

interface BattleInfoModalProps {
  title: string;
  subtitle: string;
  accent: string;
  value?: number | string;
  onClose: () => void;
  children: React.ReactNode;
}

function BattleInfoModal({ title, subtitle, accent, value, onClose, children }: BattleInfoModalProps) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[140] flex items-center justify-center p-4"
        style={{ pointerEvents: 'auto', touchAction: 'none' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <button
          type="button"
          aria-label="关闭说明窗口"
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(4px)', border: 'none' }}
          onClick={onClose}
        />
        <motion.div
          className="relative w-full rounded-[24px] overflow-hidden"
          style={{ maxWidth: 300, background: 'rgba(7,12,18,0.97)', border: `1px solid ${accent}55`, boxShadow: `0 16px 48px rgba(0,0,0,0.55), 0 0 22px ${accent}22`, pointerEvents: 'auto' }}
          initial={{ opacity: 0, y: 18, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between" style={{ padding: '16px 16px 10px' }}>
            <div>
              <div style={{ color: accent, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: 6 }}>{subtitle}</div>
              <div style={{ color: 'rgba(255,255,255,0.96)', fontSize: '1rem', fontWeight: 700 }}>{title}</div>
            </div>
            <div className="flex items-center gap-2">
              {value !== undefined && (
                <div style={{ color: accent, fontSize: '0.92rem', fontWeight: 700, textShadow: `0 0 8px ${accent}` }}>{value}</div>
              )}
              <button type="button" aria-label="关闭" onClick={onClose} style={{ width: 28, height: 28, borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.78)' }}>✕</button>
            </div>
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ padding: '14px 16px 18px', color: 'rgba(214,224,234,0.84)', fontSize: '0.78rem', lineHeight: 1.7 }}>
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function BattleScreenMobile() {
  const {
    battleState,
    playCardAction,
    endTurnAction,
    exitBattle,
    restartLevel,
    showKnowledgeCard,
    dismissKnowledgeCard,
    getCurrentLevel,
    pendingFailureReason,
    clearPendingFailureReason,
  } = useGame();

  const level = getCurrentLevel();
  const enemyRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const floatIdRef = useRef(0);
  const flyIdRef = useRef(0);
  const suppressClickUntilRef = useRef(0);

  const [showDiscardPile, setShowDiscardPile] = useState(false);
  const [showDrawPile, setShowDrawPile] = useState(false);
  const [activeInfoModal, setActiveInfoModal] = useState<'intent' | 'shield' | 'hand' | 'log' | 'elements' | 'boss' | null>(null);
  const [failureReason, setFailureReason] = useState<FailureReason | null>(null);
  const [shakeEnemy, setShakeEnemy] = useState(false);
  const [hitFlash, setHitFlash] = useState<'damage' | 'success' | null>(null);
  const [lastEquation, setLastEquation] = useState<string | null>(null);
  const [showEquation, setShowEquation] = useState(false);
  const [playingCardIds, setPlayingCardIds] = useState<Set<string>>(new Set());
  const [floatingTexts, setFloatingTexts] = useState<Array<{ id: number; text: string; x: number; y: number; color: string }>>([]);
  const [flyingCard, setFlyingCard] = useState<{
    id: number;
    cardId: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
  } | null>(null);
  const [impactEffect, setImpactEffect] = useState<{ id: number; x: number; y: number; color: string } | null>(null);
  const [draggingCardIdx, setDraggingCardIdx] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dragOverBoss, setDragOverBoss] = useState(false);
  const [roundTransition, setRoundTransition] = useState<{ visible: boolean; nextRound: number }>({ visible: false, nextRound: 1 });

  // currentArmor 需要在 useEffect 前计算，但 level/battleState 可能为 null
  // 所以这里用 ref 来跟踪当前护甲状态
  const currentArmorRef = useRef<typeof level extends null ? null : ReturnType<typeof level.armorSequence[0]> | null>(null);
  useEffect(() => {
    if (pendingFailureReason) {
      // 只有在有护甲时才显示错误提示，无护甲时直接攻击核心不应弹出错误
      const hasArmor = currentArmorRef.current !== null;
      if (hasArmor) {
        setFailureReason(pendingFailureReason.reason);
      }
      clearPendingFailureReason();
    }
  }, [pendingFailureReason, clearPendingFailureReason]);

  useEffect(() => {
    if (!battleState || battleState.phase !== 'player' || battleState.hand.length > 0) return;
    const timer = setTimeout(() => endTurnAction(), 600);
    return () => clearTimeout(timer);
  }, [battleState?.hand.length, battleState?.phase, endTurnAction]);


  // ── 自动演示接口：暴露给 Playwright 录制脚本 ──
  useEffect(() => {
    (window as any).__autoPlay = {
      getHand: () => battleState?.hand ?? [],
      getPhase: () => battleState?.phase ?? '',
      getEnv: () => battleState?.currentEnv ?? 'normal',
      getArmorIndex: () => battleState?.currentArmorIndex ?? 0,
      getEnemyHP: () => battleState?.enemyHP ?? 0,
      getPlaysThisTurn: () => battleState?.playsThisTurn ?? 0,
      getMaxPlays: () => battleState?.maxPlaysPerTurn ?? 2,
      isGameOver: () => battleState?.phase === 'victory' || battleState?.phase === 'defeat',
      playCard: (cardId: string) => playCardAction(cardId),
      endTurn: () => endTurnAction(),
    };
    return () => { delete (window as any).__autoPlay; };
  });

  if (!level || !battleState) return null;

  const currentArmor = level.armorSequence[battleState.currentArmorIndex] ?? null;
  // 更新 ref 供上方 useEffect 使用
  currentArmorRef.current = currentArmor;
  const currentArmorId = currentArmor?.armorId ?? null;
  const armorInfo = currentArmorId ? ARMOR_TYPES[currentArmorId] : null;
  const isGameOver = battleState.phase === 'victory' || battleState.phase === 'defeat';
  const playerHPPercent = Math.max(0, (battleState.playerHP / battleState.playerMaxHP) * 100);
  const enemyHPPercent = Math.max(0, (battleState.enemyHP / battleState.enemyMaxHP) * 100);
  const nextActionIdx = (battleState.currentRound - 1) % level.enemyActions.length;
  const nextAction = level.enemyActions[nextActionIdx] ?? null;
  const nextActionColor = nextAction ? (ACTION_COLOR_MAP[nextAction.type] ?? '#e5e7eb') : '#e5e7eb';
  const nextActionDesc = nextAction ? (ACTION_DESC_MAP[nextAction.type] ?? nextAction.label) : '';
  const visibleCards = useMemo(() => Array.from(new Set([...battleState.hand, ...battleState.drawPile, ...battleState.discardPile])), [battleState.hand, battleState.drawPile, battleState.discardPile]);

  const addFloatingText = (text: string, x: number, y: number, color: string) => {
    const id = floatIdRef.current++;
    setFloatingTexts(prev => [...prev, { id, text, x, y, color }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(item => item.id !== id));
    }, 1400);
  };

  const triggerPlayAnimation = (cardId: string, cardEl: HTMLElement | null) => {
    const card = CARD_MAP[cardId];
    const glowColor = card?.glowColor ?? '#9fd3ff';
    const viewportRect = document.getElementById('device-screen')?.getBoundingClientRect()
      ?? document.getElementById('root')?.getBoundingClientRect();

    let fromX = viewportRect ? viewportRect.left + viewportRect.width / 2 : window.innerWidth / 2;
    let fromY = viewportRect ? viewportRect.top + viewportRect.height * 0.85 : window.innerHeight * 0.85;
    if (cardEl) {
      const rect = cardEl.getBoundingClientRect();
      fromX = rect.left + rect.width / 2;
      fromY = rect.top + rect.height / 2;
    }

    let toX = viewportRect ? viewportRect.left + viewportRect.width / 2 : window.innerWidth / 2;
    let toY = viewportRect ? viewportRect.top + viewportRect.height * 0.34 : window.innerHeight * 0.34;
    if (enemyRef.current) {
      const rect = enemyRef.current.getBoundingClientRect();
      toX = rect.left + rect.width / 2;
      toY = rect.top + rect.height / 2;
    }

    const id = flyIdRef.current++;
    setFlyingCard({ id, cardId, fromX, fromY, toX, toY });

    setTimeout(() => {
      setFlyingCard(null);
      setImpactEffect({ id, x: toX, y: toY, color: glowColor });
      addFloatingText('命中', 50, 34, '#f8fafc');
      setShakeEnemy(true);
      setHitFlash('damage');
      setTimeout(() => {
        setImpactEffect(null);
        setShakeEnemy(false);
        setHitFlash(null);
      }, 520);
    }, 360);
  };

  const handleCardPlay = (cardId: string, idx: number) => {
    if (isGameOver || battleState.phase !== 'player') return;
    if (playingCardIds.has(cardId)) return;
    if (battleState.playsThisTurn >= battleState.maxPlaysPerTurn) return;
    const card = CARD_MAP[cardId];
    if (card && card.energyCost && battleState.energy < card.energyCost) return;
    setPlayingCardIds(prev => new Set(prev).add(cardId));
    setTimeout(() => {
      setPlayingCardIds(prev => { const s = new Set(prev); s.delete(cardId); return s; });
    }, 600);
    if (card?.reactionEquation) {
      setLastEquation(card.reactionEquation);
      setShowEquation(true);
      setTimeout(() => setShowEquation(false), 2400);
    }
    const cardEl = cardRefs.current.get(idx);
    triggerPlayAnimation(cardId, cardEl ?? null);
    playCardAction(cardId);
  };

  const handleCardClick = (cardId: string, idx: number) => {
    if (Date.now() < suppressClickUntilRef.current) return;
    if (draggingCardIdx !== null) return;
    handleCardPlay(cardId, idx);
  };

  const handleDragStart = (idx: number) => {
    if (isGameOver || battleState.phase !== 'player') return;
    setDraggingCardIdx(idx);
    setDragPos(null);
    setDragOverBoss(false);
  };

  const handleDragMove = (_event: MouseEvent | TouchEvent | PointerEvent, info: { point: { x: number; y: number } }) => {
    setDragPos({ x: info.point.x, y: info.point.y });
    if (!enemyRef.current) return;

    const rect = enemyRef.current.getBoundingClientRect();
    const padding = 30;
    const isOver = info.point.x >= rect.left - padding
      && info.point.x <= rect.right + padding
      && info.point.y >= rect.top - padding
      && info.point.y <= rect.bottom + padding;
    setDragOverBoss(isOver);
  };

  const handleDragEnd = (idx: number, cardId: string, info: { point: { x: number; y: number } }) => {
    const point = info.point ?? dragPos;
    suppressClickUntilRef.current = Date.now() + 220;

    let shouldPlay = false;
    if (point) {
      const deviceRect = document.getElementById('device-screen')?.getBoundingClientRect()
        ?? document.getElementById('root')?.getBoundingClientRect();
      const handZoneTop = deviceRect ? deviceRect.bottom - 120 : window.innerHeight - 120; // 优化判定：只要向上拖拽超过手牌区 120px 即可判定为出牌

      let releasedOverBoss = false;
      if (enemyRef.current) {
        const rect = enemyRef.current.getBoundingClientRect();
        const padding = 34;
        releasedOverBoss = point.x >= rect.left - padding
          && point.x <= rect.right + padding
          && point.y >= rect.top - padding
          && point.y <= rect.bottom + padding;
      }

      shouldPlay = releasedOverBoss || point.y < handZoneTop;
    }

    setDraggingCardIdx(null);
    setDragPos(null);
    setDragOverBoss(false);

    if (shouldPlay) {
      handleCardPlay(cardId, idx);
    }
  };

  const handCount = battleState.hand.length;
  const fanStep = handCount > 1 ? 13 : 0;
  const centerOffset = (handCount - 1) / 2;
  const handSpacing = handCount >= 5 ? 42 : handCount === 4 ? 48 : 58;
  const handDrop = handCount >= 5 ? 10 : 7;

  return (
    <div
      className="absolute inset-0 h-full overflow-hidden"
      style={{
        backgroundImage: "url('/bg-battle-mobile-iqoo-v1.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#05090c',
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(180deg, rgba(0,0,0,0.32) 0%, rgba(4,10,14,0.22) 16%, rgba(3,12,16,0.34) 42%, rgba(2,10,12,0.58) 74%, rgba(0,0,0,0.86) 100%),
            radial-gradient(circle at 50% 22%, rgba(92,180,210,0.18), transparent 26%),
            radial-gradient(circle at 50% 72%, rgba(100,140,170,0.12), transparent 34%),
            linear-gradient(180deg, rgba(7,14,18,0.00) 0%, rgba(7,14,18,0.18) 100%)
          `,
        }}
      />

      <div className="absolute inset-0 pointer-events-none z-[60]">
        <AnimatePresence>
          {floatingTexts.map(item => (
            <motion.div
              key={item.id}
              className="absolute font-black text-sm select-none"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                color: item.color,
                textShadow: '0 0 12px rgba(255,255,255,0.45), 0 2px 6px rgba(0,0,0,0.85)',
              }}
              initial={{ opacity: 1, y: 0, scale: 0.9 }}
              animate={{ opacity: 0, y: -36, scale: 1.15 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            >
              {item.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="absolute inset-0 pointer-events-none z-[65]">
        <AnimatePresence>
          {flyingCard && (() => {
            const card = CARD_MAP[flyingCard.cardId];
            const dx = flyingCard.toX - flyingCard.fromX;
            const dy = flyingCard.toY - flyingCard.fromY;
            return (
              <motion.div
                key={flyingCard.id}
                className="absolute"
                style={{
                  left: flyingCard.fromX - 40,
                  top: flyingCard.fromY - 54,
                  width: 80,
                  height: 108,
                  borderRadius: 12,
                  background: 'linear-gradient(180deg, rgba(18,24,32,0.98) 0%, rgba(6,14,20,0.96) 100%)',
                  border: `1.5px solid ${card?.glowColor ?? '#9fd3ff'}`,
                  boxShadow: `0 0 24px ${(card?.glowColor ?? '#9fd3ff')}55, 0 10px 24px rgba(0,0,0,0.65)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '1.7rem',
                  fontWeight: 700,
                }}
                initial={{ opacity: 1, scale: 1.04, rotate: 0 }}
                animate={{
                  x: [0, dx * 0.35, dx],
                  y: [0, dy * 0.22 - 48, dy],
                  scale: [1.04, 1.1, 0.62],
                  rotate: [0, -10, 10],
                  opacity: [1, 1, 0],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.36, ease: [0.22, 0.61, 0.36, 1] }}
              >
                {card?.symbol ?? card?.id?.slice(0, 2) ?? '?'}
              </motion.div>
            );
          })()}
        </AnimatePresence>

        <AnimatePresence>
          {impactEffect && (
            <motion.div
              key={impactEffect.id}
              className="absolute rounded-full"
              style={{
                left: impactEffect.x - 44,
                top: impactEffect.y - 44,
                width: 88,
                height: 88,
                border: `2px solid ${impactEffect.color}`,
                boxShadow: `0 0 32px ${impactEffect.color}66`,
              }}
              initial={{ scale: 0.2, opacity: 1 }}
              animate={{ scale: 2.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.46, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showEquation && lastEquation && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 z-50"
            style={{ top: 96 }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div
              style={{
                background: 'rgba(12,26,30,0.88)',
                border: '1px solid rgba(255,255,255,0.16)',
                color: 'rgba(255,255,255,0.92)',
                borderRadius: 999,
                padding: '8px 14px',
                fontSize: '0.78rem',
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
                backdropFilter: 'blur(8px)',
              }}
            >
              {lastEquation}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-col" style={{ height: '100%', paddingLeft: 12, paddingRight: 12, paddingTop: 14, paddingBottom: 0 }}>
        {/* ===== 顶部状态栏：分三行布局 ===== */}
        <div className="relative z-30" style={{ paddingBottom: 6 }}>

          {/* 第一行：退出按鈕 + 回合数居中 + 手牌/日志按鈕 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {/* 左：退出按鈕 */}
            <button
              onClick={exitBattle}
              style={{
                width: 36,
                height: 36,
                flexShrink: 0,
                borderRadius: 12,
                background: 'rgba(8,14,18,0.74)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.96)',
                fontSize: '1.5rem',
                lineHeight: 1,
                backdropFilter: 'blur(12px)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.28)',
              }}
            >
              ←
            </button>

            {/* 中：回合数 + 目标文字 */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.96)', fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1.2 }}>
                回合 {battleState.currentRound} / {level.maxRounds}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.62rem', marginTop: 2, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {level.objective}
              </div>
            </div>

            {/* 右：手牌 + 日志按鈕（水平排列） */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => setActiveInfoModal('hand')}
                style={{
                  height: 36,
                  borderRadius: 12,
                  background: 'rgba(8,14,18,0.76)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '0 10px',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 6px 14px rgba(0,0,0,0.22)',
                  whiteSpace: 'nowrap',
                }}
              >
                手牌 {battleState.hand.length}
              </button>
              <button
                onClick={() => setActiveInfoModal('log')}
                style={{
                  height: 36,
                  borderRadius: 12,
                  background: 'rgba(8,14,18,0.76)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.82)',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '0 10px',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 6px 14px rgba(0,0,0,0.22)',
                }}
              >
                日志
              </button>
            </div>
          </div>

          {/* 第二行：分隔线 */}
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)', margin: '6px 0' }} />

          {/* 第三行：能量条（左）+ 环境状态槽（右） */}
          {(() => {
            const env = battleState.currentEnv ?? 'normal';
            const envConfig: Record<string, { icon: string; label: string; color: string; border: string; bg: string }> = {
              ignite: { icon: '🔥', label: '点燃', color: '#fb923c', border: 'rgba(251,146,60,0.50)', bg: 'rgba(251,146,60,0.12)' },
              heat:   { icon: '△', label: '加热', color: '#fbbf24', border: 'rgba(251,191,36,0.50)', bg: 'rgba(251,191,36,0.12)' },
              aqueous:{ icon: '💧', label: '水溶液', color: '#60a5fa', border: 'rgba(96,165,250,0.50)', bg: 'rgba(96,165,250,0.12)' },
              normal: { icon: '🌡️', label: '常温', color: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.12)', bg: 'rgba(255,255,255,0.04)' },
            };
            const cfg = envConfig[env] ?? envConfig.normal;
            const energy = battleState.energy ?? 3;
            const maxEnergy = battleState.maxEnergy ?? 3;
            return (
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>

                {/* 能量条 */}
                <div style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.10) 0%, rgba(0,0,0,0.30) 100%)',
                  borderRadius: 10,
                  padding: '5px 8px',
                  border: '1px solid rgba(251,191,36,0.28)',
                  backdropFilter: 'blur(8px)',
                  minHeight: 38,
                }}>
                  <span style={{ fontSize: '0.55rem', color: 'rgba(251,191,36,0.65)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>能量</span>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                    {Array.from({ length: maxEnergy }).map((_, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: '0.82rem',
                          lineHeight: 1,
                          opacity: i < energy ? 1 : 0.15,
                          filter: i < energy ? 'drop-shadow(0 0 5px rgba(251,191,36,0.9))' : 'none',
                          transition: 'opacity 0.25s, filter 0.25s',
                        }}
                      >⚡</span>
                    ))}
                  </div>
                  <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.38)', fontWeight: 600 }}>{energy}/{maxEnergy}</span>
                </div>

                {/* 环境状态槽 */}
                <div style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                  background: `linear-gradient(135deg, ${cfg.bg} 0%, rgba(0,0,0,0.30) 100%)`,
                  borderRadius: 10,
                  padding: '5px 8px',
                  border: `1px solid ${cfg.border}`,
                  backdropFilter: 'blur(8px)',
                  transition: 'border-color 0.35s, background 0.35s',
                  minHeight: 38,
                }}>
                  <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.45)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>环境</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>{cfg.icon}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: cfg.color, lineHeight: 1 }}>{cfg.label}</span>
                  </div>
                  {battleState.envRoundsLeft > 0 ? (
                    <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1 }}>剩 {battleState.envRoundsLeft} 回合</span>
                  ) : (
                    <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.22)', lineHeight: 1 }}>无特效</span>
                  )}
                </div>

              </div>
            );
          })()}
        </div>

        <div className="relative" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div
            className="absolute left-0 right-0"
            style={{
              top: 34,
              bottom: 156,
              background: 'radial-gradient(ellipse at 50% 50%, rgba(120,176,198,0.14) 0%, rgba(30,52,60,0.07) 34%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <motion.div
            ref={enemyRef}
            className="absolute left-1/2 -translate-x-1/2 z-10"
            style={{ top: 30, width: '56%', maxWidth: 214, height: 214 }}
            animate={shakeEnemy ? { x: [-8, 8, -6, 6, 0] } : { y: [0, -6, 0, 4, 0] }}
            transition={shakeEnemy ? { duration: 0.42 } : { duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {nextAction && (
              <button
                onClick={() => setActiveInfoModal('intent')}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: -12,
                  transform: 'translateX(-50%)',
                  minWidth: 46,
                  height: 40,
                  borderRadius: 14,
                  background: 'rgba(8,14,18,0.78)',
                  border: 'none',
                  color: nextActionColor,
                  padding: '5px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 10px 22px rgba(0,0,0,0.30)',
                  zIndex: 35,
                }}
              >
                <div style={{ transform: 'scale(0.62)', lineHeight: 0 }}>{renderIntentIcon(nextAction.type, nextActionColor, 34)}</div>
                <div style={{ fontSize: '0.64rem', fontWeight: 700, marginTop: -4, textShadow: `0 0 8px ${nextActionColor}` }}>{nextAction.value}</div>
              </button>
            )}
            <AnimatePresence>
              {draggingCardIdx !== null && dragOverBoss && (
                <motion.div
                  className="absolute inset-0"
                  style={{
                    borderRadius: 48,
                    border: '2px dashed rgba(103,232,249,0.88)',
                    background: 'radial-gradient(circle, rgba(103,232,249,0.18) 0%, rgba(103,232,249,0.05) 45%, transparent 78%)',
                    boxShadow: '0 0 26px rgba(103,232,249,0.34)',
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1.04 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                />
              )}
              {hitFlash === 'damage' && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.28), transparent 70%)' }}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1.18 }}
                  exit={{ opacity: 0 }}
                />
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => setActiveInfoModal('boss')}
              style={{ display: 'block', width: '100%', height: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              title="查看 Boss 信息"
            >
              <img
                src={getBossImageUrl(level.id)}
                alt={level.enemyName}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center bottom',
                  filter: 'drop-shadow(0 0 26px rgba(255,255,255,0.24))',
                }}
              />
            </button>
          </motion.div>

          <div
            className="absolute left-1/2 -translate-x-1/2 z-20"
            style={{ top: 238, width: '74%', maxWidth: 252 }}
          >
            <div style={{ color: 'rgba(255,255,255,0.86)', fontSize: '0.64rem', fontWeight: 600, textAlign: 'center', marginBottom: 3 }}>
              {level.enemyName}
            </div>

            <div
              style={{
                position: 'relative',
                height: 18,
                borderRadius: 999,
                background: 'rgba(90,12,12,0.16)',
                overflow: 'visible',
                padding: 2,
                boxShadow: '0 0 0 1px rgba(255,80,80,0.18)',
              }}
            >
              {/* 血条进度 */}
              <motion.div
                style={{
                  height: '100%',
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, #ff2222 0%, #ff5050 100%)',
                  boxShadow: '0 0 16px rgba(255,56,56,0.26)',
                }}
                animate={{ width: `${enemyHPPercent}%` }}
                transition={{ duration: 0.35 }}
              />
              {/* 护甲标签：直接覆盖在血条中间 */}
              {currentArmor && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'rgba(20,40,80,0.88)',
                    border: '1px solid rgba(96,165,250,0.60)',
                    borderRadius: 999,
                    padding: '0px 8px',
                    height: 14,
                    boxShadow: '0 0 8px rgba(96,165,250,0.30)',
                  }}>
                    <svg width="9" height="9" viewBox="0 0 20 20" fill="none">
                      <path d="M10 2L17 5.5V11C17 15 13.5 18 10 19C6.5 18 3 15 3 11V5.5L10 2Z" fill="rgba(96,165,250,0.22)" stroke="#60a5fa" strokeWidth="2" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#93c5fd', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                      {currentArmor.label ?? currentArmor.armorId}
                    </span>
                  </div>
                </div>
              )}
              {/* 无护甲时显示敌人护盾数値 */}
              {!currentArmor && battleState.enemyShield > 0 && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    background: 'rgba(30,58,100,0.88)',
                    border: '1px solid rgba(96,165,250,0.55)',
                    borderRadius: 999,
                    padding: '0px 7px',
                    height: 14,
                    boxShadow: '0 0 8px rgba(59,130,246,0.28)',
                  }}>
                    <svg width="9" height="9" viewBox="0 0 20 20" fill="none">
                      <path d="M10 2L17 5.5V11C17 15 13.5 18 10 19C6.5 18 3 15 3 11V5.5L10 2Z" fill="rgba(96,165,250,0.22)" stroke="#60a5fa" strokeWidth="2" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#bfdbfe', letterSpacing: '0.02em' }}>
                      {battleState.enemyShield}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative z-20" style={{ paddingTop: 2, paddingBottom: 0 }}>
          <div className="flex items-center gap-2 px-1" style={{ marginTop: 0, marginBottom: 0 }}>
            <div style={{ color: 'rgba(255,255,255,0.94)', fontSize: '0.95rem', minWidth: 24 }}>HP</div>
            <div
              className="flex-1"
              style={{
                height: 18,
                borderRadius: 999,
                padding: 2,
                background: 'rgba(255,255,255,0.18)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.18)',
                position: 'relative',
              }}
            >
              <motion.div
                style={{
                  height: '100%',
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.96), rgba(230,230,230,0.96))',
                }}
                animate={{ width: `${playerHPPercent}%` }}
                transition={{ duration: 0.35 }}
              />
              {battleState.playerShield > 0 && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    background: 'rgba(96,165,250,0.22)',
                    border: '1px solid rgba(96,165,250,0.55)',
                    borderRadius: 999,
                    padding: '0px 7px',
                    height: 14,
                  }}>
                    <span style={{ fontSize: '0.55rem', color: '#93c5fd' }}>🛡</span>
                    <span style={{ fontSize: '0.60rem', fontWeight: 700, color: '#bfdbfe', letterSpacing: '0.02em' }}>
                      {battleState.playerShield}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                if (!isGameOver && battleState.phase === 'player') {
                  setRoundTransition({ visible: true, nextRound: battleState.currentRound + 1 });
                }
              }}
              style={{
                minWidth: 96,
                height: 32,
                borderRadius: 999,
                background: isGameOver || battleState.phase !== 'player'
                  ? 'rgba(40,46,44,0.7)'
                  : 'rgba(54,62,58,0.92)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: isGameOver || battleState.phase !== 'player'
                  ? 'rgba(255,255,255,0.38)'
                  : 'rgba(255,255,255,0.96)',
                fontSize: '0.92rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                flexShrink: 0,
              }}
            >
              结束回合
            </button>
          </div>

          <div className="relative" style={{ height: 190, marginTop: 0 }}>
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pointer-events-none">
              {battleState.hand.map((cardId, idx) => {
                const rotation = (idx - centerOffset) * fanStep;
                const shiftX = (idx - centerOffset) * handSpacing;
                const shiftY = Math.abs(idx - centerOffset) * handDrop;
                const zIndex = idx + 10;

                return (
                  <motion.div
                    key={`${cardId}-${idx}`}
                    ref={el => {
                      if (el) cardRefs.current.set(idx, el as HTMLDivElement);
                      else cardRefs.current.delete(idx);
                    }}
                    className="absolute pointer-events-auto"
                    style={{
                      left: '50%',
                      bottom: -34,
                      marginLeft: -48,
                      zIndex: draggingCardIdx === idx ? 90 : zIndex,
                      transformOrigin: 'center bottom',
                      touchAction: 'none',
                    }}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0, x: shiftX, rotate: draggingCardIdx === idx ? 0 : rotation, scale: draggingCardIdx === idx ? 1.04 : 1 }}
                    exit={{ opacity: 0, y: 30 }}
                    whileTap={{ y: -12, scale: 1.02 }}
                    whileDrag={{ scale: 1.08, y: -54, rotate: 0 }}
                    drag={!isGameOver && battleState.phase === 'player'}
                    dragElastic={0.14}
                    dragMomentum={false}
                    dragSnapToOrigin
                    onDragStart={() => handleDragStart(idx)}
                    onDrag={handleDragMove}
                    onDragEnd={(_event, info) => handleDragEnd(idx, cardId, info)}
                    transition={{ duration: 0.28 }}
                  >
                    <div style={{ transform: `translateY(${shiftY}px)` }}>
                      <ElementCardComponent
                        cardId={cardId}
                        size="md"
                        onClick={() => handleCardClick(cardId, idx)}
                        currentArmorId={currentArmorId ?? undefined}
                        currentArmorLabel={currentArmor?.label ?? currentArmorId ?? undefined}
                        isSelected={false}
                        disabled={isGameOver || battleState.phase !== 'player' || battleState.playsThisTurn >= battleState.maxPlaysPerTurn || playingCardIds.has(cardId)}
                        hiddenGuideMode={level.id >= 5}
                        bossWeakToCards={level.bossTraits?.weakToCards}
                        bossImmuneCards={level.bossTraits?.immuneToCards}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activeInfoModal === 'intent' && nextAction && (
          <BattleInfoModal
            title={nextAction.label}
            subtitle="Enemy Intent"
            accent={nextActionColor}
            value={nextAction.value}
            onClose={() => setActiveInfoModal(null)}
          >
            <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {renderIntentIcon(nextAction.type, nextActionColor, 36)}
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.94)', fontWeight: 700, marginBottom: 4 }}>{nextAction.label}</div>
                <div style={{ color: 'rgba(255,255,255,0.52)', fontSize: '0.7rem' }}>下一回合敌人计划执行的动作</div>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>{nextActionDesc}</div>
            <div style={{ color: 'rgba(148,163,184,0.82)', fontSize: '0.72rem' }}>
              数值 <span style={{ color: nextActionColor, fontWeight: 700 }}>{nextAction.value}</span>，点击关闭后可继续战斗。
            </div>
          </BattleInfoModal>
        )}
        {activeInfoModal === 'shield' && (
          <BattleInfoModal
            title={currentArmor?.label ?? currentArmorId ?? '当前护甲'}
            subtitle="Shield Layer"
            accent="#60a5fa"
            value={battleState.enemyShield}
            onClose={() => setActiveInfoModal(null)}
          >
            <div style={{ color: 'rgba(255,255,255,0.94)', fontWeight: 700, marginBottom: 8 }}>
              护盾数值：<span style={{ color: '#60a5fa' }}>{battleState.enemyShield}</span>
            </div>
            <div style={{ marginBottom: 10 }}>
              {armorInfo?.name ? `${armorInfo.name} 护甲层仍在生效。` : '当前护甲层仍在生效。'} 只有满足正确反应条件时，才能继续削减或击破它。
            </div>
            <div style={{ color: 'rgba(148,163,184,0.82)', fontSize: '0.72rem' }}>
              点击血条上的护盾图标即可随时查看本层护盾说明，关闭后可继续战斗。
            </div>
          </BattleInfoModal>
        )}
        {activeInfoModal === 'boss' && (
          <BattleInfoModal
            title={level.enemyName}
            subtitle="Boss Info"
            accent="#a78bfa"
            onClose={() => setActiveInfoModal(null)}
          >
            {/* 护甲信息 */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '0.68rem', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.12em' }}>当前护甲</div>
              {currentArmor ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.22)' }}>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2L17 5.5V11C17 15 13.5 18 10 19C6.5 18 3 15 3 11V5.5L10 2Z" fill="rgba(96,165,250,0.22)" stroke="#60a5fa" strokeWidth="1.8" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ color: '#93c5fd', fontWeight: 700, fontFamily: 'monospace' }}>{currentArmor.label ?? currentArmor.armorId}</span>
                  {armorInfo?.name && <span style={{ color: 'rgba(255,255,255,0.52)', fontSize: '0.72rem' }}>{armorInfo.name}</span>}
                </div>
              ) : (
                <div style={{ color: 'rgba(74,222,128,0.88)', fontSize: '0.78rem', padding: '8px 12px', borderRadius: 10, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)' }}>
                  所有护甲已破除，核心裸露！
                </div>
              )}
            </div>
            {/* 弱点 */}
            {level.bossTraits?.weakToCards?.length ? (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '0.68rem', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.12em' }}>弱点元素</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {level.bossTraits.weakToCards.map(c => (
                    <span key={c} style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.35)', color: '#4ade80', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.78rem' }}>
                      ⚡ {c}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {/* 免疫 */}
            {level.bossTraits?.immuneToCards?.length ? (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '0.68rem', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.12em' }}>免疫元素</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {level.bossTraits.immuneToCards.map(c => (
                    <span key={c} style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.30)', color: '#f87171', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.78rem' }}>
                      🛡 {c}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {/* 特殊机制说明 */}
            {level.bossTraits && (
              <div>
                <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '0.68rem', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Boss 特性</div>
                <div style={{ color: 'rgba(214,224,234,0.82)', fontSize: '0.75rem', lineHeight: 1.7, padding: '8px 12px', borderRadius: 10, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}>
                  {level.bossTraits.armorRegen ? '🔄 护甲再生：每隔几回合会修复一层护甲。' : ''}
                  {level.bossTraits.activityLock ? '🔒 活动性锁定：必须使用活动性更强的金属才能破甲。' : ''}
                  {level.bossTraits.redoxArmor ? '⚡ 氧化还原：护甲分氧化态和还原态，需区分氧化剂与还原剂。' : ''}
                  {!level.bossTraits.armorRegen && !level.bossTraits.activityLock && !level.bossTraits.redoxArmor ? '无特殊机制。' : ''}
                </div>
              </div>
            )}
          </BattleInfoModal>
        )}
        {activeInfoModal === 'hand' && (
          <BattleInfoModal
            title="当前手牌"
            subtitle="Hand"
            accent="#e2e8f0"
            value={battleState.hand.length}
            onClose={() => setActiveInfoModal(null)}
          >
            <div style={{ display: 'grid', gap: 8 }}>
              {battleState.hand.map((cardId, index) => {
                const card = CARD_MAP[cardId];
                return (
                  <div key={`${cardId}-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>{card?.symbol ?? '·'} {card?.name ?? cardId}</div>
                    <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: '0.7rem' }}>{card?.coreDamage ?? 0} 伤害</div>
                  </div>
                );
              })}
              {battleState.hand.length === 0 && <div style={{ color: 'rgba(148,163,184,0.82)' }}>当前手牌为空。</div>}
            </div>
          </BattleInfoModal>
        )}
        {activeInfoModal === 'log' && (
          <BattleInfoModal
            title="战斗日志"
            subtitle="Battle Log"
            accent="#f8fafc"
            onClose={() => setActiveInfoModal(null)}
          >
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '0.68rem', marginBottom: 4 }}>当前回合</div>
                <div style={{ color: 'rgba(255,255,255,0.92)', fontWeight: 700 }}>第 {battleState.currentRound} / {level.maxRounds} 回合</div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '0.68rem', marginBottom: 4 }}>目标</div>
                <div style={{ color: 'rgba(255,255,255,0.88)' }}>{level.objective}</div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '0.68rem', marginBottom: 4 }}>当前护甲</div>
                <div style={{ color: '#93c5fd', fontWeight: 700 }}>{currentArmor?.label ?? currentArmorId ?? '无'}</div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '0.68rem', marginBottom: 4 }}>最近方程式</div>
                <div style={{ color: lastEquation ? '#6ee7b7' : 'rgba(255,255,255,0.56)', fontFamily: 'monospace' }}>{lastEquation ?? '暂无'}</div>
              </div>
              {level.bossTraits?.traitDescription && (
                <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}>
                  <div style={{ color: 'rgba(251,191,36,0.65)', fontSize: '0.68rem', marginBottom: 4 }}>Boss 特性</div>
                  <div style={{ color: 'rgba(253,230,138,0.88)', fontSize: '0.72rem', lineHeight: 1.6 }}>{level.bossTraits.traitDescription}</div>
                </div>
              )}
            </div>
          </BattleInfoModal>
        )}
        {activeInfoModal === 'elements' && (
          <motion.div
            className="fixed inset-0 z-[135]"
            style={{ pointerEvents: 'auto' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="关闭元素速查侧栏"
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.42)', border: 'none' }}
              onClick={() => setActiveInfoModal(null)}
            />
            <motion.div
              className="absolute top-0 right-0 h-full"
              style={{
                width: '62%',
                maxWidth: 246,
                background: 'linear-gradient(180deg, rgba(6,15,20,0.98) 0%, rgba(8,20,26,0.98) 100%)',
                borderLeft: '1px solid rgba(103,232,249,0.18)',
                boxShadow: '-14px 0 34px rgba(0,0,0,0.38)',
                display: 'flex',
                flexDirection: 'column',
                padding: '18px 14px 14px',
              }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between" style={{ marginBottom: 12 }}>
                <div>
                  <div style={{ color: '#67e8f9', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 6 }}>Compendium</div>
                  <div style={{ color: 'rgba(255,255,255,0.96)', fontSize: '1rem', fontWeight: 800 }}>元素速查</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem', marginTop: 4 }}>侧栏打开期间，战斗主界面不响应点击。</div>
                </div>
                <button type="button" aria-label="关闭" onClick={() => setActiveInfoModal(null)} style={{ width: 28, height: 28, borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.78)' }}>✕</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 11px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 12 }}>
                <span style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.72rem' }}>已发现元素</span>
                <span style={{ color: '#67e8f9', fontWeight: 800 }}>{visibleCards.length}</span>
              </div>
              <div style={{ display: 'grid', gap: 8, overflowY: 'auto', paddingRight: 2 }}>
                {visibleCards.map(cardId => {
                  const card = CARD_MAP[cardId];
                  return (
                    <div key={cardId} style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ color: 'rgba(255,255,255,0.92)', fontWeight: 700 }}>{card?.symbol ?? '·'} {card?.name ?? cardId}</div>
                        <div style={{ color: '#67e8f9', fontSize: '0.72rem', fontWeight: 700 }}>{card?.coreDamage ?? 0}</div>
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: '0.68rem', lineHeight: 1.55 }}>{card?.description ?? '暂无说明'}</div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <KnowledgeCardModal card={showKnowledgeCard} onClose={dismissKnowledgeCard} />

      <DiscardPileModal
        isOpen={showDiscardPile}
        onClose={() => setShowDiscardPile(false)}
        discardPile={battleState.discardPile}
        onSelectCard={() => undefined}
        isRecoverMode={false}
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

      <RoundTransition
        visible={roundTransition.visible}
        nextRound={roundTransition.nextRound}
        maxRounds={level.maxRounds}
        onComplete={() => {
          setRoundTransition(prev => ({ ...prev, visible: false }));
          endTurnAction();
        }}
      />
      <FailureHintModal reason={failureReason} onClose={() => setFailureReason(null)} />
    </div>
  );
}
