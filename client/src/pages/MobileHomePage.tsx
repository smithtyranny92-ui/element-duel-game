import { motion } from 'framer-motion';

interface MobileHomePageProps {
  onStart: () => void;
  onLevels: () => void;
  onAchievements: () => void;
  onElements: () => void;
}

export default function MobileHomePage({ onStart, onLevels, onAchievements, onElements }: MobileHomePageProps) {
  const menuItems = [
    { label: '开始游戏', onClick: onStart, primary: true },
    { label: '关卡选择', onClick: onLevels },
    { label: '图鉴成就', onClick: onAchievements },
    { label: '元素图鉴', onClick: onElements },
  ];

  return (
    <div
      className="relative h-full w-full overflow-hidden flex flex-col"
      style={{ background: 'linear-gradient(180deg, #05080d 0%, #09111a 35%, #05080d 100%)' }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/bg-home.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.28,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(2,6,12,0.82) 0%, rgba(2,8,14,0.60) 38%, rgba(2,6,12,0.90) 100%)',
        }}
      />

      <div className="relative z-10 flex items-center justify-between px-5 pt-10 pb-3">
        <div>
          <div className="text-[11px] tracking-[0.28em] uppercase text-cyan-400/70">Mobile Edition</div>
          <div className="text-[10px] text-white/35 mt-1">独立手机端适配方案</div>
        </div>
        <div
          className="px-3 py-1 rounded-full text-[10px]"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.5)' }}
        >
          9:19.5
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full"
        >
          <div className="text-center mb-8">
            <div className="text-4xl font-black tracking-[0.08em] text-white">元素决斗</div>
            <div className="mt-2 text-sm tracking-[0.35em] text-cyan-300/75">ELEMENT DUEL</div>
            <div className="mt-4 text-xs leading-6 text-white/55 max-w-[260px] mx-auto">
              保留 PC 端方案的核心美术与战斗逻辑，重新组织为适合手机竖屏操作的独立界面。
            </div>
          </div>

          <div className="space-y-3">
            {menuItems.map((item, index) => (
              <motion.button
                key={item.label}
                onClick={item.onClick}
                className="w-full rounded-2xl py-4 text-sm font-semibold tracking-[0.12em]"
                style={{
                  background: item.primary
                    ? 'linear-gradient(135deg, rgba(8,118,170,0.92) 0%, rgba(18,164,211,0.82) 100%)'
                    : 'rgba(255,255,255,0.06)',
                  color: item.primary ? '#ecfeff' : 'rgba(255,255,255,0.82)',
                  border: item.primary
                    ? '1px solid rgba(103,232,249,0.38)'
                    : '1px solid rgba(255,255,255,0.10)',
                  boxShadow: item.primary
                    ? '0 10px 26px rgba(6,182,212,0.24)'
                    : '0 8px 20px rgba(0,0,0,0.25)',
                  backdropFilter: 'blur(10px)',
                }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * index + 0.1, duration: 0.35 }}
                whileTap={{ scale: 0.97 }}
              >
                {item.label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="relative z-10 px-6 pb-10 pt-4">
        <div
          className="rounded-2xl px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">Design Notes</div>
          <div className="mt-2 text-[11px] leading-5 text-white/55">
            手机端采用固定设备视口展示，外部黑边仅用于预览区分，不影响后续独立导出为真实移动网页。
          </div>
        </div>
      </div>
    </div>
  );
}
