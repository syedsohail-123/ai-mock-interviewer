import { TemplateProps } from '../types';
import { RegionSections } from '../shared/sections';
import { ContactItem, formatHref } from '../shared/primitives';
import { ProfilePicture } from '../shared/picture';
import { Mail, Phone, MapPin, Globe, Linkedin, Github, Briefcase } from 'lucide-react';

export const OnyxTemplate = ({ data, metadata }: TemplateProps) => {
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
      className="flex flex-col p-8 md:p-10 shadow-2xl mx-auto overflow-hidden print-container text-left transition-all"
    >
      {/* Minimalist Centered Header */}
      <header className="flex flex-col items-center text-center pb-6 mb-6 border-b border-slate-200">
        {basics.photoUrl && (
          <ProfilePicture
            src={basics.photoUrl}
            alt={basics.name}
            size={78}
            className="mb-3"
          />
        )}
        <h1
          style={{
            color: metadata.colors.primary,
            fontSize: `${metadata.typography.headingSize * 2}pt`,
          }}
          className="font-extrabold tracking-tight"
        >
          {basics.name || 'Your Name'}
        </h1>
        <p
          style={{ fontSize: `${metadata.typography.bodySize * 1.2}pt` }}
          className="font-medium text-slate-600 mt-1 mb-3"
        >
          {basics.headline || 'Your Headline'}
        </p>

        {/* Contact Strip */}
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

      {/* Single Column / Full Width Main + Sidebar Sections */}
      <div className="space-y-4">
        <RegionSections placement="main" />
        <RegionSections placement="sidebar" />
      </div>
    </div>
  );
};
