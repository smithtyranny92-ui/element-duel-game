export default function DemoMode({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: '#050e14', color: '#fff', padding: 24 }}>
      <button onClick={onClose} style={{ marginBottom: 16 }}>返回</button>
      <h1>演示模式</h1>
      <p style={{ opacity: 0.7 }}>演示模式内容将在后续恢复。</p>
    </div>
  );
}
