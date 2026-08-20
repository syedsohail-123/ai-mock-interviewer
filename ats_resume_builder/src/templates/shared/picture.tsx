import { useAccentColor } from './context';

export const ProfilePicture = ({
  src,
  alt = 'Profile',
  size = 84,
  className = '',
}: {
  src?: string;
  alt?: string;
  size?: number;
  className?: string;
}) => {
  const accent = useAccentColor();

  if (!src) return null;

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderColor: accent,
      }}
      className={`relative rounded-full overflow-hidden border-2 p-0.5 shrink-0 shadow-sm ${className}`}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover rounded-full"
      />
    </div>
  );
};
