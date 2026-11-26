import { type ResizablePanelConstraints } from '@/ui/layout/resizable-panel/types/ResizablePanelConstraints';

export const NAVIGATION_DRAWER_CONSTRAINTS: ResizablePanelConstraints = {
  min: 180,
  max: 350,
  // Growth OS DS v2: 232px sidebar (216 × the 14/13 density zoom).
  default: 216,
};
