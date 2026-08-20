import { TemplateProps } from '../types';
import { RegionSections } from '../shared/sections';
import { ContactItem, formatHref } from '../shared/primitives';
import { ProfilePicture } from '../shared/picture';
import { Mail, Phone, MapPin, Globe, Linkedin, Github, Briefcase } from 'lucide-react';

export const AzurillTemplate = ({ data, metadata }: TemplateProps) => {
  const { basics } = data;
  const isA4 = metadata.page.size === 'A4';
  const widthMm = isA4 ? '210mm' : '215.9mm';
  const minHeightMm = isA4 ? '297mm' : '279.4mm';

  return (
    <div
      id="resume-print-preview"
      style={{
        backgroundColor: metadata.colors.background,
        color: metadata.colors.text,
        fontFamily: metadata.typography.fontFamily,
        width: widthMm,
        minHeight: minHeightMm,
      }}
      className="flex flex-col shadow-2xl mx-auto overflow-hidden print-container text-left transition-all"
    >
      {/* Header */}
      <header
        style={{
          borderBottom: `2px solid ${metadata.colors.primary}`,
        }}
        className="p-6 md:p-7 flex flex-col items-center text-center gap-3.5"
      >
        <div className="flex flex-col items-center gap-3">
          {basics.photoUrl && (
            <ProfilePicture src={basics.photoUrl} alt={basics.name} size={76} />
          )}
          <div className="flex flex-col items-center">
            <h1
              style={{
                color: metadata.colors.primary,
                fontSize: `${metadata.typography.headingSize * 2}pt`,
              }}
              className="font-extrabold tracking-tight leading-tight mb-1"
            >
              {basics.name || 'Your Name'}
            </h1>
            <p
              style={{
                color: metadata.colors.text,
                fontSize: `${metadata.typography.bodySize * 1.2}pt`,
              }}
              className="font-medium opacity-90"
            >
              {basics.headline || 'Your Headline / Title'}
            </p>
          </div>
        </div>

        {/* Horizontal Centered Contact Items Row */}
        <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-xs border-t border-slate-200/60 pt-3 w-full">
          {basics.email && (
            <ContactItem
              icon={<Mail size={13} />}
              value={basics.email}
              href={`mailto:${basics.email}`}
            />
          )}
          {basics.phone && (
            <ContactItem
              icon={<Phone size={13} />}
              value={basics.phone}
              href={`tel:${basics.phone}`}
            />
          )}
          {basics.location && (
            <ContactItem
              icon={<MapPin size={13} />}
              value={basics.location}
            />
          )}
          {basics.linkedin && (
            <ContactItem
              icon={<Linkedin size={13} />}
              value="LinkedIn"
              href={formatHref(basics.linkedin)}
            />
          )}
          {basics.github && (
            <ContactItem
              icon={<Github size={13} />}
              value="GitHub"
              href={formatHref(basics.github)}
            />
          )}
          {basics.portfolioUrl && (
            <ContactItem
              icon={<Briefcase size={13} />}
              value="Portfolio"
              href={formatHref(basics.portfolioUrl)}
            />
          )}
          {basics.website && (
            <ContactItem
              icon={<Globe size={13} />}
              value="Website"
              href={formatHref(basics.website)}
            />
          )}
        </div>
      </header>

      {/* Main Two-Region Content Body */}
      <div className="flex flex-1">
        {/* Sidebar Region (Left Column) */}
        <aside
          style={{
            backgroundColor: metadata.colors.sidebar || '#f8fafc',
            width: `${metadata.page.sidebarWidth}%`,
          }}
          className="p-5 md:p-6 flex flex-col gap-4 border-r border-slate-200 border-opacity-50 overflow-hidden break-words min-w-0"
        >
          <RegionSections placement="sidebar" />
        </aside>

        {/* Main Region (Right Column) */}
        <main className="flex-1 p-5 md:p-6 flex flex-col gap-4 overflow-hidden break-words min-w-0">
          <RegionSections placement="main" />
        </main>
      </div>
    </div>
  );
};
