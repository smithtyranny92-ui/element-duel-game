import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useGame } from '../contexts/GameContext';

interface Props {
  onBack: () => void;
}

const ACHIEVEMENT_META: Record<string, { color: string; colorDim: string; colorBorder: string; glow: string; rarity: string }> = {
  'first-win':      { color: '#67e8f9', colorDim: 'rgba(103,232,249,0.10)', colorBorder: 'rgba(103,232,249,0.28)', glow: 'rgba(103,232,249,0.18)', rarity: '普通' },
  'no-mistake':     { color: '#fbbf24', colorDim: 'rgba(251,191,36,0.12)', colorBorder: 'rgba(251,191,36,0.30)', glow: 'rgba(251,191,36,0.20)', rarity: '稀有' },
  'speed-clear':    { color: '#4ade80', colorDim: 'rgba(74,222,128,0.10)', colorBorder: 'rgba(74,222,128,0.26)', glow: 'rgba(74,222,128,0.16)', rarity: '普通' },
  'chapter1':       { color: '#67e8f9', colorDim: 'rgba(103,232,249,0.10)', colorBorder: 'rgba(103,232,249,0.26)', glow: 'rgba(103,232,249,0.14)', rarity: '普通' },
  'chapter2':       { color: '#4ade80', colorDim: 'rgba(74,222,128,0.10)', colorBorder: 'rgba(74,222,128,0.26)', glow: 'rgba(74,222,128,0.14)', rarity: '普通' },
  'chapter3':       { color: '#fb923c', colorDim: 'rgba(251,146,60,0.10)', colorBorder: 'rgba(251,146,60,0.26)', glow: 'rgba(251,146,60,0.14)', rarity: '普通' },
  'chapter4':       { color: '#c084fc', colorDim: 'rgba(192,132,252,0.10)', colorBorder: 'rgba(192,132,252,0.26)', glow: 'rgba(192,132,252,0.14)', rarity: '稀有' },
  'all-clear':      { color: '#f59e0b', colorDim: 'rgba(245,158,11,0.14)', colorBorder: 'rgba(245,158,11,0.35)', glow: 'rgba(245,158,11,0.22)', rarity: '传说' },
  'knowledge-5':    { color: '#60a5fa', colorDim: 'rgba(96,165,250,0.10)', colorBorder: 'rgba(96,165,250,0.26)', glow: 'rgba(96,165,250,0.14)', rarity: '普通' },
  'knowledge-all':  { color: '#a78bfa', colorDim: 'rgba(167,139,250,0.12)', colorBorder: 'rgba(167,139,250,0.30)', glow: 'rgba(167,139,250,0.18)', rarity: '稀有' },
  'three-stars':    { color: '#fbbf24', colorDim: 'rgba(251,191,36,0.10)', colorBorder: 'rgba(251,191,36,0.26)', glow: 'rgba(251,191,36,0.16)', rarity: '普通' },
};

const DEFAULT_META = { color: '#94a3b8', colorDim: 'rgba(148,163,184,0.08)', colorBorder: 'rgba(148,163,184,0.20)', glow: 'rgba(148,163,184,0.10)', rarity: '普通' };
const RARITY_ORDER: Record<string, number> = { '传说': 0, '稀有': 1, '普通': 2 };

function CrystalIcon({ icon, unlocked, color, glow }: { icon: string; unlocked: boolean; color: string; glow: string }) {
  return (
    <div style={{
      width: 46, height: 46, borderRadius: 14, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: unlocked ? `radial-gradient(circle at 50% 40%, ${glow} 0%, rgba(0,0,0,0.30) 100%)` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${unlocked ? color + '44' : 'rgba(255,255,255,0.06)'}`,
      boxShadow: unlocked ? `0 0 12px ${glow}` : 'none',
      fontSize: '1.45rem', lineHeight: 1,
      filter: unlocked ? 'none' : 'grayscale(1) brightness(0.4)',
      position: 'relative', overflow: 'hidden',
    }}>
      {unlocked && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
          background: `linear-gradient(180deg, ${color}18 0%, transparent 100%)`,
          borderRadius: '14px 14px 0 0',
        }} />
      )}
      <span style={{ position: 'relative', zIndex: 1 }}>{icon}</span>
    </div>
  );
}

export default function AchievementsPage({ onBack }: Props) {
  const { achievements } = useGame();
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  const sortedAchievements = useMemo(() => {
    const sort = (arr: typeof achievements) =>
      [...arr].sort((a, b) => {
        const ra = RARITY_ORDER[(ACHIEVEMENT_META[a.id] ?? DEFAULT_META).rarity] ?? 2;
        const rb = RARITY_ORDER[(ACHIEVEMENT_META[b.id] ?? DEFAULT_META).rarity] ?? 2;
        return ra - rb;
      });
    return [...sort(achievements.filter(a => a.unlocked)), ...sort(achievements.filter(a => !a.unlocked))];
  }, [achievements]);

  return (
    <div className="relative flex flex-col" style={{ width: '100%', height: '100%', minHeight: '100%', background: '#04080d', overflow: 'hidden' }}>
      {/* 背景 */}
      <div className="absolute inset-0" style={{ backgroundImage: "url('/bg-menu.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.14 }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% -5%, rgba(167,139,250,0.12) 0%, transparent 55%), linear-gradient(180deg, rgba(2,5,10,0.92) 0%, rgba(3,8,14,0.78) 40%, rgba(2,5,10,0.96) 100%)' }} />
      <div className="absolute top-0 left-0 right-0" style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.55) 50%, transparent 100%)' }} />

      {/* 顶部标题栏 */}
      <div className="relative z-20 flex items-center px-4 pt-10 pb-4" style={{ gap: 10 }}>
        <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.24em', marginBottom: 1 }}>Hall of Achievements</div>
          <div style={{ color: '#ffffff', fontSize: '1.10rem', fontWeight: 700, letterSpacing: '0.04em' }}>成就堂</div>
        </div>
        <div style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.28)', color: '#c084fc', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.10em' }}>
          {unlockedCount}/{totalCount}
        </div>
      </div>

      {/* 总进度条 */}
      <div className="relative z-20 px-4 pb-4">
        <div style={{ padding: '10px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.62rem', letterSpacing: '0.06em' }}>解锁进度</span>
            <span style={{ color: '#c084fc', fontSize: '0.68rem', fontWeight: 700 }}>{totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.08)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #a78bfa 0%, #c084fc 100%)', boxShadow: '0 0 8px rgba(167,139,250,0.40)' }}
            />
          </div>
        </div>
      </div>

      {/* 成就列表 */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-8" style={{ paddingTop: 2 }}>
        <div className="space-y-2.5">
          {sortedAchievements.map((achievement, index) => {
            const meta = ACHIEVEMENT_META[achievement.id] ?? DEFAULT_META;
            const isLegend = meta.rarity === '传说';
            const isRare = meta.rarity === '稀有';
            const isSpecial = isLegend || isRare;
            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: achievement.unlocked ? 1 : 0.42, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.25 }}
                style={{
                  borderRadius: 18,
                  background: achievement.unlocked && isLegend
                    ? `linear-gradient(135deg, rgba(6,10,16,0.97) 0%, ${meta.colorDim} 100%)`
                    : 'rgba(7,12,18,0.90)',
                  border: `1px solid ${achievement.unlocked && isSpecial ? meta.colorBorder : achievement.unlocked ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
                  boxShadow: achievement.unlocked && isSpecial ? `0 0 18px ${meta.glow}, 0 3px 12px rgba(0,0,0,0.28)` : '0 2px 8px rgba(0,0,0,0.22)',
                  backdropFilter: 'blur(10px)',
                  overflow: 'hidden', position: 'relative',
                }}
              >
                {achievement.unlocked && isSpecial && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent 0%, ${meta.color} 50%, transparent 100%)`, opacity: 0.65 }} />
                )}
                <div className="flex items-center" style={{ padding: '12px', gap: 12 }}>
                  <CrystalIcon icon={achievement.icon} unlocked={achievement.unlocked} color={meta.color} glow={meta.glow} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div style={{ color: achievement.unlocked ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.28)', fontSize: '0.90rem', fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1.3 }}>
                        {achievement.title}
                      </div>
                      {isSpecial && (
                        <span style={{ fontSize: '0.48rem', padding: '1px 6px', borderRadius: 999, background: meta.colorDim, border: `1px solid ${meta.colorBorder}`, color: meta.color, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', flexShrink: 0 }}>
                          {meta.rarity}
                        </span>
                      )}
                    </div>
                    <div style={{ color: achievement.unlocked ? 'rgba(255,255,255,0.40)' : 'rgba(255,255,255,0.16)', fontSize: '0.68rem', lineHeight: 1.5 }}>
                      {achievement.description}
                    </div>
                    {achievement.unlocked && achievement.unlockedAt && (
                      <div style={{ color: meta.color, fontSize: '0.58rem', marginTop: 4, opacity: 0.65, letterSpacing: '0.04em' }}>
                        {new Date(achievement.unlockedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} 解锁
                      </div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, paddingRight: 2 }}>
                    {achievement.unlocked ? (
                      <div style={{ width: 22, height: 22, borderRadius: 999, background: meta.colorDim, border: `1px solid ${meta.colorBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                          <path d="M5 13l4 4L19 7" stroke={meta.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    ) : (
                      <div style={{ width: 22, height: 22, borderRadius: 999, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                          <rect x="5" y="11" width="14" height="10" rx="2" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                          <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
