import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useGame } from '../contexts/GameContext';
import { LEVELS } from '../lib/levelData';

interface Props {
  onBack: () => void;
}

const getBossImageUrl = (levelId: number): string => `/bosses/boss_${levelId}.webp`;

const CHAPTER_CONFIG = [
  {
    id: 1,
    roman: 'I',
    label: '元素初识',
    color: '#67e8f9',
    colorDim: 'rgba(103,232,249,0.14)',
    colorBorder: 'rgba(103,232,249,0.30)',
    glow: 'rgba(103,232,249,0.16)',
  },
  {
    id: 2,
    roman: 'II',
    label: '化学反应',
    color: '#4ade80',
    colorDim: 'rgba(74,222,128,0.12)',
    colorBorder: 'rgba(74,222,128,0.28)',
    glow: 'rgba(74,222,128,0.14)',
  },
  {
    id: 3,
    roman: 'III',
    label: '金属世界',
    color: '#fb923c',
    colorDim: 'rgba(251,146,60,0.12)',
    colorBorder: 'rgba(251,146,60,0.28)',
    glow: 'rgba(251,146,60,0.14)',
  },
  {
    id: 4,
    roman: 'IV',
    label: '氧化还原',
    color: '#c084fc',
    colorDim: 'rgba(192,132,252,0.12)',
    colorBorder: 'rgba(192,132,252,0.28)',
    glow: 'rgba(192,132,252,0.14)',
  },
];

function StarRow({ stars, color }: { stars: number; color: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map(index => (
        <svg key={index} width="12" height="12" viewBox="0 0 24 24">
          <polygon
            points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
            fill={index <= stars ? color : 'rgba(255,255,255,0.10)'}
            stroke={index <= stars ? color : 'rgba(255,255,255,0.08)'}
            strokeWidth="1"
          />
        </svg>
      ))}
    </div>
  );
}

export default function LevelSelectPage({ onBack }: Props) {
  const { startLevel, levelProgress } = useGame();
  const [activeChapter, setActiveChapter] = useState(1);

  const chapterCfg = CHAPTER_CONFIG.find(c => c.id === activeChapter)!;

  const chapterLevels = useMemo(
    () => LEVELS.filter(level => level.chapter === activeChapter),
    [activeChapter],
  );

  const chapterProgress = useMemo(() => {
    return CHAPTER_CONFIG.map(ch => {
      const levels = LEVELS.filter(l => l.chapter === ch.id);
      const completed = levels.filter(l => levelProgress[l.id]?.completed).length;
      return { id: ch.id, completed, total: levels.length };
    });
  }, [levelProgress]);

  return (
    <div
      className="relative flex flex-col"
      style={{ width: '100%', height: '100%', minHeight: '100%', background: '#04080d', overflow: 'hidden' }}
    >
      {/* 背景图 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/bg-levels.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.15,
        }}
      />
      {/* 渐变遮罩 + 章节色光晕 */}
      <motion.div
        className="absolute inset-0"
        animate={{ background: `radial-gradient(ellipse at 50% -10%, ${chapterCfg.glow} 0%, transparent 55%), linear-gradient(180deg, rgba(2,6,12,0.92) 0%, rgba(3,9,15,0.78) 40%, rgba(2,6,12,0.96) 100%)` }}
        transition={{ duration: 0.5 }}
      />
      {/* 顶部光线 */}
      <motion.div
        className="absolute top-0 left-0 right-0"
        style={{ height: 1, opacity: 0.55 }}
        animate={{ background: `linear-gradient(90deg, transparent 0%, ${chapterCfg.color} 50%, transparent 100%)` }}
        transition={{ duration: 0.5 }}
      />

      {/* ===== 顶部标题栏 ===== */}
      <div className="relative z-20 flex items-center px-4 pt-10 pb-3" style={{ gap: 10 }}>
        <button
          onClick={onBack}
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.09)',
            color: 'rgba(255,255,255,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.24em', marginBottom: 1 }}>
            Level Select
          </div>
          <div style={{ color: '#ffffff', fontSize: '1.10rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            关卡选择
          </div>
        </div>
        <motion.div
          animate={{
            background: chapterCfg.colorDim,
            borderColor: chapterCfg.colorBorder,
            color: chapterCfg.color,
          }}
          transition={{ duration: 0.4 }}
          style={{
            padding: '3px 10px',
            borderRadius: 999,
            border: '1px solid',
            fontSize: '0.62rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Ch.{activeChapter}
        </motion.div>
      </div>

      {/* ===== 章节横向切换 ===== */}
      <div className="relative z-20 px-4 pb-3">
        <div className="flex gap-2">
          {CHAPTER_CONFIG.map(ch => {
            const prog = chapterProgress.find(p => p.id === ch.id)!;
            const isActive = ch.id === activeChapter;
            return (
              <motion.button
                key={ch.id}
                onClick={() => setActiveChapter(ch.id)}
                className="flex-1 flex flex-col items-center relative overflow-hidden"
                style={{
                  padding: '8px 4px 6px',
                  borderRadius: 13,
                  background: isActive ? ch.colorDim : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive ? ch.colorBorder : 'rgba(255,255,255,0.06)'}`,
                  transition: 'all 0.3s ease',
                }}
                whileTap={{ scale: 0.95 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="chapter-glow"
                    className="absolute inset-0"
                    style={{ background: `radial-gradient(ellipse at 50% 0%, ${ch.glow} 0%, transparent 75%)` }}
                    transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                  />
                )}
                <div
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    fontFamily: 'serif',
                    color: isActive ? ch.color : 'rgba(255,255,255,0.28)',
                    lineHeight: 1,
                    marginBottom: 3,
                    transition: 'color 0.3s',
                    letterSpacing: '0.04em',
                  }}
                >
                  {ch.roman}
                </div>
                <div
                  style={{
                    fontSize: '0.50rem',
                    color: isActive ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.22)',
                    letterSpacing: '0.05em',
                    marginBottom: 5,
                    transition: 'color 0.3s',
                  }}
                >
                  {ch.label}
                </div>
                {/* 进度条 */}
                <div style={{ width: '75%', height: 2, borderRadius: 999, background: 'rgba(255,255,255,0.07)' }}>
                  <motion.div
                    animate={{ width: `${prog.total > 0 ? (prog.completed / prog.total) * 100 : 0}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      borderRadius: 999,
                      background: isActive ? ch.color : 'rgba(255,255,255,0.18)',
                      transition: 'background 0.3s',
                    }}
                  />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ===== 关卡列表 ===== */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-8" style={{ paddingTop: 2 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeChapter}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.20 }}
            className="space-y-2.5"
          >
            {chapterLevels.map((level, index) => {
              const progress = levelProgress[level.id] ?? { completed: false, stars: 0, bestScore: 0 };
              const unlocked =
                level.id === 1 ||
                Boolean(levelProgress[level.id - 1]?.completed) ||
                progress.completed ||
                Boolean(level.unlocked);
              const isBoss = level.subtitle?.includes('Boss');
              const isElite = level.subtitle?.includes('精英');
              const isSpecial = isBoss || isElite;

              return (
                <motion.button
                  key={level.id}
                  onClick={() => unlocked && startLevel(level.id)}
                  className="w-full text-left relative overflow-hidden"
                  style={{
                    borderRadius: 18,
                    background: isSpecial && unlocked
                      ? `linear-gradient(135deg, rgba(6,10,16,0.97) 0%, ${chapterCfg.colorDim} 100%)`
                      : 'rgba(7,12,18,0.88)',
                    border: `1px solid ${
                      isSpecial && unlocked
                        ? chapterCfg.colorBorder
                        : unlocked
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(255,255,255,0.04)'
                    }`,
                    boxShadow: isSpecial && unlocked
                      ? `0 0 20px ${chapterCfg.glow}, 0 4px 14px rgba(0,0,0,0.30)`
                      : '0 2px 10px rgba(0,0,0,0.24)',
                    opacity: unlocked ? 1 : 0.42,
                    backdropFilter: 'blur(10px)',
                    padding: 0,
                  }}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: unlocked ? 1 : 0.42, y: 0 }}
                  transition={{ delay: index * 0.035, duration: 0.25 }}
                  whileTap={unlocked ? { scale: 0.982 } : {}}
                >
                  {/* Boss/Elite 顶部光线 */}
                  {isSpecial && unlocked && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0,
                        height: 1,
                        background: `linear-gradient(90deg, transparent 0%, ${chapterCfg.color} 50%, transparent 100%)`,
                        opacity: 0.65,
                      }}
                    />
                  )}

                  <div className="flex items-stretch" style={{ minHeight: 76 }}>
                    {/* 左侧：图像 / 编号 */}
                    <div
                      style={{
                        width: 68,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '18px 0 0 18px',
                        background: isSpecial
                          ? `radial-gradient(circle at 50% 55%, ${chapterCfg.colorDim} 0%, transparent 72%)`
                          : 'rgba(255,255,255,0.02)',
                        borderRight: `1px solid ${isSpecial ? chapterCfg.colorBorder : 'rgba(255,255,255,0.05)'}`,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {!unlocked ? (
                        /* 锁图标 */
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <rect x="5" y="11" width="14" height="10" rx="2" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                          <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      ) : isSpecial ? (
                        /* Boss/Elite 图像 */
                        <img
                          src={getBossImageUrl(level.id)}
                          alt={level.enemyName}
                          style={{
                            width: 56,
                            height: 56,
                            objectFit: 'contain',
                            filter: `drop-shadow(0 0 7px ${chapterCfg.color}44)`,
                          }}
                        />
                      ) : (
                        /* 普通关卡编号 */
                        <div style={{ textAlign: 'center' }}>
                          <div
                            style={{
                              fontSize: '1.45rem',
                              fontWeight: 900,
                              fontFamily: 'serif',
                              color: progress.completed ? chapterCfg.color : 'rgba(255,255,255,0.18)',
                              lineHeight: 1,
                              letterSpacing: '-0.02em',
                            }}
                          >
                            {level.id}
                          </div>
                          {progress.completed && (
                            <div style={{ marginTop: 5 }}>
                              <StarRow stars={progress.stars ?? 0} color={chapterCfg.color} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 右侧：文字 */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center" style={{ padding: '11px 10px 11px 11px' }}>
                      {/* 标签行 */}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {isBoss && (
                          <span style={{
                            fontSize: '0.50rem', padding: '1px 6px', borderRadius: 999,
                            background: chapterCfg.colorDim, border: `1px solid ${chapterCfg.colorBorder}`,
                            color: chapterCfg.color, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
                          }}>BOSS</span>
                        )}
                        {isElite && (
                          <span style={{
                            fontSize: '0.50rem', padding: '1px 6px', borderRadius: 999,
                            background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.28)',
                            color: '#fbbf24', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
                          }}>ELITE</span>
                        )}
                        <span style={{ fontSize: '0.56rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.05em' }}>
                          {level.subtitle?.split('·')[1]?.trim() ?? ''}
                        </span>
                      </div>

                      {/* 关卡标题 */}
                      <div style={{
                        color: unlocked ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.30)',
                        fontSize: '0.90rem', fontWeight: 600, letterSpacing: '0.02em',
                        marginBottom: 4, lineHeight: 1.3,
                      }}>
                        {level.title}
                      </div>

                      {/* 描述 / 锁定提示 */}
                      <div style={{
                        color: unlocked ? 'rgba(255,255,255,0.36)' : 'rgba(255,255,255,0.16)',
                        fontSize: '0.66rem', lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {unlocked ? level.description : '完成前置关卡以解锁'}
                      </div>

                      {/* Boss/Elite：敌人名 + 星级 */}
                      {isSpecial && unlocked && (
                        <div className="flex items-center justify-between mt-2">
                          <div style={{ fontSize: '0.60rem', color: chapterCfg.color, fontWeight: 600, opacity: 0.80 }}>
                            {level.enemyName}
                          </div>
                          {progress.completed && (
                            <StarRow stars={progress.stars ?? 0} color={chapterCfg.color} />
                          )}
                        </div>
                      )}
                    </div>

                    {/* 右侧箭头 */}
                    {unlocked && (
                      <div style={{
                        display: 'flex', alignItems: 'center', paddingRight: 10,
                        color: isSpecial ? chapterCfg.color : 'rgba(255,255,255,0.18)',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
