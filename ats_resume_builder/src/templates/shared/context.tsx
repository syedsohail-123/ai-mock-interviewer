import { createContext, useContext } from 'react';
import { useResume } from '../../context/ResumeContext';

export type Placement = 'sidebar' | 'main';

export const PlacementContext = createContext<Placement>('main');

export const usePlacement = () => useContext(PlacementContext);

export const useTextColor = (placement?: Placement) => {
  const currentPlacement = placement ?? usePlacement();
  const { metadata } = useResume();
  return currentPlacement === 'sidebar'
    ? (metadata.colors.sidebarText || metadata.colors.text)
    : metadata.colors.text;
};

export const useAccentColor = (placement?: Placement) => {
  const currentPlacement = placement ?? usePlacement();
  const { metadata } = useResume();
  return currentPlacement === 'sidebar'
    ? (metadata.colors.sidebarText || metadata.colors.primary)
    : metadata.colors.primary;
};

export const useTemplateMetrics = () => {
  const { metadata } = useResume();
  const base = metadata.typography.bodySize;
  return {
    sectionGap: base * 1.5,
    itemGap: base * 0.75,
    headerGap: base * 1.25,
    columnGap: base * 1.5,
    pagePadding: base * 2.5,
  };
};
