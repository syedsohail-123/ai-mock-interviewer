import { TemplateProps } from '../types';
import { RegionSections } from '../shared/sections';
import { ContactItem, formatHref } from '../shared/primitives';
import { ProfilePicture } from '../shared/picture';
import { Mail, Phone, MapPin, Globe, Linkedin, Github, Briefcase } from 'lucide-react';

export const GengarTemplate = ({ data, metadata }: TemplateProps) => {
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
      {/* Dark Modern Card Header */}
      <header
        style={{
          backgroundColor: '#0f172a',
          color: '#ffffff',
        }}
        className="p-8 flex flex-col items-center text-center gap-3.5"
      >
        <div className="flex flex-col items-center gap-3">
          {basics.photoUrl && (
            <ProfilePicture
              src={basics.photoUrl}
              alt={basics.name}
              size={80}
              className="border-slate-600 shadow-md"
            />
          )}
          <div className="flex flex-col items-center">
            <span
              style={{ color: metadata.colors.primary }}
              className="text-xs font-bold tracking-widest uppercase mb-1 block"
            >
              Curriculum Vitae
            </span>
            <h1
              style={{ fontSize: `${metadata.typography.headingSize * 2.2}pt` }}
              className="font-extrabold tracking-tight text-white leading-tight mb-1"
            >
              {basics.name || 'Your Name'}
            </h1>
            <p
              style={{ fontSize: `${metadata.typography.bodySize * 1.2}pt` }}
              className="font-medium text-slate-300"
            >
              {basics.headline || 'Your Headline'}
            </p>
          </div>
        </div>

        {/* Horizontal Centered Dark Contact Row */}
        <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-xs border-t border-slate-700/80 pt-3 text-slate-100 w-full">
          {basics.email && (
            <ContactItem
              icon={<Mail size={13} className="text-sky-400" />}
              value={basics.email}
              href={`mailto:${basics.email}`}
              color="#f1f5f9"
            />
          )}
          {basics.phone && (
            <ContactItem
              icon={<Phone size={13} className="text-sky-400" />}
              value={basics.phone}
              href={`tel:${basics.phone}`}
              color="#f1f5f9"
            />
          )}
          {basics.location && (
            <ContactItem
              icon={<MapPin size={13} className="text-sky-400" />}
              value={basics.location}
              color="#f1f5f9"
            />
          )}
          {basics.linkedin && (
            <ContactItem
              icon={<Linkedin size={13} className="text-sky-400" />}
              value="LinkedIn"
              href={formatHref(basics.linkedin)}
              color="#f1f5f9"
            />
          )}
          {basics.github && (
            <ContactItem
              icon={<Github size={13} className="text-sky-400" />}
              value="GitHub"
              href={formatHref(basics.github)}
              color="#f1f5f9"
            />
          )}
          {basics.portfolioUrl && (
            <ContactItem
              icon={<Briefcase size={13} className="text-sky-400" />}
              value="Portfolio"
              href={formatHref(basics.portfolioUrl)}
              color="#f1f5f9"
            />
          )}
          {basics.website && (
            <ContactItem
              icon={<Globe size={13} className="text-sky-400" />}
              value="Website"
              href={formatHref(basics.website)}
              color="#f1f5f9"
            />
          )}
        </div>
      </header>

      {/* Main Content Area (Sidebar on Left, Main on Right) */}
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
