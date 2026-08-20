import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ResumeData, ResumeMetadata, ProfileBasics, BaseSectionItem, SectionDefinition } from '../types/resume';

export const initialResumeData: ResumeData = {
  id: 'resume-1',
  title: 'My Resume',
  basics: {
    name: '',
    headline: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    portfolioUrl: '',
    linkedin: '',
    github: '',
    photoUrl: '',
    summary: '',
  },
  sections: {
    summary: {
      id: 'summary',
      title: 'Professional Summary',
      type: 'custom',
      visible: true,
      items: [],
    },
    experience: {
      id: 'experience',
      title: 'Work Experience',
      type: 'experience',
      visible: true,
      items: [],
    },
    skills: {
      id: 'skills',
      title: 'Technical Skills',
      type: 'skills',
      visible: true,
      items: [],
    },
    projects: {
      id: 'projects',
      title: 'Key Projects',
      type: 'projects',
      visible: true,
      items: [],
    },
    education: {
      id: 'education',
      title: 'Education',
      type: 'education',
      visible: true,
      items: [],
    },
    certifications: {
      id: 'certifications',
      title: 'Certifications',
      type: 'certifications',
      visible: true,
      items: [],
    },
  },
  metadata: {
    colors: {
      primary: '#0ea5e9',      // Sky-500
      background: '#ffffff',   // White page
      text: '#1e293b',         // Slate-800
      sidebar: '#f8fafc',      // Slate-50
      sidebarText: '#0f172a',  // Slate-900
    },
    typography: {
      headingSize: 14,
      bodySize: 10,
      fontFamily: 'Inter, sans-serif',
      lineHeight: 1.5,
    },
    page: {
      size: 'A4',
      sidebarWidth: 32,
      hideIcons: false,
      hideLinkUnderline: true,
    },
    layout: {
      sidebar: ['skills', 'education', 'certifications'],
      main: ['summary', 'experience', 'projects'],
    },
  },
};

interface ResumeContextType {
  data: ResumeData;
  metadata: ResumeMetadata;
  updateBasics: (basics: Partial<ProfileBasics>) => void;
  updateMetadata: (metadata: Partial<ResumeMetadata>) => void;
  updateColors: (colors: Partial<ResumeMetadata['colors']>) => void;
  updateTypography: (typography: Partial<ResumeMetadata['typography']>) => void;
  updatePageSettings: (page: Partial<ResumeMetadata['page']>) => void;
  updateLayout: (placement: 'sidebar' | 'main', sectionIds: string[]) => void;
  addSectionItem: (sectionId: string, item: Omit<BaseSectionItem, 'id'>) => void;
  updateSectionItem: (sectionId: string, itemId: string, item: Partial<BaseSectionItem>) => void;
  deleteSectionItem: (sectionId: string, itemId: string) => void;
  reorderSectionItems: (sectionId: string, items: BaseSectionItem[]) => void;
  addSection: (title: string, type: SectionDefinition['type'], placement: 'sidebar' | 'main') => void;
  updateSectionTitle: (sectionId: string, title: string) => void;
  setResumeData: React.Dispatch<React.SetStateAction<ResumeData>>;
  resetToDefault: () => void;
}

const ResumeContext = createContext<ResumeContextType | null>(null);

const STORAGE_KEY = 'ats_resume_builder_data_v4';

export const ResumeProvider = ({ children }: { children: ReactNode }) => {
  const [data, setResumeData] = useState<ResumeData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.basics?.name) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to load saved resume data', e);
      }
    }
    return initialResumeData;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const updateBasics = (basics: Partial<ProfileBasics>) => {
    setResumeData((prev) => ({
      ...prev,
      basics: { ...prev.basics, ...basics },
    }));
  };

  const updateMetadata = (metadata: Partial<ResumeMetadata>) => {
    setResumeData((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, ...metadata },
    }));
  };

  const updateColors = (colors: Partial<ResumeMetadata['colors']>) => {
    setResumeData((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        colors: { ...prev.metadata.colors, ...colors },
      },
    }));
  };

  const updateTypography = (typography: Partial<ResumeMetadata['typography']>) => {
    setResumeData((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        typography: { ...prev.metadata.typography, ...typography },
      },
    }));
  };

  const updatePageSettings = (page: Partial<ResumeMetadata['page']>) => {
    setResumeData((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        page: { ...prev.metadata.page, ...page },
      },
    }));
  };

  const updateLayout = (placement: 'sidebar' | 'main', sectionIds: string[]) => {
    setResumeData((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        layout: {
          ...prev.metadata.layout,
          [placement]: sectionIds,
        },
      },
    }));
  };

  const addSectionItem = (sectionId: string, item: Omit<BaseSectionItem, 'id'>) => {
    const newItem: BaseSectionItem = {
      ...item,
      id: `${sectionId}-${Date.now()}`,
    };

    setResumeData((prev) => {
      const section = prev.sections[sectionId];
      if (!section) return prev;

      return {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionId]: {
            ...section,
            items: [...section.items, newItem],
          },
        },
      };
    });
  };

  const updateSectionItem = (sectionId: string, itemId: string, item: Partial<BaseSectionItem>) => {
    setResumeData((prev) => {
      const section = prev.sections[sectionId];
      if (!section) return prev;

      return {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionId]: {
            ...section,
            items: section.items.map((i) => (i.id === itemId ? { ...i, ...item } : i)),
          },
        },
      };
    });
  };

  const deleteSectionItem = (sectionId: string, itemId: string) => {
    setResumeData((prev) => {
      const section = prev.sections[sectionId];
      if (!section) return prev;

      return {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionId]: {
            ...section,
            items: section.items.filter((i) => i.id !== itemId),
          },
        },
      };
    });
  };

  const reorderSectionItems = (sectionId: string, items: BaseSectionItem[]) => {
    setResumeData((prev) => {
      const section = prev.sections[sectionId];
      if (!section) return prev;

      return {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionId]: {
            ...section,
            items,
          },
        },
      };
    });
  };

  const addSection = (title: string, type: SectionDefinition['type'], placement: 'sidebar' | 'main') => {
    const id = `custom_${Date.now()}`;
    const newSection: SectionDefinition = {
      id,
      title,
      type,
      visible: true,
      items: [],
    };

    setResumeData((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [id]: newSection,
      },
      metadata: {
        ...prev.metadata,
        layout: {
          ...prev.metadata.layout,
          [placement]: [...prev.metadata.layout[placement], id],
        },
      },
    }));
  };

  const updateSectionTitle = (sectionId: string, title: string) => {
    setResumeData((prev) => {
      const section = prev.sections[sectionId];
      if (!section) return prev;

      return {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionId]: {
            ...section,
            title,
          },
        },
      };
    });
  };

  const resetToDefault = () => {
    setResumeData(initialResumeData);
  };

  return (
    <ResumeContext.Provider
      value={{
        data,
        metadata: data.metadata,
        updateBasics,
        updateMetadata,
        updateColors,
        updateTypography,
        updatePageSettings,
        updateLayout,
        addSectionItem,
        updateSectionItem,
        deleteSectionItem,
        reorderSectionItems,
        addSection,
        updateSectionTitle,
        setResumeData,
        resetToDefault,
      }}
    >
      {children}
    </ResumeContext.Provider>
  );
};

export const useResume = () => {
  const context = useContext(ResumeContext);
  if (!context) {
    throw new Error('useResume must be used within a ResumeProvider');
  }
  return context;
};
