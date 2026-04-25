# 01 · Base setup — Next.js 15 + TypeScript + Tailwind + shadcn/ui

Every project in the library starts here. The shared baseline gives you a consistent foundation; project-specific code lives on top.

## Step 1 — Scaffold

```bash
pnpm create next-app@latest <repo-slug> \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --turbopack \
  --use-pnpm

cd <repo-slug>
```

Verify:

```bash
pnpm dev  # → http://localhost:3000 should render the Next welcome page
```

## Step 2 — Strict TS config

Replace `tsconfig.json` strict block:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## Step 3 — Fonts (Geist Mono + Geist Sans)

`src/app/layout.tsx`:

```typescript
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

export const metadata: Metadata = {
  title: 'YOUR_PROJECT_NAME',
  description: 'YOUR_PROJECT_TAGLINE',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

```bash
pnpm add geist
```

## Step 4 — Tailwind theme tokens (matches the workspace design system)

`tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0A0A0A', 2: '#525252', 3: '#A3A3A3', 4: '#D4D4D4' },
        rule: { DEFAULT: '#E5E5E5', strong: '#0A0A0A' },
        canvas: { DEFAULT: '#FFFFFF', 2: '#FAFAFA' },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
      },
      borderRadius: { DEFAULT: '0', sm: '0', md: '0', lg: '0' },
    },
  },
  plugins: [],
};
export default config;
```

`src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --canvas: #ffffff;
  --ink: #0a0a0a;
}

body {
  color: var(--ink);
  background: var(--canvas);
  font-family: var(--font-geist-mono), ui-monospace, monospace;
}
```

## Step 5 — shadcn/ui

```bash
pnpm dlx shadcn@latest init
# pick: TypeScript yes, Tailwind yes, Server Components yes, alias src/components, CSS variables yes
pnpm dlx shadcn@latest add button card input dialog
```

## Step 6 — Linting + formatting

```bash
pnpm add -D prettier prettier-plugin-tailwindcss eslint-config-prettier
```

`.prettierrc`:

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

Add to `package.json` scripts:

```json
{
  "scripts": {
    "lint": "next lint",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,md}\"",
    "typecheck": "tsc --noEmit"
  }
}
```

## Step 7 — Env scaffolding

`.env.example`:

```dotenv
# === Anthropic ===
ANTHROPIC_API_KEY=

# === Database ===
DATABASE_URL=

# === Auth (filled in 03-auth-clerk.md) ===
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# === Misc ===
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
cp .env.example .env.local
# fill in your local values
```

`.gitignore` should already exclude `.env.local`. Verify:

```bash
grep -E "\.env" .gitignore
# → should include .env*.local
```

## Step 8 — Git init + first commit

```bash
git init
git add -A
git commit -m "feat: scaffold Next.js 15 + TS + Tailwind + shadcn"
gh repo create <repo-slug> --private --source=. --push
```

## Step 9 — Verify

```bash
pnpm typecheck  # → no errors
pnpm lint       # → no errors
pnpm dev        # → localhost:3000 renders
```

You're ready for the project-specific phases (database, AI integration, frontend, evals, deploy).
