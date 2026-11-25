import { styled } from '@linaria/react';

import { GROWTH_OS_BRAND } from '~/growth-os/brand';
import { themeCssVariables } from 'twenty-ui/theme-constants';

// AGPL-3.0 section 13 source offer + upstream credit. The only place where
// the upstream name may appear in the UI (see WHITE-LABEL.md).
const StyledNotice = styled.div<{ align: 'left' | 'center' }>`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
  line-height: 1.5;
  text-align: ${({ align }) => align};

  & > a {
    color: inherit;
    text-decoration: underline;
    text-decoration-color: ${themeCssVariables.border.color.strong};
    text-underline-offset: 2px;

    &:hover {
      color: ${themeCssVariables.font.color.secondary};
    }
  }
`;

type GrowthOsSourceNoticeProps = {
  align?: 'left' | 'center';
  className?: string;
};

export const GrowthOsSourceNotice = ({
  align = 'center',
  className,
}: GrowthOsSourceNoticeProps) => (
  <StyledNotice align={align} className={className}>
    {GROWTH_OS_BRAND.productName} ·{' '}
    <a href={GROWTH_OS_BRAND.upstreamUrl} target="_blank" rel="noopener noreferrer">
      {/* Upstream credit stays untranslated by design. */}
      {'Built on ' + GROWTH_OS_BRAND.upstreamName}
    </a>{' '}
    ·{' '}
    <a href={GROWTH_OS_BRAND.sourceCodeUrl} target="_blank" rel="noopener noreferrer">
      {/* English-only legal notice (AGPL-3.0 section 13). */}
      Source code (AGPL-3.0)
    </a>
  </StyledNotice>
);
