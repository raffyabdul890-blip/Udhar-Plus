import BalanceCardSkeleton from "@/components/skeletons/BalanceCardSkeleton";
import { CustomerCardSkeletonList } from "@/components/skeletons/CustomerCardSkeleton";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-8">
      <h1 className="text-senior-2xl font-bold text-brand-white">Udhar Plus</h1>
      <p className="text-senior-base text-brand-white/80">
        Boilerplate preview — brand theme, skeleton loading states.
      </p>

      <BalanceCardSkeleton />
      <CustomerCardSkeletonList count={3} />

      <button
        type="button"
        className="min-h-tap min-w-tap rounded-xl bg-brand-red px-6 text-senior-base font-bold text-brand-white transition active:scale-[0.98] active:bg-brand-darkred"
      >
        Give Udhar
      </button>
    </main>
  );
}
