import type { PropsWithChildren } from 'react';

export function Container({ children }: PropsWithChildren) {
  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-4 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-x-[-20%] top-[-12rem] h-[24rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(217,119,6,0.16),transparent_60%)] blur-3xl dark:bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.12),transparent_65%)]" />
      <div className="pointer-events-none absolute bottom-10 left-[-5rem] h-44 w-44 rounded-full border border-[color:var(--color-border)] opacity-60" />
      <div
        className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl flex-col gap-6 rounded-[2rem] border p-4 backdrop-blur sm:p-6 lg:p-8"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'color-mix(in srgb, var(--color-card) 88%, transparent)',
          boxShadow: '0 35px 90px rgba(28, 25, 23, 0.08)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
