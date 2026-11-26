import merge from 'lodash.merge';
import { THEME_DARK, THEME_LIGHT } from 'twenty-ui/theme';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { crmDark, crmLight } from '~/gos/generated/crm-theme.mjs';

// Growth OS Design System v2 "Polar Light Day" for the CRM (MIGRATION.md §2).
// We override values, never components:
// 1. crmLight / crmDark (generated from tokens.json) are deep-merged into the
//    upstream theme objects. Unknown keys are ignored, missing keys fall back.
// 2. The fork resolves its theme from --t-* CSS variables at runtime, so every
//    merged leaf is also written to the matching --t-* variable.
// 3. Upstream roles the generated file does not cover are bridged to DS
//    semantic roles (var(--gos-*)), never to hex. They switch with
//    html[data-theme], which BaseThemeProvider sets from the colour scheme.

type ThemeTree = { [key: string]: unknown };

export const THEME_LIGHT_GOS = merge({}, THEME_LIGHT, crmLight);
export const THEME_DARK_GOS = merge({}, THEME_DARK, crmDark);

const collectCssVariables = (
  overrides: ThemeTree,
  reference: ThemeTree,
  out: Record<string, string>,
) => {
  for (const [key, value] of Object.entries(overrides)) {
    const target = reference?.[key];

    if (typeof value === 'object' && value !== null) {
      if (typeof target === 'object' && target !== null) {
        collectCssVariables(value as ThemeTree, target as ThemeTree, out);
      }
      continue;
    }

    if (typeof target === 'string' && target.startsWith('var(--t-')) {
      out[target.slice(4, -1)] = String(value);
    }
  }

  return out;
};

const reference = themeCssVariables as unknown as ThemeTree;

// Roles shared by light and dark: the DS variables already switch per theme.
const GOS_BRIDGE: Record<string, string> = {
  // Upstream "accent" scale = selection, focus and info. DS: selected tint,
  // info soft/line, focus blue. Primary buttons are navy (see shell CSS).
  '--t-accent-accent1': 'var(--gos-surface)',
  '--t-accent-accent2': 'var(--gos-selected)',
  '--t-accent-accent3': 'var(--gos-selected)',
  '--t-accent-accent4': 'var(--gos-info-soft)',
  '--t-accent-accent5': 'var(--gos-info-soft)',
  '--t-accent-accent6': 'var(--gos-info-line)',
  '--t-accent-accent7': 'var(--gos-info-line)',
  '--t-accent-accent8': 'var(--gos-focus)',
  '--t-accent-accent9': 'var(--gos-focus)',
  '--t-accent-accent10': 'var(--gos-info-ink)',
  '--t-accent-accent11': 'var(--gos-info-ink)',
  '--t-accent-accent12': 'var(--gos-text-strong)',
  '--t-accent-accent3570': 'var(--gos-info-line)',
  '--t-accent-accent4060': 'var(--gos-info-line)',
  '--t-accent-tertiary': 'var(--gos-selected)',
  '--t-accent-quaternary': 'var(--gos-selected)',
  '--t-border-color-blue': 'var(--gos-focus)',
  '--t-background-transparent-blue': 'var(--gos-selected)',
  '--t-buttons-secondary-text-color': 'var(--gos-info-ink)',
  '--t-snack-bar-info-color': 'var(--gos-info-ink)',
  '--t-snack-bar-info-background-color': 'var(--gos-info-soft)',

  // Gray scale (surface → text), used by neutral chips, skeletons and lines.
  '--t-gray-scale-gray1': 'var(--gos-surface)',
  '--t-gray-scale-gray2': 'var(--gos-bg)',
  '--t-gray-scale-gray3': 'var(--gos-bg-subtle)',
  '--t-gray-scale-gray4': 'var(--gos-bg-sunken)',
  '--t-gray-scale-gray5': 'var(--gos-line-2)',
  '--t-gray-scale-gray6': 'var(--gos-line)',
  '--t-gray-scale-gray7': 'var(--gos-line-strong)',
  '--t-gray-scale-gray8': 'var(--gos-text-disabled)',
  '--t-gray-scale-gray9': 'var(--gos-input-line)',
  '--t-gray-scale-gray10': 'var(--gos-text-3)',
  '--t-gray-scale-gray11': 'var(--gos-text-2)',
  '--t-gray-scale-gray12': 'var(--gos-text)',

  // Surfaces and text roles not in crm-theme.
  '--t-background-inverted-primary': 'var(--gos-primary)',
  '--t-background-inverted-secondary': 'var(--gos-primary-hover)',
  '--t-background-primary-inverted': 'var(--gos-primary)',
  '--t-background-primary-inverted-hover': 'var(--gos-primary-hover)',
  '--t-background-overlay-primary': 'var(--gos-overlay)',
  '--t-background-overlay-secondary': 'var(--gos-overlay)',
  '--t-background-transparent-primary': 'var(--gos-hover)',
  '--t-background-transparent-secondary': 'var(--gos-hover)',
  '--t-background-transparent-lighter': 'var(--gos-hover)',
  '--t-background-transparent-medium': 'var(--gos-line-2)',
  '--t-background-transparent-strong': 'var(--gos-line)',
  // AA: upstream uses extra-light for real text (counts, footers), so it maps to text-3.
  '--t-font-color-extra-light': 'var(--gos-text-3)',
  '--t-font-color-danger': 'var(--gos-danger-ink)',
  '--t-border-color-inverted': 'var(--gos-primary)',
  '--t-border-color-danger': 'var(--gos-danger-line)',
  '--t-code-font-family': 'var(--gos-font-mono)',

  // Elevation and radius (tokens.css): card xs, popover md, modal xl.
  '--t-box-shadow-light': 'var(--gos-shadow-sm)',
  '--t-box-shadow-strong': 'var(--gos-shadow-md)',
  '--t-box-shadow-super-heavy': 'var(--gos-shadow-xl)',
  '--t-border-radius-xs': 'var(--gos-radius-xs)',
  '--t-border-radius-lg': 'var(--gos-radius-lg)',
  '--t-border-radius-xxl': 'var(--gos-radius-2xl)',
  '--t-tooltip-background': 'var(--gos-primary)',
  '--t-tooltip-color': 'var(--gos-primary-ink)',

  // Lucide stroke everywhere (VISUAL-LANGUAGE §5): one width, 1.75.
  '--t-icon-stroke-sm': '1.75',
  '--t-icon-stroke-md': '1.75',
  '--t-icon-stroke-lg': '1.75',
  '--t-text-icon-strike-light': '1.75',
  '--t-text-icon-strike-medium': '1.75',
  '--t-text-icon-strike-bold': '1.75',
};

const toBlock = (selector: string, variables: Record<string, string>) =>
  `${selector}{${Object.entries(variables)
    .map(([name, value]) => `${name}:${value}`)
    .join(';')}}`;

export const GOS_THEME_CSS = [
  toBlock(
    'html:root.light,html:root .light',
    collectCssVariables(crmLight, reference, {}),
  ),
  toBlock(
    'html:root.dark,html:root .dark',
    collectCssVariables(crmDark, reference, {}),
  ),
  toBlock('html:root.light,html:root.dark,html:root .light,html:root .dark', {
    ...GOS_BRIDGE,
    '--t-corner-shape': 'round',
  }),
].join('\n');

export const applyGosThemeOverrides = () => {
  if (typeof document === 'undefined') return;

  const id = 'growth-os-theme-overrides';
  const existing = document.getElementById(id);
  const style = existing ?? document.createElement('style');

  style.id = id;
  style.textContent = GOS_THEME_CSS;

  if (!existing) document.head.appendChild(style);
};

export const setGosDataTheme = (colorScheme: 'light' | 'dark') => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = colorScheme;
  document.documentElement.dataset.m = 'crm';
};
