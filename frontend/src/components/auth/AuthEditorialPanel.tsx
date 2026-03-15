import { ArrowUpRight } from 'lucide-react';
import { featureRows } from './authCopy';

export function AuthEditorialPanel() {
  return (
    <section className="paper-panel flex flex-col justify-between gap-10 px-6 py-8 sm:px-8 lg:px-10">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="section-kicker">编辑式 / 暖色调</p>
          <h1
            className="max-w-xl text-5xl leading-none font-semibold sm:text-6xl lg:text-7xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            在想法消散前，先写下来。
          </h1>
        </div>

        <p className="max-w-xl text-lg leading-8 muted-copy sm:text-xl">
          YudoList 为开发者和知识工作者而生——一个行为更像页边备注而非仪表盘的清单界面。
        </p>
      </div>

      <div className="grid gap-4">
        {featureRows.map((row) => {
          const Icon = row.icon;

          return (
            <article
              key={row.title}
              className="grid gap-4 rounded-[1.75rem] border px-5 py-5 sm:grid-cols-[auto_1fr]"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full border"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <Icon size={18} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">{row.title}</h2>
                  <ArrowUpRight size={16} className="opacity-60" />
                </div>
                <p className="text-sm leading-7 muted-copy">{row.description}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
