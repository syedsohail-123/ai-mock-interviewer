import { TemplateProps } from '../types';
import { RegionSections } from '../shared/sections';
import { ContactItem, formatHref } from '../shared/primitives';
import { ProfilePicture } from '../shared/picture';
import { Mail, Phone, MapPin, Globe, Linkedin, Github, Briefcase } from 'lucide-react';

export const DevopsClassicTemplate = ({ data, metadata }: TemplateProps) => {
  const { basics } = data;
  const isA4 = metadata.page.size === 'A4';
  const widthMm = isA4 ? '210mm' : '215.9mm';
  const minHeightMm = isA4 ? '297mm' : '279.4mm';

  return (
    <div
      id="resume-print-preview"
      style={{
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: metadata.typography.fontFamily || 'Inter, -apple-system, sans-serif',
        width: widthMm,
        minHeight: minHeightMm,
      }}
      className="flex flex-col p-8 md:p-10 shadow-2xl mx-auto overflow-hidden print-container text-left transition-all"
    >
      {/* Devops Classic Clean Centered Header */}
      <header className="flex flex-col items-center text-center pb-4 mb-4">
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
            fontSize: `${metadata.typography.headingSize * 2.2}pt`,
          }}
          className="font-black tracking-wider uppercase text-slate-950 leading-tight mb-1"
        >
          {basics.name || 'Your Name'}
        </h1>
        <p
          style={{
            fontSize: `${metadata.typography.bodySize * 1.15}pt`,
          }}
          className="font-semibold text-slate-700 mb-2"
        >
          {basics.headline || 'Full-Stack Developer | Cloud & DevOps | AI-Integrated Products'}
        </p>

        {/* Clean, Balanced & Properly Aligned Contact & Links Row */}
        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1.5 text-xs text-slate-800 font-medium max-w-2xl mx-auto">
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

      {/* Single-Column Full Width Clean Flow */}
      <div className="space-y-4">
        <RegionSections placement="main" />
        <RegionSections placement="sidebar" />
      </div>
    </div>
  );
};
