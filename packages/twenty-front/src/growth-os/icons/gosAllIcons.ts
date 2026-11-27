// Growth OS DS v2.5: replaces the upstream ALL_ICONS catalog (the icon picker and
// name lookup) with the DS-mapped catalog, so no Tabler glyph is ever loaded.
// Aliased in vite.config.ts over twenty-ui's internal AllIcons chunk.
import * as GosIcons from './tablerToGos';

export const ALL_ICONS = { ...GosIcons };
