import { ReactNode } from 'react';
import { usePlacement, useTextColor, useAccentColor } from './context';
import { useResume } from '../../context/ResumeContext';
import { ContactItemProps } from '../../types/resume';

export const formatDisplayUrl = (url?: string, fallback: string = ''): string => {
  if (!url) return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;
  return trimmed
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '');
};

export const formatHref = (url?: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`;
};

export const SectionHeading = ({ children, className = '' }: { children: ReactNode; className?: string }) => {
  const placement = usePlacement();
  const accent = useAccentColor(placement);
  const { metadata } = useResume();

  return (
    <h2
      style={{
        color: accent,
        fontSize: `${metadata.typography.headingSize}pt`,
        letterSpacing: '0.06em',
        borderColor: accent,
      }}
      className={`font-bold uppercase tracking-wider pb-1.5 mb-3 border-b-2 flex items-center gap-2 ${className}`}
    >
      {children}
    </h2>
  );
};

export const SubHeading = ({ children, className = '' }: { children: ReactNode; className?: string }) => {
  const placement = usePlacement();
  const color = useTextColor(placement);
  const { metadata } = useResume();

  return (
    <h3
      style={{
        color,
        fontSize: `${metadata.typography.bodySize * 1.15}pt`,
      }}
      className={`font-semibold tracking-tight ${className}`}
    >
      {children}
    </h3>
  );
};

export const BodyText = ({ children, className = '' }: { children: ReactNode; className?: string }) => {
  const placement = usePlacement();
  const color = useTextColor(placement);
  const { metadata } = useResume();

  return (
    <p
      style={{
        color,
        fontSize: `${metadata.typography.bodySize}pt`,
        lineHeight: metadata.typography.lineHeight ? metadata.typography.lineHeight * 1.1 : 1.55,
      }}
      className={className}
    >
      {children}
    </p>
  );
};

export const SmallText = ({ children, className = '' }: { children: ReactNode; className?: string }) => {
  const placement = usePlacement();
  const color = useTextColor(placement);
  const { metadata } = useResume();

  return (
    <span
      style={{
        color,
        fontSize: `${metadata.typography.bodySize * 0.88}pt`,
        opacity: 0.85,
      }}
      className={className}
    >
      {children}
    </span>
  );
};

export interface ContactItemExtendedProps extends ContactItemProps {
  color?: string;
}

export const ContactItem = ({ icon, value, href, className = '', color: explicitColor }: ContactItemExtendedProps) => {
  const { metadata } = useResume();
  const placement = usePlacement();
  const color = explicitColor || useTextColor(placement);

  if (!value) return null;

  return (
    <div
      style={{ color, fontSize: `${metadata.typography.bodySize * 0.9}pt` }}
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      {!metadata.page.hideIcons && icon && (
        <span className="shrink-0 opacity-90">{icon}</span>
      )}
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          style={{ color: 'inherit' }}
          className={metadata.page.hideLinkUnderline ? 'hover:underline' : 'underline'}
        >
          {value}
        </a>
      ) : (
        <span style={{ color: 'inherit' }}>{value}</span>
      )}
    </div>
  );
};

export const TagBadge = ({ label }: { label: string }) => {
  const placement = usePlacement();
  const accent = useAccentColor(placement);
  const { metadata } = useResume();

  return (
    <span
      style={{
        fontSize: `${metadata.typography.bodySize * 0.8}pt`,
        borderColor: accent,
        color: accent,
      }}
      className="inline-block px-2 py-0.5 rounded-full border border-opacity-40 font-medium bg-opacity-10"
    >
      {label}
    </span>
  );
};
