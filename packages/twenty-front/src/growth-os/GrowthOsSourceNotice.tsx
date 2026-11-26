import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';

import { GROWTH_OS_LICENCES_PATH } from '~/growth-os/licences/growthOsLicencesPath';
import { themeCssVariables } from 'twenty-ui/theme-constants';

// OS Lead decision (26 Nov 2026): no product/licence credit line in the UI.
// The footers link the public open-source licences page instead, which
// carries the AGPL-3.0 notice and the SOURCE_CODE_URL source offer.
const StyledNotice = styled.div<{ align: 'left' | 'center' }>`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
  line-height: 1.5;
  text-align: ${({ align }) => align};

  & > a {
    color: inherit;
    text-decoration: none;

    &:hover {
      color: ${themeCssVariables.font.color.secondary};
      text-decoration: underline;
      text-underline-offset: 2px;
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
}: GrowthOsSourceNoticeProps) => {
  const { t } = useLingui();

  return (
    <StyledNotice align={align} className={className}>
      <a href={GROWTH_OS_LICENCES_PATH}>{t`Open-source licences`}</a>
    </StyledNotice>
  );
};
