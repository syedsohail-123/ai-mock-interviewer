import { TemplateProps } from '../types';
import { RegionSections } from '../shared/sections';
import { ContactItem } from '../shared/primitives';
import { ProfilePicture } from '../shared/picture';
import { Mail, Phone, MapPin, Globe, Linkedin, Github, Briefcase } from 'lucide-react';

export const KakunaTemplate = ({ data, metadata }: TemplateProps) => {
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
      {/* Header Container with Underline Accent */}
      <header className="p-8 pb-4 flex flex-col items-center text-center gap-3.5">
        <div className="flex flex-col items-center gap-3">
          {basics.photoUrl && (
            <ProfilePicture src={basics.photoUrl} alt={basics.name} size={76} />
          )}
          <div className="flex flex-col items-center">
            <h1
              style={{
                color: metadata.colors.primary,
                fontSize: `${metadata.typography.headingSize * 2.2}pt`,
              }}
              className="font-bold tracking-tight leading-tight mb-1"
            >
              {basics.name || 'Your Name'}
            </h1>
            <p
              style={{ fontSize: `${metadata.typography.bodySize * 1.2}pt` }}
              className="font-medium text-slate-600"
            >
              {basics.headline || 'Your Headline'}
            </p>
          </div>
        </div>

        {/* Clean Horizontal Centered Contact Bar with Vertical Dividers */}
        <div className="flex flex-wrap justify-center items-center gap-x-3.5 gap-y-2 text-xs border-y border-slate-200 py-2.5 w-full">
          {basics.email && (
            <ContactItem
              icon={<Mail size={13} />}
              value={basics.email}
              href={`mailto:${basics.email}`}
            />
          )}
          {basics.phone && (
            <>
              <span className="text-slate-300">|</span>
              <ContactItem
                icon={<Phone size={13} />}
                value={basics.phone}
                href={`tel:${basics.phone}`}
              />
            </>
          )}
          {basics.location && (
            <>
              <span className="text-slate-300">|</span>
              <ContactItem
                icon={<MapPin size={13} />}
                value={basics.location}
              />
            </>
          )}
          {basics.portfolioUrl && (
            <>
              <span className="text-slate-300">|</span>
              <ContactItem
                icon={<Briefcase size={13} />}
                value="Portfolio"
                href={basics.portfolioUrl.startsWith('http') ? basics.portfolioUrl : `https://${basics.portfolioUrl}`}
              />
            </>
          )}
          {basics.website && (
            <>
              <span className="text-slate-300">|</span>
              <ContactItem
                icon={<Globe size={13} />}
                value="Website"
                href={basics.website.startsWith('http') ? basics.website : `https://${basics.website}`}
              />
            </>
          )}
          {basics.linkedin && (
            <>
              <span className="text-slate-300">|</span>
              <ContactItem
                icon={<Linkedin size={13} />}
                value="LinkedIn"
                href={basics.linkedin.startsWith('http') ? basics.linkedin : `https://${basics.linkedin}`}
              />
            </>
          )}
          {basics.github && (
            <>
              <span className="text-slate-300">|</span>
              <ContactItem
                icon={<Github size={13} />}
                value="GitHub"
                href={basics.github.startsWith('http') ? basics.github : `https://${basics.github}`}
              />
            </>
          )}
        </div>
      </header>

      {/* Main Two Columns */}
      <div className="flex flex-1">
        <main className="flex-1 p-8 pt-4 flex flex-col gap-4">
          <RegionSections placement="main" />
        </main>
        <aside
          style={{
            backgroundColor: metadata.colors.sidebar || '#f8fafc',
            width: `${metadata.page.sidebarWidth}%`,
          }}
          className="p-8 pt-4 flex flex-col gap-4 border-l border-slate-200"
        >
          <RegionSections placement="sidebar" />
        </aside>
      </div>
    </div>
  );
};
