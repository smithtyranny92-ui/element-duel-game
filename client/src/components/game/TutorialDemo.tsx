/**
 * TutorialDemo — 演示视频弹窗（移动端适配版）
 * 播放真实战斗界面录制的第一关演示视频
 */

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TutorialDemoProps {
  onClose: () => void;
}

export default function TutorialDemo({ onClose }: TutorialDemoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // 键盘关闭
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // 自动播放
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[160] flex items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="flex flex-col rounded-xl overflow-hidden w-full"
        style={{
          maxWidth: 'min(960px, 100%)',
          maxHeight: '95vh',
          background: 'rgba(4,10,18,0.99)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.95)',
        }}
        initial={{ scale: 0.94, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 24 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {/* 顶部栏 */}
        <div
          className="flex items-center px-4 py-2.5 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span
            className="text-xs px-2 py-0.5 rounded mr-2 shrink-0"
            style={{
              background: 'rgba(167,139,250,0.1)',
              border: '1px solid rgba(167,139,250,0.25)',
              color: 'rgba(196,181,253,0.7)',
            }}
          >
            游戏演示
          </span>
          <span className="text-white/50 text-xs flex-1 truncate">
            第一关 · 氢与氧的相遇 — 真实战斗全程
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ml-2"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.75rem',
            }}
          >
            ✕
          </button>
        </div>

        {/* 视频区域 — 移动端全宽，保持 16:10 比例 */}
        <div
          className="relative w-full shrink-0"
          style={{
            aspectRatio: '16/10',
            background: '#000',
            // 在极小屏幕上限制最大高度，避免视频超出屏幕
            maxHeight: 'calc(95vh - 88px)',
          }}
        >
          <video
            ref={videoRef}
            src="/demo.webm"
            controls
            autoPlay
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-contain"
            style={{ display: 'block' }}
          />
        </div>

        {/* 底部说明 — 移动端隐藏以节省空间 */}
        <div
          className="hidden sm:flex items-center px-4 py-2 shrink-0 gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span className="text-slate-600 text-xs">
            出牌流程 · 护甲破除 · 能量/行动力 · Boss 战 · 关卡结算
          </span>
          <span className="text-slate-700 text-xs ml-auto">Esc 关闭</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
