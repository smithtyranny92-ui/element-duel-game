import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BattleState, calculateBattleScore } from '../../lib/battleEngine';
import { Level, KNOWLEDGE_MAP } from '../../lib/levelData';

interface Props {
  phase: BattleState['phase'];
  battleState: BattleState;
  level: Level;
  onRestart: () => void;
  onExit: () => void;
  onNextLevel?: () => void;
  hasNextLevel?: boolean;
}

export default function BattleResultModal({ phase, battleState, level, onRestart, onExit, onNextLevel, hasNextLevel }: Props) {
  if (phase !== 'victory' && phase !== 'defeat') return null;

  const isVictory = phase === 'victory';
  const { stars, score, breakdown } = calculateBattleScore(battleState, level);
  const knowledgeCard = KNOWLEDGE_MAP[level.knowledgeCardId];

  const defeatReason = battleState.currentRound > battleState.maxRounds
    ? `超过 ${battleState.maxRounds} 回合限制！`
    : '玩家HP耗尽！';

  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

      <motion.div
        className={`relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border ${
          isVictory
            ? 'bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 border-emerald-600/40'
            : 'bg-gradient-to-br from-red-950 via-slate-900 to-slate-950 border-red-700/40'
        }`}
        initial={{ scale: 0.75, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 18, delay: 0.1 }}
        style={{ maxHeight: '92%', overflowY: 'auto' }}
      >
        {/* 顶部装饰条 */}
        <div className={`h-1 w-full ${isVictory ? 'bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500' : 'bg-gradient-to-r from-red-700 via-orange-500 to-red-700'}`} />

        {/* 标题区 */}
        <div className="text-center pt-6 pb-3 px-6">
          <motion.div
            className="text-5xl mb-2"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 12, delay: 0.3 }}
          >
            {isVictory ? '🎉' : '💀'}
          </motion.div>
          <h2 className={`text-2xl font-black tracking-wide ${isVictory ? 'text-emerald-300' : 'text-red-300'}`}>
            {isVictory ? '实验成功！' : '实验失败'}
          </h2>
          <p className="text-slate-400 text-sm mt-1 font-medium">{level.title} · {level.subtitle}</p>
        </div>

        {isVictory && (
          <>
            <div className="flex justify-center gap-3 mb-4">
              {[1, 2, 3].map(s => (
                <motion.div
                  key={s}
                  className={`text-4xl ${s <= stars ? 'opacity-100' : 'opacity-15 grayscale'}`}
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.4 + s * 0.15, type: 'spring', stiffness: 200 }}
                >
                  ⭐
                </motion.div>
              ))}
            </div>

            <div className="mx-5 mb-3 bg-black/40 rounded-2xl p-4 border border-slate-700/40">
              <div className="text-center mb-3">
                <div className="text-slate-500 text-xs mb-1 uppercase tracking-wider">总得分</div>
                <motion.div
                  className="text-4xl font-black text-amber-300"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7, type: 'spring' }}
                >
                  {score}
                </motion.div>
              </div>
              <div className="space-y-1.5">
                {breakdown.map((b, i) => {
                  const parts = b.split('：');
                  const isNeg = b.includes('-');
                  return (
                    <motion.div
                      key={i}
                      className="flex justify-between text-xs"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + i * 0.1 }}
                    >
                      <span className="text-slate-400">{parts[0]}</span>
                      <span className={`font-mono font-bold ${isNeg ? 'text-red-400' : 'text-emerald-400'}`}>
                        {parts[1]}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="mx-5 mb-4 grid grid-cols-3 gap-2">
              {[
                { label: '使用回合', value: `${battleState.currentRound - 1}/${level.maxRounds}`, ok: battleState.currentRound - 1 <= Math.ceil(level.maxRounds * 0.6) },
                { label: '剩余HP', value: `${battleState.playerHP}`, ok: battleState.playerHP > battleState.playerMaxHP * 0.5 },
                { label: '失误次数', value: `${battleState.totalMistakes}`, ok: battleState.totalMistakes === 0 },
              ].map(stat => (
                <div key={stat.label} className={`rounded-xl p-2.5 text-center border ${stat.ok ? 'bg-emerald-950/40 border-emerald-700/30' : 'bg-slate-800/40 border-slate-700/30'}`}>
                  <div className={`font-black text-lg ${stat.ok ? 'text-emerald-300' : 'text-slate-300'}`}>{stat.value}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {knowledgeCard && (
              <motion.div
                className="mx-5 mb-4 bg-cyan-950/40 border border-cyan-700/40 rounded-2xl p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📖</span>
                  <div className="text-cyan-300 text-sm font-bold">本关知识点</div>
                  <span className="ml-auto text-xs bg-cyan-800/50 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-700/40">
                    {knowledgeCard.category}
                  </span>
                </div>
                <div className="text-slate-300 text-xs leading-relaxed mb-2">
                  {knowledgeCard.content}
                </div>
                {knowledgeCard.equation && (
                  <div className="bg-black/30 rounded-xl px-3 py-2 font-mono text-cyan-400 text-xs border border-cyan-900/50">
                    {knowledgeCard.equation}
                  </div>
                )}
                <div className="mt-2 flex items-start gap-1.5">
                  <span className="text-amber-400 text-xs">💡</span>
                  <div className="text-amber-200/70 text-xs leading-relaxed">{knowledgeCard.funFact}</div>
                </div>
              </motion.div>
            )}
          </>
        )}

        {!isVictory && (
          <div className="mx-5 mb-5">
            <div className="bg-black/40 rounded-2xl p-4 border border-slate-700/40 mb-3 text-center">
              <p className="text-red-300 text-sm font-bold mb-1">{defeatReason}</p>
              <p className="text-slate-400 text-xs">
                已用 {battleState.currentRound - 1} 回合 · 失误 {battleState.totalMistakes} 次
              </p>
            </div>
            <div className="bg-amber-950/40 border border-amber-700/40 rounded-2xl p-3 mb-3">
              <div className="text-amber-400 text-xs font-bold mb-1.5">💡 解题提示</div>
              <div className="text-amber-200/80 text-xs leading-relaxed">{level.hint}</div>
            </div>
            {knowledgeCard && (
              <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-3">
                <div className="text-slate-400 text-xs font-bold mb-1.5">📚 相关知识</div>
                <div className="text-slate-400 text-xs leading-relaxed">{knowledgeCard.content}</div>
                {knowledgeCard.equation && (
                  <div className="mt-2 font-mono text-cyan-500/80 text-xs bg-black/30 rounded-lg px-2 py-1.5">
                    {knowledgeCard.equation}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 px-5 pb-6">
          {/* 过关时：前往下一关（主按钮，仅有下一关时显示） */}
          {isVictory && hasNextLevel && onNextLevel && (
            <button
              onClick={onNextLevel}
              className="w-full font-bold py-3 rounded-xl text-sm transition-all active:scale-95 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2"
            >
              ⚡ 前往下一关 →
            </button>
          )}
          <div className="flex gap-3">
            <button
              onClick={onRestart}
              className={`flex-1 font-bold py-3 rounded-xl text-sm transition-all active:scale-95 ${
                isVictory
                  ? 'bg-slate-700/80 hover:bg-slate-600 text-slate-200 border border-slate-600/50'
                  : 'bg-gradient-to-r from-cyan-700 to-cyan-600 hover:from-cyan-600 hover:to-cyan-500 text-white shadow-lg shadow-cyan-700/30'
              }`}
            >
              {isVictory ? '🔄 再玩一次' : '⚗️ 重新挑战'}
            </button>
            <button
              onClick={onExit}
              className={`flex-1 font-bold py-3 rounded-xl text-sm transition-all active:scale-95 ${
                isVictory
                  ? 'bg-slate-700/80 hover:bg-slate-600 text-slate-200 border border-slate-600/50'
                  : 'bg-slate-700/80 hover:bg-slate-600 text-slate-200 border border-slate-600/50'
              }`}
            >
              {isVictory ? '🗺️ 返回关卡' : '← 返回关卡'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
