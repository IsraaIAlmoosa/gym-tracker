import Skeleton from '@/components/ui/Skeleton';
import Card from '@/components/ui/Card';

export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
      {/* Hero */}
      <section className="mb-7">
        <Skeleton className="mb-2 h-7 w-56" />
        <Skeleton className="h-4 w-40" />
      </section>

      {/* Today's Workout */}
      <Card className="mb-6">
        <Skeleton className="mb-3 h-3 w-28" />
        <Skeleton className="mb-2 h-6 w-2/3" />
        <Skeleton className="mb-5 h-4 w-1/2" />
        <Skeleton className="h-11 w-40 rounded-xl" />
      </Card>

      {/* Quick Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-4">
            <Skeleton className="mb-3 h-3 w-16" />
            <Skeleton className="h-7 w-14" />
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-6 flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-xl" />
        ))}
      </div>

      {/* Strength Progress + Activity */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <Skeleton className="mb-4 h-4 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </Card>
        <Card>
          <Skeleton className="mb-4 h-4 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </Card>
      </div>

      {/* Personal Records */}
      <Card className="mb-6">
        <Skeleton className="mb-4 h-4 w-1/3" />
        <Skeleton className="h-24 w-full" />
      </Card>
    </div>
  );
}
