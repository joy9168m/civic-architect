import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title = 'No items found',
  message = 'There are no items to display right now.',
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="p-6 bg-surface-container rounded-full mb-6 text-outline/30">
        {icon || <Inbox size={48} />}
      </div>
      <h3 className="font-headline text-xl font-extrabold text-primary mb-2">{title}</h3>
      <p className="text-sm text-on-surface-variant max-w-xs">{message}</p>
    </div>
  );
}
