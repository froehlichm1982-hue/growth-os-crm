import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export const StyledOnboardingStepTitle = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  /* Growth OS DS v2: page-title role (Geist 600, 24px, -0.02em). */
  font-size: var(--gos-page-title-size);
  font-weight: var(--gos-page-title-weight);
  letter-spacing: var(--gos-page-title-tracking);
  line-height: var(--gos-page-title-leading);
  margin: 0;
`;
