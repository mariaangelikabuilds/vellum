'use client';

import { useClerk, useAuth } from '@clerk/nextjs';
import { useSignIn } from '@clerk/nextjs/legacy';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInForm() {
  const { isLoaded, signIn } = useSignIn();
  const { setActive, signOut } = useClerk();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isSignedIn) router.replace('/app');
  }, [isSignedIn, router]);

  const onGoogle = async () => {
    if (!isLoaded || submitting) return;
    setError(null);
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/app',
      });
    } catch (err) {
      setError(extractClerkError(err));
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || submitting) return;
    setError(null);

    if (!email.trim()) {
      setError('Enter your email to continue.');
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setError('That email address looks off — check the spelling.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push('/app');
      } else {
        setError('Additional verification required.');
      }
    } catch (err) {
      const message = extractClerkError(err);
      if (/session.*exists/i.test(message)) {
        try { await signOut(); } catch {}
        window.location.href = '/sign-in';
        return;
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onResetSession = async () => {
    setError(null);
    try { await signOut(); } catch {}
    window.location.href = '/sign-in';
  };

  return (
    <form onSubmit={onSubmit} noValidate className="w-full max-w-sm">
      <header className="mb-8">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-3">
          vellum · sign in
        </p>
        <h1 className="font-serif text-3xl leading-tight tracking-tight text-ink">
          Welcome back.
        </h1>
        <p className="mt-2 font-serif text-base italic text-ink-2">
          Pick up where the argument left off.
        </p>
      </header>

      <button
        type="button"
        onClick={onGoogle}
        disabled={!isLoaded || submitting}
        className="mb-5 flex w-full items-center justify-center gap-2 border border-rule bg-canvas px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-ink hover:border-rule-strong hover:text-ink disabled:opacity-50"
      >
        <GoogleGlyph />
        continue with Google
      </button>

      <div className="mb-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-ink-3">
        <span className="h-px flex-1 bg-rule" />
        or
        <span className="h-px flex-1 bg-rule" />
      </div>

      <div className="space-y-5">
        <Field label="email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            autoComplete="email"
            className="w-full border border-rule bg-canvas px-3 py-2.5 font-serif text-base text-ink placeholder:text-ink-3 focus:border-rule-strong focus:outline-none"
            placeholder="you@somewhere.com"
          />
        </Field>

        <Field label="password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full border border-rule bg-canvas px-3 py-2.5 font-serif text-base text-ink placeholder:text-ink-3 focus:border-rule-strong focus:outline-none"
          />
        </Field>

        {error && (
          <p className="border border-red-300 bg-red-50 px-3 py-2 font-serif text-sm text-red-900">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!isLoaded || submitting}
          className="w-full border border-rule-strong bg-ink px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-canvas hover:bg-ink-2 disabled:opacity-50"
        >
          {submitting ? 'signing in…' : 'sign in'}
        </button>
      </div>

      <footer className="mt-8 border-t border-rule pt-5 font-serif text-sm text-ink-2">
        <p>
          New here?{' '}
          <Link href="/sign-up" className="text-ink underline-offset-4 hover:underline">
            Create an account.
          </Link>
        </p>
        <p className="mt-3 font-mono text-xs text-ink-3">
          Stuck on a stale session?{' '}
          <button
            type="button"
            onClick={onResetSession}
            className="underline underline-offset-4 hover:text-ink"
          >
            Reset and start fresh.
          </button>
        </p>
      </footer>
    </form>
  );
}

function extractClerkError(err: unknown): string {
  if (
    err &&
    typeof err === 'object' &&
    'errors' in err &&
    Array.isArray((err as { errors: { message: string }[] }).errors)
  ) {
    return (err as { errors: { message: string }[] }).errors[0]?.message ?? 'Something went wrong.';
  }
  return 'Something went wrong.';
}

function GoogleGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M9 7.36v3.4h4.74c-.2 1.13-1.42 3.32-4.74 3.32a5.08 5.08 0 1 1 0-10.16c1.6 0 2.68.68 3.3 1.27l2.25-2.17A8.1 8.1 0 0 0 9 .82a8.18 8.18 0 1 0 0 16.36c4.72 0 7.85-3.32 7.85-7.99 0-.54-.06-.95-.13-1.36L9 7.36z"
        fill="currentColor"
      />
    </svg>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-ink-3">
        {label}
      </span>
      {children}
    </label>
  );
}
