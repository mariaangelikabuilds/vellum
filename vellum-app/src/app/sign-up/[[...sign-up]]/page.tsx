import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas-2">
      <SignUp
        appearance={{
          elements: {
            card: 'border border-rule-strong rounded-none shadow-none',
            headerTitle: 'font-mono',
            socialButtonsBlockButton: 'rounded-none',
            formButtonPrimary: 'rounded-none bg-ink hover:bg-ink-2',
            formFieldInput: 'rounded-none border-rule-strong',
          },
        }}
      />
    </main>
  );
}
