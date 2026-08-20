import React from 'react';
import { TemplateProps } from '../types';
import { formatHref } from '../shared/primitives';

export const OriginalAuthenticTemplate: React.FC<TemplateProps> = ({ data, metadata }) => {
  const { basics, sections } = data;
  const isA4 = metadata.page.size === 'A4';
  const widthMm = isA4 ? '210mm' : '215.9mm';
  const minHeightMm = isA4 ? '297mm' : '279.4mm';
  const primaryColor = metadata.colors.primary || '#1d4ed8'; // Default royal blue matching original

  // Split multi-line bullet descriptions and strip any leading bullet characters
  const getBullets = (desc?: string) => {
    if (!desc) return [];
    // Split by newline OR any embedded bullet symbol
    const rawSegments = desc.split(/[\n\u2022\u25ba\u25b6\u25c4\u25aa\u2023\u2043\u25cf\u25e6\u2219\u223f►▶▸•]/);
    return rawSegments
      .map((line) =>
        line
          .replace(/^[\u2022\u25ba\u25b6\u25c4\u25aa\u2023\u2043\u25cf\u25e6\u2219\u223f\-\*\u2013\u2014►▶▸•>·\s]+/, '')
          .replace(/[\u2022\u25ba\u25b6\u25c4\u25aa\u2023\u2043\u25cf\u25e6\u2219\u223f►▶▸•]/g, '')
          .trim()
      )
      .filter((line) => line.length > 2);
  };

  return (
    <div
      id="resume-print-preview"
      style={{
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: "'Inter', Arial, Helvetica, sans-serif",
        width: widthMm,
        minHeight: minHeightMm,
      }}
      className="flex flex-col p-8 sm:p-12 shadow-2xl mx-auto overflow-hidden print-container text-left transition-all"
    >
      {/* 1. Centered Authentic Header */}
      <header className="flex flex-col items-center text-center pb-2 mb-3">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 uppercase mb-1">
          {basics.name || 'SYED SOHAIL AHMED'}
        </h1>

        {basics.headline && (
          <p
            style={{ color: primaryColor }}
            className="text-xs sm:text-sm font-bold tracking-wide mb-1"
          >
            {basics.headline}
          </p>
        )}

        {/* Contact Row 1: Email · Phone · Location */}
        <div className="flex flex-wrap justify-center items-center gap-x-2 text-xs text-slate-700 mb-0.5">
          {basics.email && (
            <a href={`mailto:${basics.email}`} className="hover:underline">
              {basics.email}
            </a>
          )}
          {basics.email && (basics.phone || basics.location) && (
            <span className="text-slate-400">·</span>
          )}
          {basics.phone && (
            <a href={`tel:${basics.phone}`} className="hover:underline">
              {basics.phone}
            </a>
          )}
          {basics.phone && basics.location && (
            <span className="text-slate-400">·</span>
          )}
          {basics.location && <span>{basics.location}</span>}
        </div>

        {/* Contact Row 2: Links (LinkedIn · Portfolio · GitHub) */}
        {(basics.linkedin || basics.portfolioUrl || basics.github || basics.website) && (
          <div className="flex flex-wrap justify-center items-center gap-x-2 text-xs">
            {basics.linkedin && (
              <a
                href={formatHref(basics.linkedin)}
                target="_blank"
                rel="noreferrer"
                style={{ color: primaryColor }}
                className="font-medium hover:underline"
              >
                LinkedIn
              </a>
            )}
            {basics.linkedin && (basics.portfolioUrl || basics.website || basics.github) && (
              <span className="text-slate-400">·</span>
            )}
            {(basics.portfolioUrl || basics.website) && (
              <a
                href={formatHref(basics.portfolioUrl || basics.website)}
                target="_blank"
                rel="noreferrer"
                style={{ color: primaryColor }}
                className="font-medium hover:underline"
              >
                Portfolio
              </a>
            )}
            {(basics.portfolioUrl || basics.website) && basics.github && (
              <span className="text-slate-400">·</span>
            )}
            {basics.github && (
              <a
                href={formatHref(basics.github)}
                target="_blank"
                rel="noreferrer"
                style={{ color: primaryColor }}
                className="font-medium hover:underline"
              >
                GitHub
              </a>
            )}
          </div>
        )}
      </header>

      {/* 2. Professional Summary Section */}
      {basics.summary && (
        <section className="mb-3.5">
          <h2
            style={{ color: primaryColor, borderColor: primaryColor }}
            className="text-xs sm:text-sm font-extrabold uppercase tracking-wide border-b-2 pb-0.5 mb-1.5"
          >
            Professional Summary
          </h2>
          <p className="text-xs sm:text-[13px] text-slate-800 leading-relaxed text-justify">
            {basics.summary}
          </p>
        </section>
      )}

      {/* 3. Experience Section */}
      {sections.experience?.visible && sections.experience.items.length > 0 && (
        <section className="mb-3.5">
          <h2
            style={{ color: primaryColor, borderColor: primaryColor }}
            className="text-xs sm:text-sm font-extrabold uppercase tracking-wide border-b-2 pb-0.5 mb-2"
          >
            {sections.experience.title || 'Experience'}
          </h2>

          <div className="space-y-3">
            {sections.experience.items.map((exp) => {
              const bullets = getBullets(exp.description);

              return (
                <div key={exp.id} className="space-y-1">
                  {/* Role · Company (Left) | Date · Location (Right) */}
                  <div className="flex items-baseline justify-between w-full gap-x-2 text-xs sm:text-[13px]">
                    <div className="flex-1 pr-2">
                      <span className="font-bold text-slate-950">{exp.title}</span>
                      {exp.subtitle && (
                        <span style={{ color: primaryColor }} className="font-bold">
                          {' '}· {exp.subtitle}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 italic shrink-0 text-right whitespace-nowrap">
                      {exp.date}
                      {exp.location ? ` · ${exp.location}` : ''}
                    </div>
                  </div>

                  {/* Bullets with single authentic small arrow */}
                  {bullets.length > 0 && (
                    <div className="space-y-1 pl-1">
                      {bullets.map((b, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 text-xs sm:text-[12.5px] text-slate-800 leading-normal"
                        >
                          <span
                            style={{ color: primaryColor }}
                            className="font-bold text-[10px] sm:text-[11px] shrink-0 select-none mt-[3px] leading-none"
                          >
                            ►
                          </span>
                          <span className="flex-1 text-left">{b}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Key Projects Section */}
      {sections.projects?.visible && sections.projects.items.length > 0 && (
        <section className="mb-3.5">
          <h2
            style={{ color: primaryColor, borderColor: primaryColor }}
            className="text-xs sm:text-sm font-extrabold uppercase tracking-wide border-b-2 pb-0.5 mb-2"
          >
            {sections.projects.title || 'Key Projects'}
          </h2>

          <div className="space-y-3">
            {sections.projects.items.map((proj) => {
              const bullets = getBullets(proj.description);

              return (
                <div key={proj.id} className="space-y-0.5">
                  <div className="flex items-baseline justify-between w-full gap-x-2 text-xs sm:text-[13px]">
                    <div className="flex-1 pr-2">
                      <span className="font-bold text-slate-950">{proj.title}</span>
                      {proj.subtitle && (
                        <span style={{ color: primaryColor }} className="font-bold">
                          {' '}· {proj.subtitle}
                        </span>
                      )}
                    </div>
                    {proj.date && (
                      <div className="text-xs text-slate-500 italic shrink-0 text-right whitespace-nowrap">
                        {proj.date}
                      </div>
                    )}
                  </div>

                  {/* Stack line if available */}
                  {proj.tags && proj.tags.length > 0 && (
                    <p className="text-[11.5px] text-slate-500 italic mb-1">
                      Stack: {proj.tags.join(' · ')}
                    </p>
                  )}

                  {bullets.length > 0 && (
                    <div className="space-y-1 pl-1">
                      {bullets.map((b, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 text-xs sm:text-[12.5px] text-slate-800 leading-normal"
                        >
                          <span
                            style={{ color: primaryColor }}
                            className="font-bold text-[10px] sm:text-[11px] shrink-0 select-none mt-[3px] leading-none"
                          >
                            ►
                          </span>
                          <span className="flex-1 text-left">{b}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. Technical Skills Section */}
      {sections.skills?.visible && sections.skills.items.length > 0 && (
        <section className="mb-3.5">
          <h2
            style={{ color: primaryColor, borderColor: primaryColor }}
            className="text-xs sm:text-sm font-extrabold uppercase tracking-wide border-b-2 pb-0.5 mb-2"
          >
            {sections.skills.title || 'Technical Skills'}
          </h2>

          <div className="space-y-1.5">
            {sections.skills.items.map((sk) => (
              <div key={sk.id} className="text-xs sm:text-[12.5px] text-slate-800 leading-normal">
                <span className="font-bold text-slate-950">{sk.title}: </span>
                <span className="text-slate-800">{sk.tags?.join(', ') || sk.description}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. Education Section */}
      {sections.education?.visible && sections.education.items.length > 0 && (
        <section className="mb-3">
          <h2
            style={{ color: primaryColor, borderColor: primaryColor }}
            className="text-xs sm:text-sm font-extrabold uppercase tracking-wide border-b-2 pb-0.5 mb-2"
          >
            {sections.education.title || 'Education'}
          </h2>

          <div className="space-y-2">
            {sections.education.items.map((edu) => (
              <div key={edu.id} className="flex items-baseline justify-between w-full gap-x-2 text-xs sm:text-[13px]">
                <div className="flex-1 pr-2">
                  <span className="font-bold text-slate-950">{edu.title}</span>
                  {edu.subtitle && (
                    <span style={{ color: primaryColor }} className="font-bold">
                      {' '}· {edu.subtitle}
                    </span>
                  )}
                </div>
                {edu.date && (
                  <div className="text-xs text-slate-500 italic shrink-0 text-right whitespace-nowrap">
                    {edu.date}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. Certifications Section */}
      {sections.certifications?.visible && sections.certifications.items.length > 0 && (
        <section className="mb-2">
          <h2
            style={{ color: primaryColor, borderColor: primaryColor }}
            className="text-xs sm:text-sm font-extrabold uppercase tracking-wide border-b-2 pb-0.5 mb-2"
          >
            {sections.certifications.title || 'Certifications'}
          </h2>

          <div className="space-y-1 pl-1">
            {sections.certifications.items.map((cert) => (
              <div key={cert.id} className="flex items-start gap-1.5 text-xs sm:text-[12.5px] text-slate-800">
                <span style={{ color: primaryColor }} className="font-bold text-[11px] shrink-0 select-none mt-0.5">
                  ►
                </span>
                <span className="font-semibold text-slate-900">{cert.title}</span>
                {cert.date && cert.date !== 'Verified' && (
                  <span className="text-slate-500 italic text-xs">({cert.date})</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
