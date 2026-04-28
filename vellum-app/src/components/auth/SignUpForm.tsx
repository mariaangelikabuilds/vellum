'use client';

import { useClerk } from '@clerk/nextjs';
import { useSignUp } from '@clerk/nextjs/legacy';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

type Stage = 'form' | 'verify';

export function SignUpForm() {
  const { isLoaded, signUp } = useSignUp();
  const { setActive } = useClerk();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onGoogle = async () => {
    if (!isLoaded || submitting) return;
    setError(null);
    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/app',
      });
    } catch (err) {
      setError(extractClerkError(err));
    }
  };

  const submitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStage('verify');
    } catch (err) {
      setError(extractClerkError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push('/app');
      } else {
        setError('verification incomplete — try the code again');
      }
    } catch (err) {
      setError(extractClerkError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <header className="mb-8">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-3">
          vellum · {stage === 'form' ? 'create account' : 'verify email'}
        </p>
        <h1 className="font-serif text-3xl leading-tight tracking-tight text-ink">
          {stage === 'form' ? 'Start writing.' : 'Check your email.'}
        </h1>
        <p className="mt-2 font-serif text-base italic text-ink-2">
          {stage === 'form'
            ? 'A graph-of-claims word processor for serious writing.'
            : `We sent a six-digit code to ${email}. Paste it below.`}
        </p>
      </header>

      {stage === 'form' ? (
        <>
          <button
            type="button"
            onClick={onGoogle}
            disabled={!isLoaded || submitting}
            className="mb-5 flex w-full items-center justify-center gap-2 border border-rule bg-canvas px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-ink hover:border-rule-strong disabled:opacity-50"
          >
            <GoogleGlyph />
            continue with Google
          </button>

          <div className="mb-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-ink-3">
            <span className="h-px flex-1 bg-rule" />
            or
            <span className="h-px flex-1 bg-rule" />
          </div>

        <form onSubmit={submitCredentials} className="space-y-5">
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
              autoComplete="new-password"
              minLength={8}
              className="w-full border border-rule bg-canvas px-3 py-2.5 font-serif text-base text-ink placeholder:text-ink-3 focus:border-rule-strong focus:outline-none"
            />
            <span className="mt-1 block font-serif text-xs italic text-ink-3">
              eight characters or more.
            </span>
          </Field>

          <div id="clerk-captcha" />

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
            {submitting ? 'creating account…' : 'continue'}
          </button>
        </form>
        </>
      ) : (
        <form onSubmit={submitCode} className="space-y-5">
          <Field label="verification code">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
              inputMode="numeric"
              maxLength={6}
              className="w-full border border-rule bg-canvas px-3 py-3 text-center font-mono text-2xl tracking-[0.4em] text-ink focus:border-rule-strong focus:outline-none"
              placeholder="······"
            />
          </Field>

          {error && (
            <p className="border border-red-300 bg-red-50 px-3 py-2 font-serif text-sm text-red-900">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!isLoaded || submitting || code.length !== 6}
            className="w-full border border-rule-strong bg-ink px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-canvas hover:bg-ink-2 disabled:opacity-50"
          >
            {submitting ? 'verifying…' : 'verify + sign in'}
          </button>

          <button
            type="button"
            onClick={() => {
              setStage('form');
              setCode('');
              setError(null);
            }}
            className="w-full font-serif text-sm italic text-ink-2 hover:text-ink"
          >
            ← change email
          </button>
        </form>
      )}

      <footer className="mt-8 border-t border-rule pt-5 font-serif text-sm text-ink-2">
        <p>
          Already have an account?{' '}
          <Link href="/sign-in" className="text-ink underline-offset-4 hover:underline">
            Sign in.
          </Link>
        </p>
      </footer>
    </div>
  );
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

function extractClerkError(err: unknown): string {
  if (
    err &&
    typeof err === 'object' &&
    'errors' in err &&
    Array.isArray((err as { errors: { message: string }[] }).errors)
  ) {
    return (err as { errors: { message: string }[] }).errors[0]?.message ?? 'something went wrong';
  }
  return 'something went wrong';
}
