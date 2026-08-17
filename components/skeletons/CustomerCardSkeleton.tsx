function ShimmerBlock({ className }: { className: string }) {
  return (
    <div
      className={`bg-shimmer-gradient bg-shimmer-size animate-shimmer rounded-md ${className}`}
    />
  );
}

function CustomerCardShape() {
  return (
    <div className="flex min-h-tap items-center gap-4 rounded-xl border border-brand-white/10 bg-brand-charcoal/40 p-4">
      <ShimmerBlock className="h-12 w-12 shrink-0 rounded-full" />

      <div className="flex flex-1 flex-col gap-2">
        <ShimmerBlock className="h-5 w-2/3" />
        <ShimmerBlock className="h-4 w-1/3" />
      </div>

      <ShimmerBlock className="h-6 w-20 shrink-0" />
    </div>
  );
}

/** Standalone single-card skeleton — announces its own loading state. */
export default function CustomerCardSkeleton() {
  return (
    <div role="status" aria-label="Loading customer">
      <CustomerCardShape />
    </div>
  );
}

/** List of card skeletons — announces loading once for the whole list. */
export function CustomerCardSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading customers" className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <CustomerCardShape key={i} />
      ))}
    </div>
  );
}
