import { getStatusClasses } from '../lib/utils';

interface StatusBadgeProps {
  status: string;
  size?: 'xs' | 'sm';
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'text-[8px] px-1.5 py-0.5',
  sm: 'text-[10px] px-2 py-0.5',
};

export default function StatusBadge({ status, size = 'sm', className = '' }: StatusBadgeProps) {
  return (
    <span className={`font-black rounded uppercase ${SIZE_CLASSES[size]} ${getStatusClasses(status)} ${className}`}>
      {status}
    </span>
  );
}
