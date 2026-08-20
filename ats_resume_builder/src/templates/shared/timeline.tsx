import { ReactNode } from 'react';
import { usePlacement, useAccentColor } from './context';

export const TimelineSection = ({ children }: { children: ReactNode }) => {
  const placement = usePlacement();
  const accent = useAccentColor(placement);

  return (
    <div className="relative flex flex-col gap-4 pl-1">
      {/* vertical line */}
      <div
        style={{ backgroundColor: accent, opacity: 0.25 }}
        className="absolute left-[7px] top-2 bottom-2 w-[1.5px]"
      />
      {children}
    </div>
  );
};

export const TimelineItem = ({ children }: { children: ReactNode }) => {
  const placement = usePlacement();
  const accent = useAccentColor(placement);

  return (
    <div className="flex gap-3 relative">
      {/* timeline dot */}
      <div
        style={{ borderColor: accent }}
        className="w-[15px] h-[15px] mt-1 rounded-full border-2 bg-white shrink-0 z-10 shadow-xs"
      />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};
