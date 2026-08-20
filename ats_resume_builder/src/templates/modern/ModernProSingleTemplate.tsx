import { TemplateProps } from '../types';
import { RegionSections } from '../shared/sections';
import { ContactItem, formatHref } from '../shared/primitives';
import { ProfilePicture } from '../shared/picture';
import { Mail, Phone, MapPin, Globe, Linkedin, Github, Briefcase } from 'lucide-react';

export const ModernProSingleTemplate = ({ data, metadata }: TemplateProps) => {
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
        fontFamily: metadata.typography.fontFamily || 'Inter, sans-serif',
        width: widthMm,
        minHeight: minHeightMm,
      }}
      className="flex flex-col p-8 md:p-10 shadow-2xl mx-auto overflow-hidden print-container text-left transition-all"
    >
      {/* Modern Top Accent Bar */}
      <div
        style={{ backgroundColor: metadata.colors.primary || '#0ea5e9' }}
        className="w-full h-1 rounded-full mb-6"
      />

      <header className="flex flex-col items-center text-center pb-4 mb-4 border-b border-slate-200">
        {basics.photoUrl && (
          <ProfilePicture
            src={basics.photoUrl}
            alt={basics.name}
            size={76}
            className="mb-2"
          />
        )}
        <h1
          style={{
            color: metadata.colors.primary || '#0ea5e9',
            fontSize: `${metadata.typography.headingSize * 2.2}pt`,
          }}
          className="font-extrabold tracking-tight uppercase leading-tight mb-1"
        >
          {basics.name || 'Your Name'}
        </h1>
        <p
          style={{
            fontSize: `${metadata.typography.bodySize * 1.18}pt`,
          }}
          className="font-medium text-slate-600 mb-2"
        >
          {basics.headline || 'Your Headline'}
        </p>

        {/* Horizontal Contact Row */}
        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
          {basics.email && (
            <ContactItem
              icon={<Mail size={12} />}
              value={basics.email}
              href={`mailto:${basics.email}`}
            />
          )}
          {basics.phone && (
            <ContactItem
              icon={<Phone size={12} />}
              value={basics.phone}
              href={`tel:${basics.phone}`}
            />
          )}
          {basics.location && (
            <ContactItem
              icon={<MapPin size={12} />}
              value={basics.location}
            />
          )}
          {basics.linkedin && (
            <ContactItem
              icon={<Linkedin size={12} />}
              value="LinkedIn"
              href={formatHref(basics.linkedin)}
            />
          )}
          {basics.portfolioUrl && (
            <ContactItem
              icon={<Briefcase size={12} />}
              value="Portfolio"
              href={formatHref(basics.portfolioUrl)}
            />
          )}
          {basics.github && (
            <ContactItem
              icon={<Github size={12} />}
              value="GitHub"
              href={formatHref(basics.github)}
            />
          )}
          {basics.website && (
            <ContactItem
              icon={<Globe size={12} />}
              value="Website"
              href={formatHref(basics.website)}
            />
          )}
        </div>
      </header>

      {/* Single-Column Full Width Streamlined Section Flow */}
      <div className="space-y-4">
        <RegionSections placement="main" />
        <RegionSections placement="sidebar" />
      </div>
    </div>
  );
};
