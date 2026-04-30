import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  // Penstroke-specific Next.js config goes here.
};

export default withSentryConfig(nextConfig, {
  // Sentry build-time options. Source map upload only runs in CI when
  // SENTRY_AUTH_TOKEN is set; locally it no-ops.
  silent: !process.env.CI,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  widenClientFileUpload: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
