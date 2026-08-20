import { TemplateProps } from '../types';
import { RegionSections } from '../shared/sections';
import { ContactItem, formatHref } from '../shared/primitives';
import { ProfilePicture } from '../shared/picture';
import { Mail, Phone, MapPin, Globe, Linkedin, Github, Briefcase } from 'lucide-react';

export const MinimalATSClassicTemplate = ({ data, metadata }: TemplateProps) => {
  const { basics } = data;
  const isA4 = metadata.page.size === 'A4';
  const widthMm = isA4 ? '210mm' : '215.9mm';
  const minHeightMm = isA4 ? '297mm' : '279.4mm';

  return (
    <div
      id="resume-print-preview"
      style={{
        backgroundColor: '#ffffff',
        color: '#111827',
        fontFamily: 'Arial, Helvetica, sans-serif',
        width: widthMm,
        minHeight: minHeightMm,
      }}
      className="flex flex-col p-8 md:p-10 shadow-2xl mx-auto overflow-hidden print-container text-left transition-all"
    >
      {/* Classic ATS Centered Header */}
      <header className="flex flex-col items-center text-center pb-4 mb-4 border-b-2 border-slate-900">
        {basics.photoUrl && (
          <ProfilePicture
            src={basics.photoUrl}
            alt={basics.name}
            size={72}
            className="mb-2"
          />
        )}
        <h1
          style={{ fontSize: `${metadata.typography.headingSize * 2.1}pt` }}
          className="font-bold tracking-tight text-slate-950 uppercase mb-1"
        >
          {basics.name || 'Your Name'}
        </h1>
        <p
          style={{ fontSize: `${metadata.typography.bodySize * 1.15}pt` }}
          className="font-semibold text-slate-800 mb-2"
        >
          {basics.headline || 'Software Engineer | Backend Developer'}
        </p>

        {/* Unified Horizontal ATS Contact Row */}
        <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1 text-xs text-slate-800">
          {basics.email && (
            <ContactItem
              icon={<Mail size={12} />}
              value={basics.email}
              href={`mailto:${basics.email}`}
            />
          )}
          {basics.phone && (
            <>
              <span className="text-slate-400">|</span>
              <ContactItem
                icon={<Phone size={12} />}
                value={basics.phone}
                href={`tel:${basics.phone}`}
              />
            </>
          )}
          {basics.location && (
            <>
              <span className="text-slate-400">|</span>
              <ContactItem
                icon={<MapPin size={12} />}
                value={basics.location}
              />
            </>
          )}
          {basics.linkedin && (
            <>
              <span className="text-slate-400">|</span>
              <ContactItem
                icon={<Linkedin size={12} />}
                value="LinkedIn"
                href={formatHref(basics.linkedin)}
              />
            </>
          )}
          {basics.portfolioUrl && (
            <>
              <span className="text-slate-400">|</span>
              <ContactItem
                icon={<Briefcase size={12} />}
                value="Portfolio"
                href={formatHref(basics.portfolioUrl)}
              />
            </>
          )}
          {basics.github && (
            <>
              <span className="text-slate-400">|</span>
              <ContactItem
                icon={<Github size={12} />}
                value="GitHub"
                href={formatHref(basics.github)}
              />
            </>
          )}
          {basics.website && (
            <>
              <span className="text-slate-400">|</span>
              <ContactItem
                icon={<Globe size={12} />}
                value="Website"
                href={formatHref(basics.website)}
              />
            </>
          )}
        </div>
      </header>

      {/* Classic ATS Sequential Flow */}
      <div className="space-y-4">
        <RegionSections placement="main" />
        <RegionSections placement="sidebar" />
      </div>
    </div>
  );
};
