function ShimmerBlock({ className }: { className: string }) {
  return (
    <div
      className={`bg-shimmer-gradient bg-shimmer-size animate-shimmer rounded-md ${className}`}
    />
  );
}

export default function BalanceCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading balance"
      className="flex flex-col gap-3 rounded-2xl border border-brand-white/10 bg-brand-charcoal/40 p-6"
    >
      <ShimmerBlock className="h-4 w-1/3" />
      <ShimmerBlock className="h-12 w-2/3" />
      <ShimmerBlock className="h-4 w-1/2" />
    </div>
  );
}
