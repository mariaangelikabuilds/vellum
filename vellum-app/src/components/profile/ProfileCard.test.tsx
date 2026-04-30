import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProfileCard } from './ProfileCard';

describe('ProfileCard', () => {
  it('renders the user email', () => {
    render(
      <ProfileCard
        email="angel@example.com"
        orgId="org_abc12345"
        publishedCount={3}
        subscriberCount={12}
      />,
    );
    expect(screen.getByText('angel@example.com')).toBeInTheDocument();
  });

  it('renders the org id truncated to first 8 chars', () => {
    render(
      <ProfileCard
        email="angel@example.com"
        orgId="org_abc12345"
        publishedCount={0}
        subscriberCount={0}
      />,
    );
    expect(screen.getByText(/org_abc1/i)).toBeInTheDocument();
  });

  it('renders no-org message when orgId is null', () => {
    render(
      <ProfileCard
        email="angel@example.com"
        orgId={null}
        publishedCount={0}
        subscriberCount={0}
      />,
    );
    expect(screen.getByText(/no active org/i)).toBeInTheDocument();
  });

  it('renders publishedCount and subscriberCount', () => {
    render(
      <ProfileCard
        email="angel@example.com"
        orgId="org_abc12345"
        publishedCount={3}
        subscriberCount={12}
      />,
    );
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('pluralises labels correctly', () => {
    render(
      <ProfileCard
        email="angel@example.com"
        orgId="org_abc12345"
        publishedCount={1}
        subscriberCount={1}
      />,
    );
    expect(screen.getByText(/published essay$/i)).toBeInTheDocument();
    expect(screen.getByText(/subscriber$/i)).toBeInTheDocument();
  });
});
