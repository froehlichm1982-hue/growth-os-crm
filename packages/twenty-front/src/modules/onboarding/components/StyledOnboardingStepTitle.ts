import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export const StyledOnboardingStepTitle = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  /* Growth OS CRM: brand headline font (src/growth-os/growth-os-theme.css). */
  font-family: var(--spv-font-display);
  font-size: ${themeCssVariables.font.size.xxl};
  font-weight: ${themeCssVariables.font.weight.regular};
  letter-spacing: -0.02em;
  line-height: 1.15;
  margin: 0;
`;
