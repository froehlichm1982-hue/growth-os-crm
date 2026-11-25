import { styled } from '@linaria/react';

import { GROWTH_OS_BRAND } from '~/growth-os/brand';
import { themeCssVariables } from 'twenty-ui/theme-constants';

// AGPL-3.0 section 13 source offer. Product standard (25 Nov 2026): no vendor
// name in any pixel, so the upstream credit lives in LICENSE/NOTICE and the
// source repository, not in the UI.
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
    {/* No repository link until SOURCE_CODE_URL is configured (AGPL-3.0 s.13). */}
    {GROWTH_OS_BRAND.productName}
    {GROWTH_OS_BRAND.sourceCodeUrl ? (
      <>
        {' · '}
        <a
          href={GROWTH_OS_BRAND.sourceCodeUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Source code (AGPL-3.0)
        </a>
      </>
    ) : (
      ' · AGPL-3.0'
    )}
  </StyledNotice>
);
