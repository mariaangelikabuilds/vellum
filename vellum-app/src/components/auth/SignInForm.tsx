'use client';

import { useClerk } from '@clerk/nextjs';
import { useSignIn } from '@clerk/nextjs/legacy';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export function SignInForm() {
  const { isLoaded, signIn } = useSignIn();
  const { setActive } = useClerk();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push('/app');
      } else {
        setError('additional verification required — visit /sign-in/factor for the next step');
      }
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'errors' in err && Array.isArray((err as { errors: { message: string }[] }).errors)
          ? (err as { errors: { message: string }[] }).errors[0]?.message ?? 'sign-in failed'
          : 'sign-in failed';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm">
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

      <div className="space-y-5">
        <Field label="email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
            required
            autoComplete="current-password"
            className="w-full border border-rule bg-canvas px-3 py-2.5 font-serif text-base text-ink placeholder:text-ink-3 focus:border-rule-strong focus:outline-none"
          />
        </Field>

        {error && (
          <p className="border-l-2 border-amber-700 bg-amber-50 px-3 py-2 font-serif text-sm text-amber-900">
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
      </footer>
    </form>
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
