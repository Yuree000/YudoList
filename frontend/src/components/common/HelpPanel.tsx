import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

const shortcuts = [
  { key: 'Enter', desc: '在下方新建条目' },
  { key: 'Tab', desc: '增加缩进层级' },
  { key: 'Shift+Tab', desc: '减少缩进层级' },
  { key: '/h + Enter', desc: '转为分组标题' },
  { key: 'Backspace', desc: '删除空行' },
  { key: 'Ctrl+Z', desc: '撤销' },
  { key: 'Ctrl+Shift+Z', desc: '重做' },
  { key: 'Ctrl+K', desc: '聚焦搜索框' },
  { key: '拖拽', desc: '拖拽排序' },
];

export function HelpPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {open && (
        <div
          className="paper-panel mb-1 w-60 p-4"
          style={{
            boxShadow: '0 8px 32px color-mix(in srgb, var(--color-text) 14%, transparent)',
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span
              className="text-xs font-semibold tracking-[0.14em] uppercase"
              style={{ color: 'var(--color-text-muted)' }}
            >
              操作指南
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ color: 'var(--color-text-muted)' }}
              aria-label="关闭"
            >
              <X size={13} />
            </button>
          </div>

          <div className="space-y-2.5">
            {shortcuts.map(({ key, desc }) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span
                  className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-border) 80%, transparent)',
                    color: 'var(--color-text)',
                  }}
                >
                  {key}
                </span>
                <span className="text-xs muted-copy text-right">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-full border shadow-md transition hover:opacity-80"
        style={{
          borderColor: open ? 'var(--color-primary)' : 'var(--color-border)',
          backgroundColor: open
            ? 'color-mix(in srgb, var(--color-primary) 10%, var(--color-bg))'
            : 'var(--color-bg)',
          color: open ? 'var(--color-primary)' : 'var(--color-text-muted)',
        }}
        aria-label="操作指南"
      >
        <HelpCircle size={18} />
      </button>
    </div>
  );
}
