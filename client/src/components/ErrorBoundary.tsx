import React from 'react';

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error: error instanceof Error ? error.message : '页面发生错误' };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#040b10', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
          <div>
            <h2 style={{ fontSize: 24, marginBottom: 12 }}>页面加载失败</h2>
            <p style={{ opacity: 0.75 }}>{this.state.error ?? '请刷新后重试'}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
