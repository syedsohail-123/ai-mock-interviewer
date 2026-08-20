import { ResumeData, ResumeMetadata } from '../types/resume';
import { ComponentType } from 'react';

export interface TemplateProps {
  data: ResumeData;
  metadata: ResumeMetadata;
}

export type TemplateComponent = ComponentType<TemplateProps>;
