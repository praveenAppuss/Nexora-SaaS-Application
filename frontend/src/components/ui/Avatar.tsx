import type { AvatarColor, User } from '../../types';
import { cn, initialsFromName } from '../../lib/utils';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZES: Record<AvatarSize, string> = {
  xs: 'h-5 w-5 text-[8px]',
  sm: 'h-6 w-6 text-[9px]',
  md: 'h-7 w-7 text-[10px]',
  lg: 'h-9 w-9 text-[11px]',
};

const TONES: Record<AvatarColor, string> = {
  indigo: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
  rose: 'bg-gradient-to-br from-rose-400 to-red-600',
  emerald: 'bg-gradient-to-br from-emerald-400 to-teal-600',
  amber: 'bg-gradient-to-br from-amber-300 to-orange-500',
  sky: 'bg-gradient-to-br from-sky-400 to-blue-600',
  violet: 'bg-gradient-to-br from-violet-400 to-purple-600',
  pink: 'bg-gradient-to-br from-pink-400 to-rose-600',
};

type AvatarUser = Pick<User, 'name' | 'initials' | 'avatarColor'>;

interface AvatarProps {
  user: AvatarUser;
  size?: AvatarSize;
  className?: string;
  ring?: boolean;
}

export function Avatar({ user, size = 'sm', className, ring = false }: AvatarProps) {
  return (
    <span
      title={user.name}
      aria-label={user.name}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold uppercase leading-none tracking-wide text-white shadow-sm',
        SIZES[size],
        TONES[user.avatarColor],
        ring && 'ring-2 ring-surface',
        className,
      )}
    >
      {user.initials || initialsFromName(user.name)}
    </span>
  );
}

export function AvatarStack({
  users,
  max = 4,
  size = 'xs',
  className,
}: {
  users: AvatarUser[];
  max?: number;
  size?: AvatarSize;
  className?: string;
}) {
  const visible = users.slice(0, max);
  const overflow = users.length - visible.length;

  return (
    <span className={cn('flex -space-x-1.5', className)}>
      {visible.map((user) => (
        <Avatar key={user.name} user={user} size={size} ring />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full border border-line bg-elevated font-medium text-subtle ring-2 ring-surface',
            SIZES[size],
          )}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}
