export interface ResumeMetadata {
  colors: {
    primary: string;      // section headings, accents, timeline dots
    background: string;   // page background
    text: string;         // body text
    sidebar?: string;     // sidebar background (optional)
    sidebarText?: string; // sidebar text (optional)
  };
  typography: {
    headingSize: number;  // section heading font size (pt / px)
    bodySize: number;     // body text font size (pt / px)
    fontFamily: string;
    lineHeight?: number;
  };
  page: {
    size: 'A4' | 'Letter';
    sidebarWidth: number; // percentage e.g. 30
    hideIcons: boolean;
    hideLinkUnderline: boolean;
  };
  layout: {
    sidebar: string[];    // section ids assigned to sidebar
    main: string[];       // section ids assigned to main
  };
}

export interface ProfileBasics {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  portfolioUrl?: string;
  linkedin: string;
  github: string;
  photoUrl?: string;
  summary: string;
}

export type SectionType = 
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'languages'
  | 'awards'
  | 'custom';

export interface BaseSectionItem {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
  location?: string;
  description?: string;
  tags?: string[];
  url?: string;
}

export interface SectionDefinition {
  id: string;
  title: string;
  type: SectionType;
  items: BaseSectionItem[];
  visible: boolean;
}

export interface ResumeData {
  id: string;
  title: string;
  basics: ProfileBasics;
  sections: Record<string, SectionDefinition>;
  metadata: ResumeMetadata;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactItemProps {
  icon?: React.ReactNode;
  value: string;
  href?: string;
  className?: string;
}
