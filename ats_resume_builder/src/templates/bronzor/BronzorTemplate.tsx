import { TemplateProps } from '../types';
import { RegionSections } from '../shared/sections';
import { ContactItem, formatHref } from '../shared/primitives';
import { ProfilePicture } from '../shared/picture';
import { Mail, Phone, MapPin, Globe, Linkedin, Github, Briefcase } from 'lucide-react';

export const BronzorTemplate = ({ data, metadata }: TemplateProps) => {
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
      {/* Bold Full-Width Colored Banner Header */}
      <header
        style={{
          backgroundColor: metadata.colors.primary,
          color: '#ffffff',
        }}
        className="p-7 flex flex-col items-center text-center gap-3.5 shadow-sm"
      >
        <div className="flex flex-col items-center gap-3">
          {basics.photoUrl && (
            <ProfilePicture
              src={basics.photoUrl}
              alt={basics.name}
              size={78}
              className="border-white/90 shadow-md"
            />
          )}
          <div className="flex flex-col items-center">
            <h1
              style={{ fontSize: `${metadata.typography.headingSize * 2.2}pt` }}
              className="font-extrabold tracking-tight leading-tight text-white mb-1"
            >
              {basics.name || 'Your Name'}
            </h1>
            <p
              style={{ fontSize: `${metadata.typography.bodySize * 1.25}pt` }}
              className="font-medium text-white/90 tracking-wide"
            >
              {basics.headline || 'Your Headline'}
            </p>
          </div>
        </div>

        {/* Horizontal Centered Contact Strip */}
        <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-white text-xs border-t border-white/30 pt-3 w-full">
          {basics.email && (
            <ContactItem
              icon={<Mail size={13} className="text-white" />}
              value={basics.email}
              href={`mailto:${basics.email}`}
              color="#ffffff"
            />
          )}
          {basics.phone && (
            <ContactItem
              icon={<Phone size={13} className="text-white" />}
              value={basics.phone}
              href={`tel:${basics.phone}`}
              color="#ffffff"
            />
          )}
          {basics.location && (
            <ContactItem
              icon={<MapPin size={13} className="text-white" />}
              value={basics.location}
              color="#ffffff"
            />
          )}
          {basics.linkedin && (
            <ContactItem
              icon={<Linkedin size={13} className="text-white" />}
              value="LinkedIn"
              href={formatHref(basics.linkedin)}
              color="#ffffff"
            />
          )}
          {basics.github && (
            <ContactItem
              icon={<Github size={13} className="text-white" />}
              value="GitHub"
              href={formatHref(basics.github)}
              color="#ffffff"
            />
          )}
          {basics.portfolioUrl && (
            <ContactItem
              icon={<Briefcase size={13} className="text-white" />}
              value="Portfolio"
              href={formatHref(basics.portfolioUrl)}
              color="#ffffff"
            />
          )}
          {basics.website && (
            <ContactItem
              icon={<Globe size={13} className="text-white" />}
              value="Website"
              href={formatHref(basics.website)}
              color="#ffffff"
            />
          )}
        </div>
      </header>

      {/* Body Area with Two Columns (Sidebar on Left, Main on Right) */}
      <div className="flex flex-1">
        <aside
          style={{
            backgroundColor: metadata.colors.sidebar || '#f8fafc',
            width: `${metadata.page.sidebarWidth}%`,
          }}
          className="p-6 flex flex-col gap-4 border-r border-slate-200 overflow-hidden break-words min-w-0"
        >
          <RegionSections placement="sidebar" />
        </aside>

        <main className="flex-1 p-6 flex flex-col gap-4 overflow-hidden break-words min-w-0">
          <RegionSections placement="main" />
        </main>
      </div>
    </div>
  );
};
