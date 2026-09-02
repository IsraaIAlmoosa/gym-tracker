import Skeleton from '@/components/ui/Skeleton';
import Card from '@/components/ui/Card';

export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
      <Skeleton className="mb-2 h-8 w-64" />
      <Skeleton className="mb-6 h-4 w-48" />

      <div className="mb-6 flex gap-3">
        <Skeleton className="h-[52px] w-40" />
        <Skeleton className="h-[52px] w-40" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      <Card className="mb-6">
        <Skeleton className="h-4 w-32" />
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <Skeleton className="h-32" />
        </Card>
        <Card>
          <Skeleton className="h-32" />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <Skeleton className="h-40" />
        </Card>
        <Card>
          <Skeleton className="h-40" />
        </Card>
      </div>
    </div>
  );
}
