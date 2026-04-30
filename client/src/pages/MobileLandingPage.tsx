import { motion } from 'framer-motion';

interface Props {
  onStart: () => void;
  onLevels: () => void;
  onAchievements: () => void;
  onElements: () => void;
  onExit: () => void;
}

function MobileMenuButton({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left transition-all duration-200"
      style={{
        padding: '18px 0',
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.08)',
        color: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.88)',
        fontSize: '1.05rem',
        fontWeight: 300,
        letterSpacing: '0.04em',
      }}
    >
      {label}
    </button>
  );
}

export default function MobileLandingPage({ onStart, onLevels, onAchievements, onElements, onExit}: Props) {
  return (
    <div
      className="relative h-full overflow-hidden"
      style={{
        width: '100%',
        height: '100%',
        minHeight: '100%',
        background: '#04090d',
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/bg-home.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(0.5px)',
          transform: 'scale(1.04)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.62) 0%, rgba(2,10,14,0.72) 45%, rgba(1,8,12,0.84) 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 72% 70%, rgba(75,146,160,0.18), transparent 30%), radial-gradient(circle at 34% 26%, rgba(80,155,168,0.12), transparent 28%)',
        }}
      />



      <div className="relative z-10 px-10 pt-24 pb-12 flex h-full flex-col" style={{ minHeight: '100%' }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="pt-2"
        >
          <h1
            style={{
              color: '#ffffff',
              fontSize: '3.35rem',
              lineHeight: 1.02,
              fontWeight: 300,
              letterSpacing: '0.01em',
            }}
          >
            元素决斗
          </h1>
          <div
            style={{
              marginTop: '12px',
              color: 'rgba(255,255,255,0.88)',
              fontSize: '0.84rem',
              letterSpacing: '0.12em',
              fontWeight: 300,
            }}
          >
            ELEMNET DUEL
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.5 }}
          className="mt-auto mb-16"
          style={{ width: '100%', maxWidth: 240 }}
        >
          <MobileMenuButton label="开始游戏" active onClick={onStart} />
          <MobileMenuButton label="关卡选择" onClick={onLevels} />
          <MobileMenuButton label="成就图鉴" onClick={onAchievements} />
          <MobileMenuButton label="元素图鉴" onClick={onElements} />
          <MobileMenuButton label="退出游戏" onClick={onExit} />
        </motion.div>
      </div>
    </div>
  );
}
