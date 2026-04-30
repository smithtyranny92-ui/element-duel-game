// 主界面 — 极简暗黑风格，匹配设计图
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import LevelSelectPage from './LevelSelectPage';
import KnowledgePage from './KnowledgePage';
import AchievementsPage from './AchievementsPage';
import ElementCollectionPage from './ElementCollectionPage';
import BattleScreen from '../components/game/BattleScreen';
import BattleScreenMobile from '../components/game/BattleScreenMobile';
import MobileLandingPage from './MobileLandingPage';

type View = 'home' | 'levels' | 'knowledge' | 'achievements' | 'elements';

// 响应式 Hook：优先依据手机壳容器实际宽度，而不是浏览器窗口宽度
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    let frame: number | null = null;

    const measure = () => {
      const deviceScreen = document.getElementById('device-screen');
      const root = document.getElementById('root');
      const containerWidth = deviceScreen?.getBoundingClientRect().width ?? root?.getBoundingClientRect().width ?? window.innerWidth;
      setIsMobile(containerWidth <= 520);
    };

    const scheduleMeasure = () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
      frame = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => scheduleMeasure())
      : null;

    const deviceScreen = document.getElementById('device-screen');
    const root = document.getElementById('root');

    if (deviceScreen) resizeObserver?.observe(deviceScreen);
    if (root) resizeObserver?.observe(root);

    window.addEventListener('resize', scheduleMeasure);

    return () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
    };
  }, []);

  return isMobile;
}

export default function Home() {
  const { currentLevelId, startLevel, levelProgress, achievements } = useGame();
  const [view, setView] = useState<View>('home');
  const isMobile = useIsMobile();

  // 根据屏幕宽度自动选择 PC 端或移动端
  if (currentLevelId !== null) return isMobile ? <BattleScreenMobile /> : <BattleScreen />;

  // 移动端时简化页面
  if (isMobile) {
    if (view === 'levels') return <LevelSelectPage onBack={() => setView('home')} />;
    if (view === 'knowledge') return <KnowledgePage onBack={() => setView('home')} />;
    if (view === 'achievements') return <AchievementsPage onBack={() => setView('home')} />;
    if (view === 'elements') return <ElementCollectionPage onBack={() => setView('home')} />;
  } else {
    if (view === 'levels') return <LevelSelectPage onBack={() => setView('home')} />;
    if (view === 'knowledge') return <KnowledgePage onBack={() => setView('home')} />;
    if (view === 'achievements') return <AchievementsPage onBack={() => setView('home')} />;
    if (view === 'elements') return <ElementCollectionPage onBack={() => setView('home')} />;
  }

  // 从第一个未通关关卡开始
  const completedLevels = Object.values(levelProgress).filter(p => p.completed).length;
  const nextLevelId = completedLevels < 20 ? completedLevels + 1 : 1;

  const menuItems = [
    {
      label: '开始游戏',
      onClick: () => startLevel(nextLevelId),
    },
    {
      label: '关卡选择',
      onClick: () => setView('levels'),
    },
    {
      label: '图鉴成就',
      onClick: () => setView('achievements'),
    },
    {
      label: '元素图鉴',
      onClick: () => setView('elements'),
    },
    {
      label: '退出游戏',
      onClick: () => {
        if (window.confirm('确定要退出游戏吗？')) {
          window.close();
        }
      },
    },
  ];

  if (isMobile) {
    return (
      <>
        <MobileLandingPage
          onStart={() => startLevel(nextLevelId)}
          onLevels={() => setView('levels')}
          onAchievements={() => setView('achievements')}
          onElements={() => setView('elements')}
          onExit={() => {
            if (window.confirm('确定要退出游戏吗？')) {
              window.close();
            }
          }}
        />

      </>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center"
      style={{ background: '#050e14' }}
    >
      {/* 主背景图 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url('/bg-home.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* 深色叠层 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'rgba(3, 8, 14, 0.72)',
        }}
      />

      {/* 烟雾/光晕效果 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 50% 30%, rgba(20,80,90,0.18) 0%, transparent 70%),
            radial-gradient(ellipse 40% 30% at 20% 80%, rgba(10,50,60,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 80% 70%, rgba(10,50,60,0.10) 0%, transparent 60%)
          `,
        }}
      />





      {/* 中央内容 */}
      <div className="relative z-10 flex flex-col items-center" style={{ minWidth: '320px' }}>

        {/* 标题区域 */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          <h1
            className="font-light tracking-widest mb-2"
            style={{
              fontSize: '3.6rem',
              color: '#ffffff',
              letterSpacing: '0.18em',
              textShadow: '0 0 40px rgba(255,255,255,0.15)',
              fontFamily: '"Noto Sans SC", sans-serif',
              fontWeight: 300,
            }}
          >
            元素决斗
          </h1>
          <p
            className="tracking-[0.45em] font-light"
            style={{
              fontSize: '0.95rem',
              color: 'rgba(255,255,255,0.55)',
              fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
              letterSpacing: '0.45em',
            }}
          >
            ELEMENT&nbsp;&nbsp;DUEL
          </p>
        </motion.div>

        {/* 菜单项 */}
        <motion.div
          className="flex flex-col items-center gap-0 w-full"
          style={{ maxWidth: '260px' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {menuItems.map((item, i) => (
            <motion.div
              key={item.label}
              className="w-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
            >
              <MenuButton label={item.label} onClick={item.onClick} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// 菜单按钮组件 — 匹配设计图中的文字菜单风格
function MenuButton({ label, onClick }: { label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full py-4 text-center transition-all duration-200 relative"
      style={{
        background: 'transparent',
        border: 'none',
        borderBottom: hovered ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.12)',
        color: hovered ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.65)',
        fontSize: '1.1rem',
        fontWeight: 300,
        letterSpacing: '0.12em',
        fontFamily: '"Noto Sans SC", sans-serif',
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      <motion.span
        animate={{ x: hovered ? 4 : 0 }}
        transition={{ duration: 0.15 }}
        style={{ display: 'inline-block' }}
      >
        {label}
      </motion.span>
    </button>
  );
}
