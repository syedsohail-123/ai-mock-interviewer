import { TemplateProps } from '../types';
import { RegionSections } from '../shared/sections';
import { ContactItem, formatHref } from '../shared/primitives';
import { ProfilePicture } from '../shared/picture';
import { Mail, Phone, MapPin, Globe, Linkedin, Github, Briefcase } from 'lucide-react';

export const PikachuTemplate = ({ data, metadata }: TemplateProps) => {
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
      {/* Top Accent Strip */}
      <div
        style={{ backgroundColor: metadata.colors.primary, height: '7px' }}
        className="w-full"
      />

      {/* Header */}
      <header className="p-8 pb-5 flex flex-col items-center text-center gap-3.5 border-b border-slate-200">
        <div className="flex flex-col items-center gap-3">
          {basics.photoUrl && (
            <ProfilePicture
              src={basics.photoUrl}
              alt={basics.name}
              size={74}
              className="border-slate-300 shadow-sm"
            />
          )}
          <div className="flex flex-col items-center">
            <h1
              style={{
                color: metadata.colors.primary,
                fontSize: `${metadata.typography.headingSize * 2.2}pt`,
              }}
              className="font-black tracking-tight leading-tight uppercase mb-1"
            >
              {basics.name || 'Your Name'}
            </h1>
            <p
              style={{ fontSize: `${metadata.typography.bodySize * 1.2}pt` }}
              className="font-semibold text-slate-700 tracking-wider uppercase text-xs"
            >
              {basics.headline || 'Your Headline'}
            </p>
          </div>
        </div>

        {/* Clean Full-Width Horizontal Centered Contact Strip */}
        <div
          style={{
            backgroundColor: metadata.colors.sidebar || '#f8fafc',
          }}
          className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 p-3 rounded-lg text-xs border border-slate-200/80 w-full"
        >
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

      {/* Modern Main Body */}
      <div className="flex flex-1">
        {/* Left Column (Sidebar: Technical Skills, Education) */}
        <aside
          style={{
            backgroundColor: metadata.colors.sidebar || '#f8fafc',
            width: `${metadata.page.sidebarWidth}%`,
          }}
          className="p-6 flex flex-col gap-4 border-r border-slate-200 overflow-hidden break-words min-w-0"
        >
          <RegionSections placement="sidebar" />
        </aside>

        {/* Right Column (Main: Summary, Experience, Projects) */}
        <main className="flex-1 p-6 flex flex-col gap-4 overflow-hidden break-words min-w-0">
          <RegionSections placement="main" />
        </main>
      </div>
    </div>
  );
};
