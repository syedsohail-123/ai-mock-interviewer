import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Link,
  pdf,
} from '@react-pdf/renderer';
import { ResumeData } from '../../types/resume';

const formatUrl = (url: string) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `https://${url}`;
};

export const UniversalPdfDocument = ({
  data,
  template = 'azurill',
}: {
  data: ResumeData;
  template?: string;
}) => {
  const { basics, metadata, sections } = data;
  const isA4 = metadata.page.size === 'A4';
  const primaryColor = metadata.colors.primary || '#0ea5e9';
  const textColor = metadata.colors.text || '#1e293b';
  const sidebarBg = metadata.colors.sidebar || '#f8fafc';
  const sidebarText = metadata.colors.sidebarText || textColor;

  const isDarkHeader = template === 'gengar';
  const isBannerHeader = template === 'bronzor';
  const isMinimal = template === 'onyx';

  const styles = StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: metadata.colors.background || '#ffffff',
      padding: 0,
      fontFamily: 'Helvetica',
    },
    topAccentBar: {
      height: 6,
      backgroundColor: primaryColor,
      width: '100%',
    },
    header: {
      padding: isMinimal ? 24 : 20,
      backgroundColor: isBannerHeader
        ? primaryColor
        : isDarkHeader
        ? '#0f172a'
        : 'transparent',
      borderBottomWidth: isMinimal || isDarkHeader || isBannerHeader ? 0 : 1.5,
      borderBottomColor: primaryColor,
      flexDirection: 'column',
      gap: 8,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    profileImage: {
      width: 50,
      height: 50,
      borderRadius: 25,
      objectFit: 'cover',
      borderWidth: 1.5,
      borderColor: isBannerHeader || isDarkHeader ? '#ffffff' : primaryColor,
    },
    name: {
      fontSize: metadata.typography.headingSize * 1.6,
      fontWeight: 'bold',
      color: isBannerHeader || isDarkHeader ? '#ffffff' : primaryColor,
      marginBottom: 2,
    },
    headline: {
      fontSize: metadata.typography.bodySize * 1.15,
      color: isBannerHeader || isDarkHeader ? '#e2e8f0' : textColor,
    },
    contactStrip: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      paddingTop: 8,
      borderTopWidth: 0.5,
      borderTopColor: isBannerHeader ? 'rgba(255,255,255,0.3)' : isDarkHeader ? '#334155' : '#e2e8f0',
      alignItems: 'center',
    },
    contactLink: {
      fontSize: metadata.typography.bodySize * 0.85,
      color: isBannerHeader || isDarkHeader ? '#ffffff' : primaryColor,
      textDecoration: 'none',
    },
    contactText: {
      fontSize: metadata.typography.bodySize * 0.85,
      color: isBannerHeader || isDarkHeader ? '#e2e8f0' : textColor,
    },
    bodyContainer: {
      flexDirection: 'row',
      flex: 1,
    },
    sidebar: {
      width: `${metadata.page.sidebarWidth}%`,
      backgroundColor: sidebarBg,
      padding: 16,
      borderRightWidth: isBannerHeader ? 0 : 1,
      borderRightColor: '#e2e8f0',
      borderLeftWidth: isBannerHeader ? 1 : 0,
      borderLeftColor: '#e2e8f0',
    },
    main: {
      flex: 1,
      padding: 18,
    },
    sectionHeading: {
      fontSize: metadata.typography.headingSize,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
      paddingBottom: 2,
      borderBottomWidth: 1,
      borderBottomColor: '#cbd5e1',
    },
    itemTitle: {
      fontSize: metadata.typography.bodySize * 1.05,
      fontWeight: 'bold',
    },
    itemSubtitle: {
      fontSize: metadata.typography.bodySize * 0.9,
      color: textColor,
      opacity: 0.85,
    },
    itemDate: {
      fontSize: metadata.typography.bodySize * 0.8,
      color: textColor,
      opacity: 0.7,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 5,
      marginTop: 2,
    },
    bulletDot: {
      width: 3.5,
      height: 3.5,
      borderRadius: 2,
      backgroundColor: textColor,
      marginTop: 4,
      opacity: 0.6,
    },
    bulletText: {
      flex: 1,
      fontSize: metadata.typography.bodySize * 0.95,
      color: textColor,
      lineHeight: 1.35,
    },
    tagContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: 4,
    },
    tag: {
      fontSize: metadata.typography.bodySize * 0.75,
      color: primaryColor,
      borderWidth: 0.8,
      borderColor: primaryColor,
      borderRadius: 3,
      paddingHorizontal: 4,
      paddingVertical: 1.5,
    },
  });

  const renderDescriptionBullets = (desc: string, currentText: string) => {
    const lines = desc
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    return (
      <View style={{ marginTop: 2 }}>
        {lines.map((line, idx) => {
          const cleanLine = line.replace(/^[-*•]\s+/, '');
          return (
            <View key={idx} style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: currentText }]} />
              <Text style={[styles.bulletText, { color: currentText }]}>{cleanLine}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderSectionItems = (sectionId: string, isSidebar: boolean) => {
    const section = sections[sectionId];
    if (!section || !section.visible || section.items.length === 0) return null;

    const accent = isSidebar ? (metadata.colors.sidebarText || primaryColor) : primaryColor;
    const currentText = isSidebar ? sidebarText : textColor;

    return (
      <View key={sectionId} style={{ marginBottom: 12 }}>
        <Text style={[styles.sectionHeading, { color: accent }]}>{section.title}</Text>
        {section.items.map((item) => (
          <View key={item.id} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={[styles.itemTitle, { color: currentText }]}>{item.title}</Text>
              {item.date && <Text style={styles.itemDate}>{item.date}</Text>}
            </View>
            {item.subtitle && <Text style={[styles.itemSubtitle, { color: currentText }]}>{item.subtitle}</Text>}
            {item.description && renderDescriptionBullets(item.description, currentText)}
            {item.tags && item.tags.length > 0 && (
              <View style={styles.tagContainer}>
                {item.tags.map((tag, idx) => (
                  <Text key={idx} style={[styles.tag, { color: accent, borderColor: accent }]}>
                    {tag}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Document>
      <Page size={isA4 ? 'A4' : 'LETTER'} style={styles.page}>
        {template === 'pikachu' && <View style={styles.topAccentBar} />}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {basics.photoUrl ? (
              <Image src={basics.photoUrl} style={styles.profileImage} />
            ) : null}
            <View>
              <Text style={styles.name}>{basics.name || 'Your Name'}</Text>
              <Text style={styles.headline}>{basics.headline}</Text>
            </View>
          </View>

          {/* Horizontal Clickable Contacts */}
          <View style={styles.contactStrip}>
            {basics.email ? (
              <Link src={`mailto:${basics.email}`} style={styles.contactLink}>
                {basics.email}
              </Link>
            ) : null}
            {basics.phone ? (
              <Link src={`tel:${basics.phone}`} style={styles.contactText}>
                {basics.phone}
              </Link>
            ) : null}
            {basics.location ? (
              <Text style={styles.contactText}>{basics.location}</Text>
            ) : null}
            {basics.portfolioUrl ? (
              <Link src={formatUrl(basics.portfolioUrl)} style={styles.contactLink}>
                Portfolio
              </Link>
            ) : null}
            {basics.website ? (
              <Link src={formatUrl(basics.website)} style={styles.contactLink}>
                Website
              </Link>
            ) : null}
            {basics.linkedin ? (
              <Link
                src={formatUrl(
                  basics.linkedin.includes('linkedin.com')
                    ? basics.linkedin
                    : `linkedin.com/in/${basics.linkedin}`
                )}
                style={styles.contactLink}
              >
                LinkedIn
              </Link>
            ) : null}
            {basics.github ? (
              <Link
                src={formatUrl(
                  basics.github.includes('github.com')
                    ? basics.github
                    : `github.com/${basics.github}`
                )}
                style={styles.contactLink}
              >
                GitHub
              </Link>
            ) : null}
          </View>
        </View>

        {/* Content Body */}
        {isMinimal ? (
          <View style={{ padding: 24, gap: 10 }}>
            {metadata.layout.main.map((secId) => renderSectionItems(secId, false))}
            {metadata.layout.sidebar.map((secId) => renderSectionItems(secId, false))}
          </View>
        ) : isBannerHeader ? (
          <View style={styles.bodyContainer}>
            <View style={styles.main}>
              {metadata.layout.main.map((secId) => renderSectionItems(secId, false))}
            </View>
            <View style={styles.sidebar}>
              {metadata.layout.sidebar.map((secId) => renderSectionItems(secId, true))}
            </View>
          </View>
        ) : (
          <View style={styles.bodyContainer}>
            <View style={styles.sidebar}>
              {metadata.layout.sidebar.map((secId) => renderSectionItems(secId, true))}
            </View>
            <View style={styles.main}>
              {metadata.layout.main.map((secId) => renderSectionItems(secId, false))}
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
};

export const exportResumeToPdf = async (data: ResumeData, templateName: string = 'azurill') => {
  const blob = await pdf(<UniversalPdfDocument data={data} template={templateName} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.basics.name.replace(/\s+/g, '_') || 'Resume'}_${templateName}_CV.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
