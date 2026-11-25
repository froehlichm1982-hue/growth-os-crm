import { OnboardingHeader } from '@/onboarding/components/OnboardingHeader';
import { styled } from '@linaria/react';
import { type ReactNode } from 'react';
import { GrowthOsAuthShell } from '~/growth-os/GrowthOsAuthShell';

// Growth OS: rendered inside the kit auth card (GrowthOsAuthShell), so it
// sizes to its content instead of filling the viewport.
const StyledBackground = styled.div`
  background: transparent;
  display: flex;
  flex-direction: column;
  width: 100%;
`;

type OnboardingLayoutProps = {
  children: ReactNode;
  onBack?: () => void;
  isBackDisabled?: boolean;
  freeCredits?: number;
};

export const OnboardingLayout = ({
  children,
  onBack,
  isBackDisabled,
  freeCredits,
}: OnboardingLayoutProps) => (
  <GrowthOsAuthShell>
  <StyledBackground>
    <OnboardingHeader
      onBack={onBack}
      isBackDisabled={isBackDisabled}
      freeCredits={freeCredits}
    />
    {children}
  </StyledBackground>
  </GrowthOsAuthShell>
);
