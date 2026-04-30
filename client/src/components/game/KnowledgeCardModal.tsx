import React from 'react';
import { motion } from 'framer-motion';
import { KnowledgeCard } from '../../lib/levelData';

interface Props {
  card: KnowledgeCard | null;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  '碱金属': 'from-orange-900 to-orange-800',
  '卤素': 'from-purple-900 to-purple-800',
  '非金属': 'from-green-900 to-green-800',
  '化合物': 'from-blue-900 to-blue-800',
  '过渡金属': 'from-amber-900 to-amber-800',
  '稀有气体': 'from-cyan-900 to-cyan-800',
  '规律': 'from-indigo-900 to-indigo-800',
  '反应类型': 'from-rose-900 to-rose-800',
  '应用': 'from-teal-900 to-teal-800',
  '综合': 'from-violet-900 to-violet-800',
  '特殊': 'from-slate-800 to-slate-700',
};

export default function KnowledgeCardModal({ card, onClose }: Props) {
  if (!card) return null;

  const bgGradient = CATEGORY_COLORS[card.category] ?? 'from-slate-900 to-slate-800';

  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        className={`relative w-full max-w-md bg-gradient-to-br ${bgGradient} border border-white/10 rounded-3xl overflow-hidden shadow-2xl`}
        style={{ maxHeight: '92%', overflowY: 'auto' }}
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 40 }}
        transition={{ type: 'spring', damping: 20 }}
      >
        {/* 顶部装饰 */}
        <div className="relative h-24 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-20"
            style={{ background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.3), transparent 70%)' }} />
          <div className="text-center z-10">
            {card.element && (
              <div className="text-5xl font-bold text-white/90 leading-none"
                style={{ textShadow: '0 0 30px rgba(255,255,255,0.5)' }}>
                {card.element}
              </div>
            )}
            {!card.element && <div className="text-4xl">📚</div>}
          </div>
          {/* 解锁标签 */}
          <div className="absolute top-3 right-3 bg-yellow-500/20 border border-yellow-500/40 rounded-full px-3 py-1 text-yellow-300 text-xs font-medium">
            ✦ 知识解锁
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-white/10 text-white/60 text-xs px-2 py-0.5 rounded-full">{card.category}</span>
          </div>
          <h2 className="text-white text-xl font-bold mb-3">{card.title}</h2>

          <p className="text-white/80 text-sm leading-relaxed mb-4">{card.content}</p>

          {card.equation && (
            <div className="bg-black/30 border border-white/10 rounded-xl p-3 mb-4">
              <div className="text-xs text-white/50 mb-1 font-medium">化学方程式</div>
              <div className="text-cyan-300 font-mono text-sm leading-relaxed">{card.equation}</div>
            </div>
          )}

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-5">
            <div className="text-xs text-amber-400 mb-1 font-medium">💡 趣味知识</div>
            <div className="text-amber-100 text-sm leading-relaxed">{card.funFact}</div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-3 rounded-xl transition-all text-sm"
          >
            收入图鉴，继续冒险 →
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
