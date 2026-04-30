import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface RoundTransitionProps {
  visible: boolean;
  nextRound: number;
  maxRounds: number;
  onComplete: () => void;
}

/**
 * 回合过场动画
 * 使用 position: absolute 以适配手机壳游戏容器（父容器需为 position: relative/absolute）
 * 显示约 750ms，展示"第 N 回合"字样 + 光线扫过 + 边框收缩效果
 */
export default function RoundTransition({ visible, nextRound, maxRounds, onComplete }: RoundTransitionProps) {
  const calledRef = useRef(false);

  useEffect(() => {
    if (!visible) { calledRef.current = false; return; }
    calledRef.current = false;
    const t = setTimeout(() => {
      if (!calledRef.current) {
        calledRef.current = true;
        onComplete();
      }
    }, 750);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={`round-${nextRound}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          {/* 半透明暗化遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.82, 0.82, 0] }}
            transition={{ duration: 0.75, times: [0, 0.15, 0.75, 1] }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(2, 6, 12, 0.90)',
            }}
          />

          {/* 顶部横线 */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.75, times: [0, 0.2, 0.75, 1] }}
            style={{
              position: 'absolute',
              top: '43%',
              left: 0,
              right: 0,
              height: 1,
              background: 'linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.75) 50%, transparent 100%)',
              transformOrigin: 'center',
            }}
          />

          {/* 底部横线 */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.75, times: [0, 0.2, 0.75, 1], delay: 0.03 }}
            style={{
              position: 'absolute',
              bottom: '43%',
              left: 0,
              right: 0,
              height: 1,
              background: 'linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.75) 50%, transparent 100%)',
              transformOrigin: 'center',
            }}
          />

          {/* 光线扫过 */}
          <motion.div
            initial={{ x: '-110%', opacity: 0.9 }}
            animate={{ x: '110%', opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeIn', delay: 0.12 }}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '50%',
              background: 'linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.14) 50%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />

          {/* 文字内容 */}
          <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
            {/* ROUND 英文小字 */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: [0, 0.55, 0.55, 0], y: 0 }}
              transition={{ duration: 0.75, times: [0, 0.2, 0.75, 1] }}
              style={{
                color: '#a5f3fc',
                fontSize: '0.60rem',
                fontWeight: 700,
                letterSpacing: '0.38em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              ROUND
            </motion.div>

            {/* 回合数字 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.72, filter: 'blur(12px)' }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.72, 1, 1, 1.06],
                filter: ['blur(12px)', 'blur(0px)', 'blur(0px)', 'blur(5px)'],
              }}
              transition={{ duration: 0.75, times: [0, 0.22, 0.72, 1] }}
              style={{
                color: '#ffffff',
                fontSize: '4.2rem',
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: '-0.02em',
                textShadow: '0 0 40px rgba(34,211,238,0.60), 0 0 80px rgba(34,211,238,0.28)',
              }}
            >
              {nextRound}
            </motion.div>

            {/* 总回合数 */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: [0, 0.40, 0.40, 0], y: 0 }}
              transition={{ duration: 0.75, times: [0, 0.25, 0.75, 1] }}
              style={{
                color: 'rgba(255,255,255,0.40)',
                fontSize: '0.68rem',
                fontWeight: 600,
                letterSpacing: '0.12em',
                marginTop: 10,
              }}
            >
              / {maxRounds}
            </motion.div>
          </div>

          {/* 四角装饰 */}
          {([
            { top: '41%', left: 20 },
            { top: '41%', right: 20 },
            { bottom: '41%', left: 20 },
            { bottom: '41%', right: 20 },
          ] as React.CSSProperties[]).map((pos, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 0.55, 0.55, 0], scale: [0, 1, 1, 0] }}
              transition={{ duration: 0.75, times: [0, 0.2, 0.75, 1], delay: i * 0.03 }}
              style={{
                position: 'absolute',
                ...pos,
                width: 12,
                height: 12,
                borderTop: i < 2 ? '1.5px solid rgba(34,211,238,0.75)' : 'none',
                borderBottom: i >= 2 ? '1.5px solid rgba(34,211,238,0.75)' : 'none',
                borderLeft: i % 2 === 0 ? '1.5px solid rgba(34,211,238,0.75)' : 'none',
                borderRight: i % 2 === 1 ? '1.5px solid rgba(34,211,238,0.75)' : 'none',
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
