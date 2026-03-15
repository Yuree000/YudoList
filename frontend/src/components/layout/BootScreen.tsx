export function BootScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="space-y-4 text-center">
        <p className="section-kicker">正在准备工作台</p>
        <h1
          className="text-5xl font-semibold sm:text-6xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          YudoList
        </h1>
        <p className="muted-copy text-lg">正在恢复主题与登录状态…</p>
      </div>
    </div>
  );
}
