interface ProfileCardProps {
  email: string;
  orgId: string | null;
  publishedCount: number;
  subscriberCount: number;
}

export function ProfileCard({
  email,
  orgId,
  publishedCount,
  subscriberCount,
}: ProfileCardProps) {
  return (
    <div className="border border-rule">
      <div className="border-b border-rule px-5 py-4">
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-3">signed in as</p>
        <p className="font-serif text-base text-ink">{email}</p>
        <p className="mt-2 font-mono text-xs text-ink-3">
          {orgId ? `org ${orgId.slice(0, 8)}…` : 'no active org'}
        </p>
      </div>

      <div className="grid grid-cols-2 divide-x divide-rule">
        <div className="px-5 py-4">
          <p className="font-serif text-3xl text-ink">{publishedCount}</p>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-ink-3">
            {publishedCount === 1 ? 'published essay' : 'published essays'}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="font-serif text-3xl text-ink">{subscriberCount}</p>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-ink-3">
            {subscriberCount === 1 ? 'subscriber' : 'subscribers'}
          </p>
        </div>
      </div>
    </div>
  );
}
