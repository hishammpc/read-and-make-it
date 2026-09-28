import { Skeleton } from '@/components/ui/skeleton';

type SkeletonVariant = 'dashboard' | 'table' | 'form' | 'detail';

/** Layout-shaped loading placeholder — use instead of spinners or "Loading…" text. */
export function PageSkeleton({ variant = 'table' }: { variant?: SkeletonVariant }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      {variant === 'dashboard' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[7.5rem] rounded-xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-72 rounded-xl lg:col-span-2" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </>
      )}

      {variant === 'table' && (
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="mb-4 flex gap-2">
            <Skeleton className="h-10 w-64 max-w-full" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        </div>
      )}

      {variant === 'form' && (
        <div className="max-w-3xl space-y-5 rounded-xl border bg-card p-6 shadow-card">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      )}

      {variant === 'detail' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl lg:col-span-3" />
        </div>
      )}
    </div>
  );
}
