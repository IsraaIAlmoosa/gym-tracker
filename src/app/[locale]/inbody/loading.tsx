import Skeleton from '@/components/ui/Skeleton';
import Card from '@/components/ui/Card';

export default function InBodyLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Skeleton className="mb-2 h-8 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-[52px] w-32" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      <Card>
        <Skeleton className="h-48" />
      </Card>
    </div>
  );
}
