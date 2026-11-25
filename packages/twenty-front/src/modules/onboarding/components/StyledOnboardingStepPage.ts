import { styled } from '@linaria/react';
import { MOBILE_VIEWPORT, themeCssVariables } from 'twenty-ui/theme-constants';

export const StyledOnboardingStepPage = styled.div`
  align-items: center;
  background-color: transparent;
  box-sizing: border-box;
  display: flex;
  flex: 1 0 auto;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[8]};
  padding: ${themeCssVariables.spacing[6]} 0;
  width: 100%;

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    gap: ${themeCssVariables.spacing[6]};
    padding: ${themeCssVariables.spacing[4]} 0;
  }
`;
