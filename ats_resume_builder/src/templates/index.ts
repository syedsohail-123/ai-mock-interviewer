import { OriginalAuthenticTemplate } from './original/OriginalAuthenticTemplate';
import { AzurillTemplate } from './azurill/AzurillTemplate';
import { BronzorTemplate } from './bronzor/BronzorTemplate';
import { OnyxTemplate } from './onyx/OnyxTemplate';
import { PikachuTemplate } from './pikachu/PikachuTemplate';
import { GengarTemplate } from './gengar/GengarTemplate';
import { LeafTemplate } from './leaf/LeafTemplate';
import { GlaceonTemplate } from './glaceon/GlaceonTemplate';
import { DevopsClassicTemplate } from './devops/DevopsClassicTemplate';
import { MinimalATSClassicTemplate } from './classic/MinimalATSClassicTemplate';
import { ModernProSingleTemplate } from './modern/ModernProSingleTemplate';
import { TemplateComponent } from './types';

export const templates: Record<string, { name: string; component: TemplateComponent; description: string }> = {
  original: {
    name: 'Original Authentic ATS',
    component: OriginalAuthenticTemplate,
    description: 'Exact 1:1 replica of your uploaded resume layout with blue headers, arrow bullets, and horizontal contact bar.',
  },
  devops: {
    name: 'DevOps Classic',
    component: DevopsClassicTemplate,
    description: 'Minimalist full-width ATS single-column template with highlighted links and technical stack emphasis.',
  },
  onyx: {
    name: 'Onyx',
    component: OnyxTemplate,
    description: 'Clean single-column ATS format with centered contact rows.',
  },
  minimal_ats: {
    name: 'Minimalist ATS',
    component: MinimalATSClassicTemplate,
    description: 'Traditional standard ATS layout with clean pipe delimiters and sharp typography.',
  },
  modern_single: {
    name: 'Modern Pro',
    component: ModernProSingleTemplate,
    description: 'Streamlined single-column format with subtle top accent bar and fluid layout.',
  },
  azurill: {
    name: 'Azurill',
    component: AzurillTemplate,
    description: 'Two-column layout with left sidebar and horizontal contact bar.',
  },
  bronzor: {
    name: 'Bronzor',
    component: BronzorTemplate,
    description: 'Full-width colored banner header with left sidebar.',
  },
  pikachu: {
    name: 'Pikachu',
    component: PikachuTemplate,
    description: 'Executive template with top accent line and enclosed contact strip.',
  },
  gengar: {
    name: 'Gengar',
    component: GengarTemplate,
    description: 'High-contrast dark card header with accent icons.',
  },
  leaf: {
    name: 'Leaf',
    component: LeafTemplate,
    description: 'Refined editorial header with clean layout.',
  },
  glaceon: {
    name: 'Glaceon',
    component: GlaceonTemplate,
    description: 'Card-enclosed header with accent border and left sidebar.',
  },
};

export type TemplateName = keyof typeof templates;

export const getTemplate = (name: string): TemplateComponent => {
  return templates[name]?.component || templates.devops.component;
};

export * from './types';
