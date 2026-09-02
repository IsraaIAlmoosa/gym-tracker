import Skeleton from '@/components/ui/Skeleton';
import Card from '@/components/ui/Card';

export default function GoalsLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
      <Skeleton className="mb-6 h-8 w-32" />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="h-24" />
          </Card>
        ))}
      </div>
    </div>
  );
}
