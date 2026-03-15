import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ListView } from '../list/ListView';
import { CalendarBar } from '../calendar/CalendarBar';
import { RecurringModal } from '../calendar/RecurringModal';
import { SidePanel } from '../panel/SidePanel';
import { HelpPanel } from '../common/HelpPanel';
import { useListStore } from '../../stores/listStore';
import { Container } from './Container';
import { Header } from './Header';

export function AuthenticatedHome() {
  const items = useListStore((state) => state.items);
  const [recurringOpen, setRecurringOpen] = useState(false);

  return (
    <Container>
      <Header itemCount={items.length} />

      <main className="mx-auto w-full max-w-5xl">
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">

          {/* Left: main list panel */}
          <div className="paper-panel flex flex-col gap-5 px-6 py-6 sm:px-8">
            <div className="flex items-center justify-between gap-3">
              <CalendarBar />
              <button
                type="button"
                onClick={() => setRecurringOpen(true)}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition hover:opacity-70"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                title="创建循环事件"
              >
                <RefreshCw size={12} />
                循环
              </button>
            </div>

            <div className="hairline" />
            <ListView />
          </div>

          {/* Right: side panel (activity + scratchpad) */}
          <SidePanel />
        </div>
      </main>

      <HelpPanel />
      {recurringOpen && <RecurringModal onClose={() => setRecurringOpen(false)} />}
    </Container>
  );
}
