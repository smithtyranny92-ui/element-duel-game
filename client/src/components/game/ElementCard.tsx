// 元素卡牌组件 — 严格参考效果图设计
// 效果图特征：黑色背景、左上角伤害数字、中央大号发光元素符号、底部中文名

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FAMILY_COLORS, FAMILY_NAMES, CARD_MAP, ARMOR_TYPES } from '../../lib/cardData';
import { canBreakArmor } from '../../lib/battleEngine';

interface ElementCardProps {
  cardId: string;
  isPlayable?: boolean;
  isHighlighted?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  onDiscard?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showBack?: boolean;
  currentArmorId?: string;
  currentArmorLabel?: string;
  disabled?: boolean;
  isWaitingRecover?: boolean;
  hiddenGuideMode?: boolean;
  bossWeakToCards?: string[];
  bossImmuneCards?: string[];
}

const SKILL_ICONS: Record<string, string> = {
  none: '',
  shield: '🛡️',
  catalyze: '⚡',
  reveal: '🔍',
  recover: '♻️',
  neutralize: '⚖️',
  displace: '🔄',
  explode: '💥',
  corrode: '🧪',
  universal: '💧',
  setEnv: '🌡️',
};

const SKILL_NAMES: Record<string, string> = {
  none: '',
  shield: '护盾',
  catalyze: '催化',
  reveal: '侦查',
  recover: '回收',
  neutralize: '中和',
  displace: '置换',
  explode: '爆炸',
  corrode: '腐蚀',
  universal: '万能',
  setEnv: '环境',
};

const ENV_ICONS: Record<string, string> = {
  ignite: '🔥',
  heat: '△',
  aqueous: '💧',
  normal: '•',
};

const ENV_LABELS: Record<string, string> = {
  ignite: '点燃',
  heat: '加热',
  aqueous: '水溶液',
  normal: '常温',
};

const ENV_BORDER_COLORS: Record<string, string> = {
  ignite: 'rgba(251,146,60,0.7)',
  heat: 'rgba(251,191,36,0.7)',
  aqueous: 'rgba(96,165,250,0.7)',
  normal: 'rgba(255,255,255,0.15)',
};

const ENV_GLOW_COLORS: Record<string, string> = {
  ignite: '#fb923c',
  heat: '#fbbf24',
  aqueous: '#60a5fa',
  normal: 'rgba(255,255,255,0.4)',
};

export default function ElementCardComponent({
  cardId,
  isPlayable = true,
  isHighlighted,
  isSelected,
  onClick,
  onDiscard,
  size = 'md',
  showBack = false,
  currentArmorId,
  currentArmorLabel,
  disabled = false,
  isWaitingRecover = false,
  hiddenGuideMode = false,
  bossWeakToCards,
  bossImmuneCards,
}: ElementCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const card = CARD_MAP[cardId];
  if (!card) return null;

  const colors = FAMILY_COLORS[card.family];
  const canBreak = currentArmorId ? canBreakArmor(cardId, currentArmorId) : false;
  const isWeak = bossWeakToCards?.includes(cardId) ?? false;
  const isImmune = bossImmuneCards?.includes(cardId) ?? false;

  // 尺寸定义（参考效果图比例：宽高约 2:3）
  const sizeMap = {
    sm: { w: 64, h: 96, symbolSize: '1.4rem', nameSize: '7px', damageSize: '10px' },
    md: { w: 96, h: 144, symbolSize: '2.2rem', nameSize: '10px', damageSize: '13px' },
    lg: { w: 175, h: 270, symbolSize: '3.8rem', nameSize: '13px', damageSize: '18px' },
  };
  const sz = sizeMap[size];

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const startLongPress = () => {
    if (disabled || size === 'sm') return;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setShowTooltip(true);
    }, 420);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCardActivate = () => {
    if (disabled) return;
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    onClick?.();
  };

  if (showBack) {
    return (
      <div
        style={{
          width: sz.w, height: sz.h,
          borderRadius: '10px',
          background: 'linear-gradient(160deg, #0a1018 0%, #060c14 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* 牌背：简单的暗色纹理 */}
        <div style={{
          width: '80%', height: '80%',
          borderRadius: '6px',
          background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 8px)',
          border: '1px solid rgba(255,255,255,0.06)',
        }} />
      </div>
    );
  }

  return (
    <div className="relative group">
      <motion.div
        style={{
          width: sz.w,
          height: sz.h,
          borderRadius: '10px',
          overflow: 'hidden',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled || isImmune ? 0.45 : 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(160deg, #0d1520 0%, #070d16 100%)',
          border: isSelected
            ? `2px solid ${card.glowColor}`
            : isHighlighted
            ? `1.5px solid ${card.glowColor}80`
            : isWaitingRecover
            ? '1.5px solid rgba(245,158,11,0.7)'
            : card.skill === 'setEnv' && card.envTarget
            ? `1.5px solid ${ENV_BORDER_COLORS[card.envTarget] ?? 'rgba(255,255,255,0.15)'}`
            : '1px solid rgba(255,255,255,0.10)',
          boxShadow: isSelected
            ? `0 0 32px ${card.glowColor}60, 0 0 64px ${card.glowColor}25, 0 8px 24px rgba(0,0,0,0.8)`
            : isHighlighted
            ? `0 0 16px ${card.glowColor}40, 0 4px 16px rgba(0,0,0,0.6)`
            : `0 4px 16px rgba(0,0,0,0.6)`,
        }}
        initial={{ opacity: 0, y: 20, scale: 0.92 }}
        animate={{
          opacity: disabled || isImmune ? 0.45 : 1,
          y: 0,
          scale: 1,
          ...(isSelected ? { boxShadow: [`0 0 20px ${card.glowColor}40`, `0 0 40px ${card.glowColor}70`, `0 0 20px ${card.glowColor}40`] } : {}),
        }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        whileHover={!disabled ? {
          scale: 1.06,
          y: -6,
          boxShadow: `0 0 24px ${card.glowColor}50, 0 12px 28px rgba(0,0,0,0.7)`,
          transition: { duration: 0.18, ease: 'easeOut' }
        } : {}}
        whileTap={!disabled ? {
          scale: 0.94,
          transition: { duration: 0.1 }
        } : {}}
        onClick={handleCardActivate}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* 背景光晕（元素颜色） */}
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(ellipse at 50% 65%, ${card.glowColor}${isSelected ? '35' : '22'} 0%, transparent 65%)`,
            transition: 'background 0.2s',
          }}
        />
        {/* 选中时脱冲光晕层 */}
        {isSelected && (
          <motion.div
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              borderRadius: '10px',
              background: `radial-gradient(ellipse at 50% 30%, ${card.glowColor}30 0%, transparent 70%)`,
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* 右上角：能量费用标识 */}
        {card.energyCost !== undefined && size !== 'sm' && (
          <div style={{
            position: 'absolute', top: '5px', right: '6px',
            background: card.energyCost === 0 ? 'rgba(34,197,94,0.25)' : 'rgba(251,191,36,0.20)',
            border: card.energyCost === 0 ? '1px solid rgba(34,197,94,0.5)' : '1px solid rgba(251,191,36,0.45)',
            borderRadius: '4px',
            padding: '1px 4px',
            fontSize: '8px',
            fontWeight: 700,
            color: card.energyCost === 0 ? '#4ade80' : '#fbbf24',
            lineHeight: 1.2,
            zIndex: 2,
          }}>
            {card.energyCost === 0 ? 'FREE' : `⚡${card.energyCost}`}
          </div>
        )}

        {/* 左上角：伤害数值（效果图：白色大数字） */}
        {card.coreDamage > 0 && (
          <div style={{
            position: 'absolute', top: '6px', left: '8px',
            color: 'rgba(255,255,255,0.92)',
            fontSize: sz.damageSize,
            fontWeight: 700,
            lineHeight: 1,
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}>
            {card.coreDamage}
          </div>
        )}

        {/* 环境工具牌专属卡面 */}
        {card.skill === 'setEnv' && card.envTarget ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 4px 4px',
            gap: '3px',
          }}>
            {/* 工具牌标签 */}
            <div style={{
              fontSize: '7px',
              color: ENV_GLOW_COLORS[card.envTarget],
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              opacity: 0.85,
            }}>
              工具牌
            </div>
            {/* 大图标 */}
            <div style={{
              fontSize: size === 'lg' ? '2.8rem' : size === 'md' ? '1.8rem' : '1.2rem',
              lineHeight: 1,
              filter: `drop-shadow(0 0 8px ${ENV_GLOW_COLORS[card.envTarget]}80)`,
            }}>
              {ENV_ICONS[card.envTarget]}
            </div>
            {/* 环境名称 */}
            <div style={{
              fontSize: sz.symbolSize,
              fontWeight: 800,
              color: ENV_GLOW_COLORS[card.envTarget],
              textShadow: `0 0 12px ${ENV_GLOW_COLORS[card.envTarget]}60`,
              lineHeight: 1,
              letterSpacing: '0.02em',
            }}>
              {ENV_LABELS[card.envTarget]}
            </div>
            {/* 持续说明 */}
            {size !== 'sm' && (
              <div style={{
                fontSize: '7px',
                color: 'rgba(255,255,255,0.45)',
                letterSpacing: '0.05em',
                lineHeight: 1.2,
                textAlign: 'center',
              }}>
                持续 3 回合
              </div>
            )}
          </div>
        ) : (
          /* 普通元素牌主体：元素符号 + 中文名 */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 4px 4px',
            gap: '4px',
          }}>
            {/* 化学式（大号，白色发光，效果图核心） */}
            <div style={{
              fontSize: sz.symbolSize,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: 'rgba(255,255,255,0.95)',
              textShadow: `0 0 18px ${card.glowColor}80, 0 0 36px ${card.glowColor}35, 0 2px 4px rgba(0,0,0,0.8)`,
              textAlign: 'center',
            }}>
              {card.symbol}
            </div>

            {/* 中文名（底部小字，效果图样式） */}
            <div style={{
              fontSize: sz.nameSize,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: '0.08em',
              lineHeight: 1,
              textAlign: 'center',
            }}>
              {card.name}
            </div>

            {/* 技能标记（仅 lg 尺寸显示） */}
            {size === 'lg' && card.skill !== 'none' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '2px',
                fontSize: '9px', color: 'rgba(255,255,255,0.3)',
                marginTop: '2px',
              }}>
                <span>{SKILL_ICONS[card.skill]}</span>
                <span>{SKILL_NAMES[card.skill]}</span>
              </div>
            )}
          </div>
        )}

        {/* 底部环境需求标识（仅普通牌，有环境需求时显示） */}
        {size !== 'sm' && card.skill !== 'setEnv' && card.requiredEnv && card.requiredEnv !== 'normal' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px',
            padding: '2px 4px',
            background: `${ENV_GLOW_COLORS[card.requiredEnv]}15`,
            borderTop: `1px solid ${ENV_GLOW_COLORS[card.requiredEnv]}30`,
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '8px' }}>{ENV_ICONS[card.requiredEnv]}</span>
            <span style={{ fontSize: '7px', color: ENV_GLOW_COLORS[card.requiredEnv], fontWeight: 600 }}>
              {ENV_LABELS[card.requiredEnv]}
            </span>
          </div>
        )}

        {/* 底部破甲状态指示条（细线） */}
        {size !== 'sm' && currentArmorId && (
          <div style={{
            height: '2px',
            flexShrink: 0,
            background: canBreak ? 'rgba(34,197,94,0.7)' : 'rgba(255,255,255,0.04)',
          }} />
        )}

        {/* 选中时的出牌提示 */}
        {isSelected && (
          <motion.div
            style={{
              position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(96,165,250,0.9)',
              color: '#fff',
              borderRadius: '999px',
              padding: '1px 8px',
              fontSize: '9px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            点击出牌
          </motion.div>
        )}

        {/* 弃牌按钮 */}
        {onDiscard && size !== 'sm' && (
          <button
            style={{
              position: 'absolute', bottom: 0, right: 0,
              background: 'rgba(127,29,29,0.85)',
              color: 'rgba(252,165,165,0.9)',
              borderTopLeftRadius: '6px',
              padding: '2px 6px',
              fontSize: '9px',
              opacity: 0,
              transition: 'opacity 0.15s',
              border: 'none',
              cursor: 'pointer',
              zIndex: 10,
            }}
            className="group-hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); onDiscard(); }}
            title="弃置此牌"
          >
            弃
          </button>
        )}
      </motion.div>

      <AnimatePresence>
        {showTooltip && size !== 'sm' && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: 120 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
              onClick={() => setShowTooltip(false)}
            />
            <motion.div
              style={{
                position: 'relative',
                width: 'min(82vw, 300px)',
                maxHeight: 'min(72vh, 520px)',
                overflowY: 'auto',
                borderRadius: '18px',
                padding: '14px',
                background: 'linear-gradient(160deg, rgba(4,10,18,0.98) 0%, rgba(7,13,22,0.98) 100%)',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.78)',
                textAlign: 'left',
              }}
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.96 }}
              transition={{ duration: 0.2 }}
            >
              <button
                onClick={() => setShowTooltip(false)}
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  border: 'none',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.72)',
                  fontSize: '0.9rem',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', paddingRight: 28 }}>
                <span style={{
                  fontSize: '1.9rem', fontWeight: 700,
                  color: 'rgba(255,255,255,0.95)',
                  textShadow: `0 0 16px ${card.glowColor}`,
                }}>
                  {card.symbol}
                </span>
                <div>
                  <div style={{ fontWeight: 700, color: 'rgba(255,255,255,0.90)', fontSize: '15px' }}>{card.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>{FAMILY_NAMES[card.family]}</div>
                </div>
                {card.coreDamage > 0 && (
                  <div style={{ marginLeft: 'auto', color: '#f87171', fontWeight: 700, fontSize: '15px' }}>
                    ⚔️ {card.coreDamage}
                  </div>
                )}
              </div>

              <p style={{ color: 'rgba(255,255,255,0.70)', fontSize: '12px', marginBottom: '10px', lineHeight: 1.7 }}>
                {card.description}
              </p>

              {card.reactionEquation && (
                <div style={{
                  borderRadius: '10px', padding: '10px', marginBottom: '10px',
                  background: 'rgba(6,182,212,0.08)',
                  border: '1px solid rgba(6,182,212,0.20)',
                }}>
                  <div style={{ color: '#67e8f9', fontSize: '12px', fontFamily: 'monospace', lineHeight: 1.7 }}>
                    {card.reactionEquation}
                  </div>
                </div>
              )}

              {card.skill !== 'none' && card.skillDescription && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '8px',
                  borderRadius: '10px', padding: '10px', marginBottom: '10px',
                  background: 'rgba(245,158,11,0.10)',
                  border: '1px solid rgba(245,158,11,0.22)',
                }}>
                  <span style={{ fontSize: '1rem' }}>{SKILL_ICONS[card.skill]}</span>
                  <div>
                    <span style={{ color: '#fcd34d', fontSize: '12px', fontWeight: 700 }}>{SKILL_NAMES[card.skill]}：</span>
                    <span style={{ color: '#fde68a', fontSize: '12px', lineHeight: 1.6 }}>{card.skillDescription}</span>
                  </div>
                </div>
              )}

              {currentArmorId && (
                <div style={{ marginTop: '6px' }}>
                  {hiddenGuideMode ? (
                    <div style={{
                      borderRadius: '10px', padding: '10px',
                      background: 'rgba(16,185,129,0.06)',
                      border: '1px solid rgba(16,185,129,0.14)',
                    }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '4px' }}>
                        当前护甲：<span style={{ color: '#fde047', fontFamily: 'monospace', fontWeight: 700, marginLeft: '4px' }}>{currentArmorLabel ?? currentArmorId}</span>
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: '12px', marginTop: '4px' }}>
                        思考：{card.name}能与{currentArmorLabel ?? currentArmorId}发生反应吗？
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      fontSize: '12px', fontWeight: 600,
                      color: canBreak ? '#4ade80' : '#f87171',
                    }}>
                      <span>{canBreak ? '✓' : '✗'}</span>
                      <span>{canBreak ? '可破除当前护甲' : '无法破除当前护甲'}</span>
                    </div>
                  )}
                </div>
              )}

              {isImmune && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#9ca3af', background: 'rgba(31,41,55,0.45)', borderRadius: '8px', padding: '8px' }}>
                  {hiddenGuideMode ? '此元素似乎对该Boss没有化学反应...' : '🛡️ 该Boss对此元素免疫'}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
