import Link from 'next/link';
import { SignInForm } from '@/components/auth/SignInForm';

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col bg-canvas">
      <nav className="border-b border-rule px-5 py-4 sm:px-8 sm:py-5">
        <Link href="/" className="font-mono text-sm tracking-wide text-ink hover:text-ink-2">
          vellum
        </Link>
      </nav>
      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <SignInForm />
      </div>
    </main>
  );
}
