import { createElement, forwardRef, type SVGProps } from 'react';

import { GOS_ICON_NODES } from './gosIcons.generated';

// Tabler-compatible icon component drawn from the Growth OS DS v2 Lucide
// subset: 24px grid, currentColor, one stroke width (1.75) everywhere.
export type GosIconProps = Omit<SVGProps<SVGSVGElement>, 'stroke'> & {
  size?: number | string;
  stroke?: number | string;
  color?: string;
  title?: string;
};

export const GOS_ICON_STROKE = 1.75;

export const createGosIcon = (lucideName: string, displayName: string) => {
  const nodes = GOS_ICON_NODES[lucideName] ?? [];

  const Component = forwardRef<SVGSVGElement, GosIconProps>(
    ({ size = 24, stroke: _stroke, color = 'currentColor', className, title, children, ...rest }, ref) =>
      createElement(
        'svg',
        {
          ref,
          xmlns: 'http://www.w3.org/2000/svg',
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: color,
          strokeWidth: GOS_ICON_STROKE,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          className: ['gos-icon', `gos-icon-${lucideName}`, className].filter(Boolean).join(' '),
          'aria-hidden': title ? undefined : true,
          ...rest,
        },
        title ? createElement('title', { key: 'title' }, title) : null,
        ...nodes.map(([tag, attrs], index) => createElement(tag, { key: index, ...attrs })),
        children,
      ),
  );

  Component.displayName = displayName;

  return Component;
};
