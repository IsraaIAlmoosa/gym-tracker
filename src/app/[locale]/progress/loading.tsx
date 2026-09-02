import Skeleton from '@/components/ui/Skeleton';
import Card from '@/components/ui/Card';

export default function ProgressLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="flex flex-col gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="h-32" />
          </Card>
        ))}
      </div>
    </div>
  );
}
