import { Search, X } from 'lucide-react';
import { registerSearchInput } from '../../lib/searchRef';
import { useAuthStore } from '../../stores/authStore';
import { useListStore } from '../../stores/listStore';
import { useThemeStore } from '../../stores/themeStore';

const themeModes = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '亮色' },
  { value: 'dark', label: '深色' },
] as const;

interface HeaderProps {
  itemCount: number;
}

export function Header({ itemCount }: HeaderProps) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const clearItems = useListStore((state) => state.clear);
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const searchQuery = useListStore((state) => state.searchQuery);
  const setSearchQuery = useListStore((state) => state.setSearchQuery);

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    clearItems();
    logout();
  };

  return (
    <header className="paper-panel flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-end gap-3">
          <h1
            className="text-4xl font-semibold tracking-tight sm:text-5xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            YudoList
          </h1>
          <span
            className="rounded-full border px-3 py-1 text-xs tracking-[0.24em] uppercase"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-muted)',
            }}
          >
            {itemCount} 条已同步
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        {/* Search bar */}
        <div
          className="flex items-center gap-2 rounded-full border px-3 py-2"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Search size={14} style={{ color: 'var(--color-text-muted)' }} />
          <input
            ref={(el) => registerSearchInput(el)}
            type="search"
            placeholder="搜索… ⌘K"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-36 bg-transparent text-sm outline-none placeholder:text-[var(--color-text-muted)]"
            style={{ color: 'var(--color-text)' }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="清除搜索"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Theme toggle */}
        <div
          className="flex rounded-full border p-1"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {themeModes.map((themeMode) => {
            const isActive = mode === themeMode.value;

            return (
              <button
                key={themeMode.value}
                type="button"
                onClick={() => setMode(themeMode.value)}
                className="rounded-full px-3 py-2 text-xs tracking-[0.12em] transition"
                style={{
                  backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--color-text-muted)',
                }}
              >
                {themeMode.label}
              </button>
            );
          })}
        </div>

        <div
          className="rounded-[1.5rem] border px-4 py-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-sm font-semibold">{user.username}</p>
          <p className="text-sm muted-copy">{user.email}</p>
        </div>

        <button type="button" onClick={handleLogout} className="ink-button ink-button--ghost">
          退出登录
        </button>
      </div>
    </header>
  );
}
