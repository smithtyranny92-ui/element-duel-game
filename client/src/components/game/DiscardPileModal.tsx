import React from 'react';
import { motion } from 'framer-motion';
import { CARD_MAP } from '../../lib/cardData';
import ElementCardComponent from './ElementCard';

interface Props {
  isOpen?: boolean;
  discardPile: string[];
  onClose: () => void;
  onSelectCard?: (cardId: string) => void;
  isRecoverMode?: boolean;
}

export default function DiscardPileModal({ isOpen = false, discardPile, onClose, onSelectCard, isRecoverMode }: Props) {
  if (!isOpen) return null;

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
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <div>
            <h3 className="text-white font-bold">弃牌堆</h3>
            {isRecoverMode && (
              <p className="text-yellow-400 text-xs mt-0.5">选择一张牌回收到手牌</p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl transition-colors">×</button>
        </div>

        <div className="p-4">
          {discardPile.length === 0 ? (
            <div className="text-center text-slate-500 py-8">弃牌堆为空</div>
          ) : (
            <div className="flex flex-wrap gap-3 justify-center max-h-60 overflow-y-auto">
              {[...discardPile].reverse().map((cardId, i) => (
                <div
                  key={i}
                  onClick={() => isRecoverMode && onSelectCard ? onSelectCard(cardId) : undefined}
                  className={isRecoverMode ? 'cursor-pointer' : ''}
                >
                  <ElementCardComponent
                    cardId={cardId}
                    size="md"
                    isWaitingRecover={isRecoverMode}
                    disabled={!isRecoverMode}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
