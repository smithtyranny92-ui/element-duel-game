import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CARD_MAP } from '../../lib/cardData';
import ElementCardComponent from './ElementCard';

interface Props {
  isOpen?: boolean;
  drawPile: string[];
  onClose: () => void;
}

export default function DrawPileModal({ isOpen = false, drawPile, onClose }: Props) {
  if (!isOpen) return null;
  // 统计各牌数量
  const cardCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    drawPile.forEach(id => { counts[id] = (counts[id] ?? 0) + 1; });
    return counts;
  }, [drawPile]);

  // 去重后的牌列表（按数量降序）
  const uniqueCards = useMemo(() =>
    Object.entries(cardCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id),
    [cardCounts]
  );

  return (
    <motion.div
      className="absolute inset-0 z-40 flex items-end justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        className="relative w-full max-w-2xl bg-slate-900/95 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ type: 'spring', damping: 25 }}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <div>
            <h3 className="text-white font-bold flex items-center gap-2">
              <span className="text-cyan-400">🃏</span>
              牌库
              <span className="text-slate-400 text-sm font-normal">（共 {drawPile.length} 张）</span>
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">牌库中的牌将随机抽取，顺序已洗牌</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl transition-colors">×</button>
        </div>

        {/* 牌库内容 */}
        <div className="p-4">
          {drawPile.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              <div className="text-3xl mb-2">📭</div>
              <div>牌库已空，弃牌堆将自动洗牌补充</div>
            </div>
          ) : (
            <>
              {/* 统计摘要 */}
              <div className="flex flex-wrap gap-2 mb-4 px-1">
                {uniqueCards.map(cardId => {
                  const card = CARD_MAP[cardId];
                  if (!card) return null;
                  return (
                    <div
                      key={cardId}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-600/60 bg-slate-800/60 text-xs"
                    >
                      <span className="text-base leading-none">{card.symbol}</span>
                      <span className="text-slate-300 font-medium">{card.name}</span>
                      <span className="text-cyan-400 font-bold">×{cardCounts[cardId]}</span>
                    </div>
                  );
                })}
              </div>

              {/* 牌面展示（去重，显示数量徽章） */}
              <div className="flex flex-wrap gap-3 justify-center max-h-64 overflow-y-auto pr-1">
                {uniqueCards.map((cardId) => (
                  <div key={cardId} className="relative">
                    <ElementCardComponent
                      cardId={cardId}
                      size="md"
                      disabled={true}
                    />
                    {/* 数量徽章 */}
                    {cardCounts[cardId] > 1 && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-cyan-500 border-2 border-slate-900 flex items-center justify-center">
                        <span className="text-white text-[10px] font-black leading-none">{cardCounts[cardId]}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 底部提示 */}
        <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-950/40">
          <p className="text-slate-600 text-xs text-center">
            💡 牌库耗尽时，弃牌堆会自动洗牌并补充为新牌库
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
