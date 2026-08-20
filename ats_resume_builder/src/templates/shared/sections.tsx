import { PlacementContext, Placement, usePlacement, useTextColor } from './context';
import { useResume } from '../../context/ResumeContext';
import { SectionHeading, SubHeading, BodyText, SmallText, TagBadge } from './primitives';
import { TimelineSection, TimelineItem } from './timeline';
import { BaseSectionItem, SectionType } from '../../types/resume';

export const SectionItem = ({ item, type }: { item: BaseSectionItem; type: SectionType }) => {
  const placement = usePlacement();
  const textColor = useTextColor(placement);
  const { metadata } = useResume();

  if (type === 'skills') {
    const skillsList = (item.tags && item.tags.length > 0)
      ? item.tags.join(', ')
      : (item.description || '');

    return (
      <div className="flex flex-wrap items-baseline gap-1.5 py-0.5 text-left leading-relaxed w-full overflow-hidden break-words">
        {item.title && (
          <span
            style={{
              color: textColor,
              fontSize: `${metadata.typography.bodySize * 0.95}pt`,
            }}
            className="font-bold shrink-0"
          >
            {item.title}:
          </span>
        )}
        <span
          style={{
            color: textColor,
            fontSize: `${metadata.typography.bodySize * 0.9}pt`,
          }}
          className="font-medium opacity-90 break-words"
        >
          {skillsList}
        </span>
      </div>
    );
  }

  if (type === 'languages') {
    return (
      <div className="flex items-baseline justify-between py-0.5 w-full overflow-hidden break-words gap-1">
        <SubHeading className="break-words">{item.title}</SubHeading>
        {item.subtitle && <SmallText className="shrink-0">{item.subtitle}</SmallText>}
      </div>
    );
  }

  const renderDescription = (desc: string) => {
    // Split by newlines or bullet characters (•, -, *)
    const lines = desc
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const hasBullets = lines.some((l) => /^[-*•]\s+/.test(l));

    if (hasBullets || lines.length > 1) {
      return (
        <ul className="list-none space-y-1 mt-1.5 pl-0.5">
          {lines.map((line, i) => {
            const cleanText = line.replace(/^[-*•]\s+/, '');
            return (
              <li key={i} className="flex items-start gap-2 text-left">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-60 mt-1.5 shrink-0" />
                <BodyText className="flex-1 leading-relaxed break-words">{cleanText}</BodyText>
              </li>
            );
          })}
        </ul>
      );
    }

    return <BodyText className="whitespace-pre-line mt-1 leading-relaxed break-words">{desc}</BodyText>;
  };

  const isEducation = type === 'education';

  if (isEducation) {
    if (placement === 'sidebar') {
      return (
        <div className="flex flex-col gap-0.5 mb-3 text-left w-full overflow-hidden break-words">
          <div className="flex items-start justify-between gap-2">
            <span
              style={{
                color: textColor,
                fontSize: `${metadata.typography.bodySize * 0.95}pt`,
              }}
              className="font-bold leading-snug break-words flex-1"
            >
              {item.title}
            </span>
            {item.date && (
              <span
                style={{ color: textColor, fontSize: `${metadata.typography.bodySize * 0.85}pt` }}
                className="font-semibold shrink-0 text-right opacity-80"
              >
                {item.date}
              </span>
            )}
          </div>
          <div className="flex items-start justify-between gap-2">
            {item.subtitle && (
              <span
                style={{
                  color: textColor,
                  fontSize: `${metadata.typography.bodySize * 0.9}pt`,
                }}
                className="font-medium opacity-90 leading-snug break-words flex-1"
              >
                {item.subtitle}
              </span>
            )}
            {item.location && (
              <span
                style={{ color: textColor, fontSize: `${metadata.typography.bodySize * 0.85}pt` }}
                className="opacity-70 shrink-0 text-right"
              >
                {item.location}
              </span>
            )}
          </div>
          {item.description && renderDescription(item.description)}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1 mb-3.5 text-left w-full overflow-hidden break-words">
        <div className="flex items-start justify-between gap-4">
          {/* Degree & School on the Left */}
          <div className="flex-1 min-w-0">
            <h3
              style={{
                color: textColor,
                fontSize: `${metadata.typography.bodySize * 1.05}pt`,
              }}
              className="font-bold tracking-tight text-slate-900 break-words"
            >
              {item.title}
            </h3>
            {item.subtitle && (
              <div
                style={{
                  color: textColor,
                  fontSize: `${metadata.typography.bodySize * 0.95}pt`,
                }}
                className="font-medium text-slate-700 opacity-90 mt-0.5 break-words"
              >
                {item.subtitle}
              </div>
            )}
          </div>

          {/* Date & Location pinned to the Far Right Corner */}
          <div className="text-right shrink-0 flex flex-col items-end">
            {item.date && (
              <span
                style={{
                  color: textColor,
                  fontSize: `${metadata.typography.bodySize * 0.92}pt`,
                }}
                className="font-semibold text-slate-800"
              >
                {item.date}
              </span>
            )}
            {item.location && (
              <span
                style={{
                  color: textColor,
                  fontSize: `${metadata.typography.bodySize * 0.88}pt`,
                }}
                className="text-slate-600 opacity-80"
              >
                {item.location}
              </span>
            )}
          </div>
        </div>

        {item.description && renderDescription(item.description)}
      </div>
    );
  }

  const content = (
    <div className="flex flex-col gap-1.5 mb-5 w-full overflow-hidden break-words">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
        <div className="min-w-0">
          <h3
            style={{ fontSize: `${metadata.typography.bodySize * 1.08}pt` }}
            className="font-bold tracking-tight text-slate-900 break-words"
          >
            {item.title}
          </h3>
          {item.subtitle && (
            <div className="font-medium text-opacity-80 text-slate-700 text-xs mt-0.5 break-words">
              <span>{item.subtitle}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:items-end shrink-0">
          {item.date && <SmallText className="font-semibold text-slate-600">{item.date}</SmallText>}
          {item.location && <SmallText className="text-slate-500">{item.location}</SmallText>}
        </div>
      </div>

      {item.description && renderDescription(item.description)}

      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {item.tags.map((tag, idx) => (
            <TagBadge key={idx} label={tag} />
          ))}
        </div>
      )}
    </div>
  );

  if ((type === 'experience' || (type as string) === 'education') && placement === 'main') {
    return <TimelineItem>{content}</TimelineItem>;
  }

  return content;
};

export const Section = ({ sectionId }: { sectionId: string }) => {
  const { data } = useResume();
  const placement = usePlacement();
  const section = data.sections[sectionId];

  if (!section || !section.visible) {
    return null;
  }

  if (sectionId === 'summary') {
    if (!data.basics.summary && section.items.length === 0) return null;
    return (
      <div className="flex flex-col gap-1.5 mb-5 w-full overflow-hidden break-words">
        <SectionHeading>{section.title}</SectionHeading>
        {data.basics.summary && (
          <BodyText className="whitespace-pre-line leading-relaxed break-words text-slate-700">
            {data.basics.summary}
          </BodyText>
        )}
        {section.items.map((item) => (
          <SectionItem key={item.id} item={item} type={section.type} />
        ))}
      </div>
    );
  }

  if (section.items.length === 0) {
    return null;
  }

  const isTimeline = (section.type === 'experience' || section.type === 'education') && placement === 'main';

  return (
    <div className="flex flex-col gap-2 mb-5 w-full overflow-hidden break-words">
      <SectionHeading>{section.title}</SectionHeading>
      {isTimeline ? (
        <TimelineSection>
          {section.items.map((item) => (
            <SectionItem key={item.id} item={item} type={section.type} />
          ))}
        </TimelineSection>
      ) : (
        <div className="flex flex-col gap-2.5 w-full overflow-hidden">
          {section.items.map((item) => (
            <SectionItem key={item.id} item={item} type={section.type} />
          ))}
        </div>
      )}
    </div>
  );
};

export const RegionSections = ({ placement }: { placement: Placement }) => {
  const { metadata } = useResume();
  const sectionIds = metadata?.layout?.[placement] || (placement === 'main' ? ['summary', 'experience', 'projects'] : ['skills', 'education', 'languages']);

  return (
    <PlacementContext.Provider value={placement}>
      <div className="flex flex-col gap-2.5 w-full overflow-hidden">
        {sectionIds.map((sectionId) => (
          <Section key={sectionId} sectionId={sectionId} />
        ))}
      </div>
    </PlacementContext.Provider>
  );
};
