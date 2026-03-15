import { Clock3, MoonStar, Sparkles, SunMedium } from 'lucide-react';

interface HomeFootnotesProps {
  resolvedTheme: 'light' | 'dark';
}

export function HomeFootnotes({ resolvedTheme }: HomeFootnotesProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
      <article className="paper-panel flex flex-col gap-6 px-6 py-6">
        <p className="section-kicker">当前主题</p>
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full border"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {resolvedTheme === 'dark' ? <MoonStar size={18} /> : <SunMedium size={18} />}
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">
              {resolvedTheme === 'dark' ? '深色暖调模式' : '亮色纸感模式'}
            </h3>
            <p className="text-sm leading-7 muted-copy">
              主题跟随系统偏好，也可手动切换，刷新后依然保持你的选择。
            </p>
          </div>
        </div>
      </article>

      <article className="paper-panel px-6 py-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-3">
            <p className="section-kicker">快捷键</p>
            <h3 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              像编辑器一样操作。
            </h3>
            <p className="text-sm leading-7 muted-copy">
              回车新建、Tab 缩进、Shift+Tab 提升、拖拽排序、Ctrl+Z 撤销、Ctrl+K 聚焦搜索。
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Clock3 size={18} className="mt-1 shrink-0" />
              <p className="text-sm leading-7 muted-copy">
                刷新页面后，登录状态自动恢复，无需重新登录。
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles size={18} className="mt-1 shrink-0" />
              <p className="text-sm leading-7 muted-copy">
                完成的条目自动沉底，支持批量选择删除与撤销还原。
              </p>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
