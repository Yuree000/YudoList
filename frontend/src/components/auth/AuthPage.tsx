import { startTransition, useState, type FormEvent } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { ApiClientError } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { AuthEditorialPanel } from './AuthEditorialPanel';
import { AuthField } from './AuthField';
import { modeCopy } from './authCopy';

type AuthMode = 'login' | 'register';

interface FormState {
  username: string;
  email: string;
  password: string;
}

export function AuthPage() {
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);

  const [mode, setMode] = useState<AuthMode>('login');
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    username: '',
    email: '',
    password: '',
  });

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const switchMode = (nextMode: AuthMode) => {
    if (nextMode === mode) return;
    startTransition(() => {
      setMode(nextMode);
      setError(null);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      if (mode === 'login') {
        await login({
          email: form.email.trim().toLowerCase(),
          password: form.password,
        });
        return;
      }

      await register({
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError) {
        setError(caughtError.message);
        return;
      }

      setError('请求被中断，请稍后重试。');
    }
  };

  const currentModeCopy = modeCopy[mode];

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-x-[-12%] top-[-10rem] h-[26rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(217,119,6,0.18),transparent_58%)] blur-3xl dark:bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.14),transparent_62%)]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <AuthEditorialPanel />

        <section className="paper-panel flex flex-col justify-between gap-6 px-6 py-8 sm:px-8">
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <p className="section-kicker">账号验证</p>
              <div
                className="rounded-full border px-3 py-1 text-xs tracking-[0.18em] uppercase"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                S4 已上线
              </div>
            </div>

            <div className="space-y-3">
              <h2
                className="text-4xl leading-tight font-semibold"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {currentModeCopy.title}
              </h2>
              <p className="text-base leading-7 muted-copy">{currentModeCopy.blurb}</p>
            </div>
          </div>

          <div
            className="flex rounded-full border p-1"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {(['login', 'register'] as const).map((nextMode) => {
              const isActive = mode === nextMode;
              const label = nextMode === 'login' ? '登录' : '注册';

              return (
                <button
                  key={nextMode}
                  type="button"
                  onClick={() => switchMode(nextMode)}
                  className="flex-1 rounded-full px-4 py-3 text-xs tracking-[0.18em] uppercase transition"
                  style={{
                    backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--color-text-muted)',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <form className="space-y-5" onSubmit={(e) => void handleSubmit(e)}>
            {mode === 'register' ? (
              <AuthField
                id="username"
                label="用户名"
                placeholder="paper-margins"
                value={form.username}
                autoComplete="username"
                onChange={(value) => setField('username', value)}
              />
            ) : null}

            <AuthField
              id="email"
              label="邮箱"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              autoComplete="email"
              onChange={(value) => setField('email', value)}
            />

            <AuthField
              id="password"
              label="密码"
              type="password"
              placeholder="至少 6 个字符"
              value={form.password}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onChange={(value) => setField('password', value)}
            />

            {error ? (
              <div
                className="rounded-[1.5rem] border px-4 py-3 text-sm leading-6"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-danger) 40%, var(--color-border))',
                  color: 'var(--color-danger)',
                  backgroundColor: 'color-mix(in srgb, var(--color-danger) 6%, transparent)',
                }}
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              className="ink-button w-full justify-between"
              disabled={isSubmitting}
            >
              <span>{isSubmitting ? '请稍候…' : currentModeCopy.action}</span>
              <ArrowUpRight size={18} />
            </button>
          </form>

          <div className="hairline" />

          <p className="text-sm leading-7 muted-copy">
            {mode === 'login'
              ? '使用已有账号登录，或切换到注册页面创建新账号。'
              : '注册成功后将自动登录，你的工作台随即加载。'}
          </p>
        </section>
      </div>
    </div>
  );
}
