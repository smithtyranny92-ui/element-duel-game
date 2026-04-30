import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

// ─── 页面切换过场（滑入/淡出）───────────────────────────────────────────────
export function PageTransitionWrapper({
  children,
  pageKey,
  direction = 'up',
}: {
  children: React.ReactNode;
  pageKey: string;
  direction?: 'up' | 'down' | 'left' | 'right';
}) {
  const offset: Record<string, [number, number]> = {
    up: [30, -30], down: [-30, 30], left: [40, -40], right: [-40, 40],
  };
  const [dy, exitDy] = offset[direction];
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial={{ opacity: 0, y: dy, filter: 'brightness(0.7)' }}
        animate={{ opacity: 1, y: 0, filter: 'brightness(1)' }}
        exit={{ opacity: 0, y: exitDy, filter: 'brightness(0.5)' }}
        transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
        style={{ width: '100%', height: '100%', minHeight: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── 关卡进入过场 ──────────────────────────────────────────────────────────
interface LevelTransitionProps {
  visible: boolean;
  levelTitle: string;
  levelSubtitle: string;
  enemyName: string;
  levelId: number;
  onComplete: () => void;
}

export function LevelTransitionOverlay({
  visible,
  levelTitle,
  levelSubtitle,
  enemyName,
  levelId,
  onComplete,
}: LevelTransitionProps) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');

  useEffect(() => {
    if (!visible) { setPhase('enter'); return; }
    setPhase('enter');
    const t1 = setTimeout(() => setPhase('show'), 100);
    const t2 = setTimeout(() => setPhase('exit'), 2200);
    const t3 = setTimeout(() => onComplete(), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [visible]);

  if (!visible && phase === 'enter') return null;

  return (
    <AnimatePresence>
      {(visible || phase === 'exit') && (
        <motion.div
          key="level-transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === 'exit' ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: phase === 'exit' ? 0.5 : 0.35 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(ellipse at 50% 40%, rgba(10,25,40,0.97) 0%, rgba(2,5,10,0.99) 100%)',
            overflow: 'hidden',
          }}
        >
          {/* 背景光晕 */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: phase === 'show' ? 1.2 : 0.4, opacity: phase === 'show' ? 0.35 : 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              position: 'absolute', width: 320, height: 320, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(34,211,238,0.5) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Boss 图像（背景虚化）*/}
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: phase === 'show' ? 0.22 : 0, scale: phase === 'show' ? 1 : 0.6, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
            style={{
              position: 'absolute', width: 260, height: 260,
              backgroundImage: `url('/bosses/boss_${levelId}.webp')`,
              backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
              filter: 'blur(1px)',
              pointerEvents: 'none',
            }}
          />

          {/* 横线装饰 */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: phase === 'show' ? 1 : 0, opacity: phase === 'show' ? 1 : 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              position: 'absolute', top: '38%', left: 0, right: 0, height: 1,
              background: 'linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.55) 50%, transparent 100%)',
              transformOrigin: 'center',
            }}
          />
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: phase === 'show' ? 1 : 0, opacity: phase === 'show' ? 1 : 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            style={{
              position: 'absolute', bottom: '38%', left: 0, right: 0, height: 1,
              background: 'linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.55) 50%, transparent 100%)',
              transformOrigin: 'center',
            }}
          />

          {/* 文字内容 */}
          <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 32px' }}>
            {/* 副标题 */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: phase === 'show' ? 0.55 : 0, y: phase === 'show' ? 0 : -12 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              style={{ color: '#a5f3fc', fontSize: '0.68rem', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 12 }}
            >
              {levelSubtitle}
            </motion.div>

            {/* 主标题 */}
            <motion.div
              initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
              animate={{ opacity: phase === 'show' ? 1 : 0, y: phase === 'show' ? 0 : 16, filter: phase === 'show' ? 'blur(0px)' : 'blur(8px)' }}
              transition={{ duration: 0.55, delay: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
              style={{
                color: '#ffffff', fontSize: '1.85rem', fontWeight: 800,
                letterSpacing: '0.06em', lineHeight: 1.2,
                textShadow: '0 0 30px rgba(34,211,238,0.45)',
                marginBottom: 16,
              }}
            >
              {levelTitle}
            </motion.div>

            {/* 分隔符 */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: phase === 'show' ? 1 : 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              style={{ height: 1, width: 60, background: 'rgba(34,211,238,0.50)', margin: '0 auto 14px', transformOrigin: 'center' }}
            />

            {/* 敌人名称 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: phase === 'show' ? 0.80 : 0, y: phase === 'show' ? 0 : 10 }}
              transition={{ duration: 0.4, delay: 0.55 }}
              style={{ color: 'rgba(255,255,255,0.80)', fontSize: '0.88rem', fontWeight: 600, letterSpacing: '0.12em' }}
            >
              {enemyName}
            </motion.div>

            {/* BATTLE START */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: phase === 'show' ? 0.40 : 0, scale: phase === 'show' ? 1 : 0.5 }}
              transition={{ duration: 0.35, delay: 0.65 }}
              style={{ color: '#67e8f9', fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.35em', marginTop: 20, textTransform: 'uppercase' }}
            >
              — BATTLE START —
            </motion.div>
          </div>

          {/* 角落装饰 */}
          {([
            { top: 24, left: 24 } as React.CSSProperties,
            { top: 24, right: 24 } as React.CSSProperties,
            { bottom: 24, left: 24 } as React.CSSProperties,
            { bottom: 24, right: 24 } as React.CSSProperties,
          ]).map((pos, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: phase === 'show' ? 0.45 : 0, scale: phase === 'show' ? 1 : 0 }}
              transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
              style={{
                position: 'absolute', ...pos,
                width: 16, height: 16,
                borderTop: i < 2 ? '1.5px solid rgba(34,211,238,0.6)' : 'none',
                borderBottom: i >= 2 ? '1.5px solid rgba(34,211,238,0.6)' : 'none',
                borderLeft: i % 2 === 0 ? '1.5px solid rgba(34,211,238,0.6)' : 'none',
                borderRight: i % 2 === 1 ? '1.5px solid rgba(34,211,238,0.6)' : 'none',
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── 胜利闪光 ──────────────────────────────────────────────────────────────
export function VictoryFlash({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="victory-flash"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.7, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, times: [0, 0.3, 1] }}
          style={{
            position: 'fixed', inset: 0, zIndex: 8000, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 50% 40%, rgba(34,211,238,0.55) 0%, rgba(16,185,129,0.30) 50%, transparent 80%)',
          }}
        />
      )}
    </AnimatePresence>
  );
}

// ─── 失败闪光 ──────────────────────────────────────────────────────────────
export function DefeatFlash({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="defeat-flash"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.65, 0.35] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, times: [0, 0.25, 1] }}
          style={{
            position: 'fixed', inset: 0, zIndex: 8000, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 50% 40%, rgba(220,38,38,0.50) 0%, rgba(127,29,29,0.30) 50%, transparent 80%)',
          }}
        />
      )}
    </AnimatePresence>
  );
}
