import { styled } from '@linaria/react';

// Growth OS (DS v2.9 auth kit): the container is a plain grid inside `.gos-auth-form`
// (the DS form column sets the 400px width); OAuth buttons, divider and form stack with the DS gaps.
export const StyledOnboardingContentContainer = styled.div`
  display: grid;
  gap: 10px;
  max-width: 100%;
  width: 100%;
`;
