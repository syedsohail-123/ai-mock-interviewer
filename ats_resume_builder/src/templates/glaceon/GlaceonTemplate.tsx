import { TemplateProps } from '../types';
import { RegionSections } from '../shared/sections';
import { ContactItem, formatHref } from '../shared/primitives';
import { ProfilePicture } from '../shared/picture';
import { Mail, Phone, MapPin, Globe, Linkedin, Github, Briefcase } from 'lucide-react';

export const GlaceonTemplate = ({ data, metadata }: TemplateProps) => {
  const { basics } = data;
  const isA4 = metadata.page.size === 'A4';
  const widthMm = isA4 ? '210mm' : '215.9mm';
  const minHeightMm = isA4 ? '297mm' : '279.4mm';

  return (
    <div
      id="resume-print-preview"
      style={{
        backgroundColor: '#ffffff',
        color: metadata.colors.text || '#0f172a',
        fontFamily: metadata.typography.fontFamily || 'Inter, -apple-system, sans-serif',
        width: widthMm,
        minHeight: minHeightMm,
      }}
      className="flex flex-col p-6 md:p-8 shadow-2xl mx-auto overflow-hidden print-container text-left transition-all"
    >
      {/* Modern Split Header Box */}
      <header
        style={{
          borderLeft: `6px solid ${metadata.colors.primary || '#0ea5e9'}`,
        }}
        className="mb-5 p-5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {basics.photoUrl && (
              <ProfilePicture src={basics.photoUrl} alt={basics.name} size={64} />
            )}
            <div>
              <h1
                style={{
                  color: metadata.colors.primary || '#0ea5e9',
                  fontSize: `${metadata.typography.headingSize * 2}pt`,
                }}
                className="font-black tracking-tight leading-tight uppercase text-slate-950"
              >
                {basics.name || 'Your Name'}
              </h1>
              <p
                style={{ fontSize: `${metadata.typography.bodySize * 1.15}pt` }}
                className="font-semibold text-slate-700"
              >
                {basics.headline || 'Your Headline'}
              </p>
            </div>
          </div>
        </div>

        {/* Clean Contact Tags */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs border-t border-slate-200 pt-2.5">
          {basics.email && (
            <ContactItem
              icon={<Mail size={12} className="text-slate-600" />}
              value={basics.email}
              href={`mailto:${basics.email}`}
            />
          )}
          {basics.phone && (
            <ContactItem
              icon={<Phone size={12} className="text-slate-600" />}
              value={basics.phone}
              href={`tel:${basics.phone}`}
            />
          )}
          {basics.location && (
            <ContactItem
              icon={<MapPin size={12} className="text-slate-600" />}
              value={basics.location}
            />
          )}
          {basics.linkedin && (
            <ContactItem
              icon={<Linkedin size={12} className="text-sky-600" />}
              value="LinkedIn"
              href={formatHref(basics.linkedin)}
              className="text-sky-600 font-semibold"
            />
          )}
          {basics.portfolioUrl && (
            <ContactItem
              icon={<Briefcase size={12} className="text-sky-600" />}
              value="Portfolio"
              href={formatHref(basics.portfolioUrl)}
              className="text-sky-600 font-semibold"
            />
          )}
          {basics.github && (
            <ContactItem
              icon={<Github size={12} className="text-slate-700" />}
              value="GitHub"
              href={formatHref(basics.github)}
              className="text-slate-800 font-semibold"
            />
          )}
          {basics.website && (
            <ContactItem
              icon={<Globe size={12} className="text-sky-600" />}
              value="Website"
              href={formatHref(basics.website)}
              className="text-sky-600 font-semibold"
            />
          )}
        </div>
      </header>

      {/* Main Two Columns Grid */}
      <div className="grid grid-cols-12 gap-6 flex-1">
        {/* Main Column */}
        <main className="col-span-7 flex flex-col gap-4 overflow-hidden break-words">
          <RegionSections placement="main" />
        </main>
        {/* Sidebar Column */}
        <aside className="col-span-5 flex flex-col gap-4 overflow-hidden break-words">
          <RegionSections placement="sidebar" />
        </aside>
      </div>
    </div>
  );
};
