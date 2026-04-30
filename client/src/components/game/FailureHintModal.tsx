// 《元素决斗》错误出牌教学提示框
// 当玩家打出无法破甲的牌时，居中弹出，用简短化学原理解释为什么该反应无法发生
// 设计风格：炼金术士实验室 × 赛博朋克 — 红色警告主题，3秒自动消失

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FailureReason } from '@/lib/battleEngine';

interface FailureHintModalProps {
  reason: FailureReason | null;
  onClose: () => void;
}

export default function FailureHintModal({ reason, onClose }: FailureHintModalProps) {
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 用ref存储最新onClose，避免useEffect因onClose引用变化而重新触发
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!reason) {
      setProgress(100);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    // 重置进度
    setProgress(100);

    // 清除上一次的定时器
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // 进度条动画（4秒）
    const totalMs = 4000;
    const stepMs = 50;
    const steps = totalMs / stepMs;
    let currentStep = 0;

    intervalRef.current = setInterval(() => {
      currentStep++;
      setProgress(Math.max(0, 100 - (currentStep / steps) * 100));
    }, stepMs);

    // 4秒后自动关闭（使用ref避免stale closure）
    timeoutRef.current = setTimeout(() => {
      onCloseRef.current();
    }, totalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  // 只依赖reason，不依赖onClose（通过ref访问最新值）
  }, [reason]);

  const handleClose = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onCloseRef.current();
  }, []);

  return (
    <AnimatePresence>
      {reason && (
        <>
          {/* 背景遮罩（半透明，不阻止游戏操作） */}
          <motion.div
            className="absolute inset-0 z-50 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* 教学提示框 — 居中显示 */}
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="pointer-events-auto w-full mx-4"
              style={{ maxWidth: 292 }}
              initial={{ scale: 0.84, y: -14, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: -8, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            >
              {/* 主卡片 */}
              <div
                className="relative rounded-xl overflow-hidden border-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(20,5,5,0.97) 0%, rgba(40,10,10,0.97) 100%)',
                  borderColor: 'rgba(239,68,68,0.7)',
                  boxShadow: '0 0 40px rgba(239,68,68,0.3), 0 0 80px rgba(239,68,68,0.1), inset 0 0 30px rgba(239,68,68,0.05)',
                }}
              >
                {/* 顶部进度条 */}
                <div className="h-1 w-full bg-red-950">
                  <motion.div
                    className="h-full bg-red-500"
                    style={{ width: `${progress}%` }}
                    transition={{ duration: 0 }}
                  />
                </div>

                {/* 内容区 */}
                <div className="p-4">
                  {/* 标题行 */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {/* 警告图标 */}
                      <motion.div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-base"
                        style={{
                          background: 'rgba(239,68,68,0.2)',
                          border: '1px solid rgba(239,68,68,0.5)',
                        }}
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.5, repeat: 2 }}
                      >
                        ⚗️
                      </motion.div>
                      <div>
                        <div className="text-red-400 font-bold text-[12px] tracking-wider uppercase">
                          反应无法发生
                        </div>
                        <div className="text-red-600 text-[11px]">
                          {reason.cardName} × {reason.armorName}
                        </div>
                      </div>
                    </div>
                    {/* 关闭按钮 */}
                    <button
                      onClick={handleClose}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-red-700 hover:text-red-400 hover:bg-red-900/30 transition-colors text-[10px]"
                    >
                      ✕
                    </button>
                  </div>

                  {/* 失败原因 — 一句话核心 */}
                  <div
                    className="rounded-lg p-3 mb-3"
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.2)',
                    }}
                  >
                    <div className="text-red-300 font-semibold text-[12px] leading-relaxed">
                      ❌ {reason.whyFailed}
                    </div>
                  </div>

                  {/* 化学原理说明 */}
                  <div
                    className="rounded-lg p-3 mb-3"
                    style={{
                      background: 'rgba(255,200,50,0.05)',
                      border: '1px solid rgba(255,200,50,0.15)',
                    }}
                  >
                    <div className="text-yellow-600 text-[10px] font-medium mb-1 uppercase tracking-wider">
                      📚 化学原理
                    </div>
                    <div className="text-yellow-200/80 text-[11px] leading-relaxed">
                      {reason.chemPrinciple}
                    </div>
                  </div>

                  {/* 提示：应该用什么牌 */}
                  <div
                    className="rounded-lg p-3"
                    style={{
                      background: 'rgba(34,197,94,0.05)',
                      border: '1px solid rgba(34,197,94,0.2)',
                    }}
                  >
                    <div className="text-green-600 text-[10px] font-medium mb-1 uppercase tracking-wider">
                      💡 正确思路
                    </div>
                    <div className="text-green-300/80 text-[11px] leading-relaxed">
                      {reason.hint}
                    </div>
                  </div>

                  {/* 底部提示 */}
                  <div className="mt-2.5 text-center text-red-800 text-[10px]">
                    {Math.ceil(progress / 25)}秒后自动关闭 · 点击任意处关闭
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
