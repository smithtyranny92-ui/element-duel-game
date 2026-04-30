export default function KnowledgePage({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ minHeight: '100%', background: '#050e14', color: '#fff', padding: 24 }}>
      <button onClick={onBack} style={{ marginBottom: 16 }}>返回</button>
      <h1>知识图鉴</h1>
      <p style={{ opacity: 0.7 }}>该页面将在后续继续恢复完整内容。</p>
    </div>
  );
}
