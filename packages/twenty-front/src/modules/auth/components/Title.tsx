import { styled } from '@linaria/react';
import React from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { AnimatedEaseIn } from 'twenty-ui/layout';

type TitleProps = React.PropsWithChildren & {
  animate?: boolean;
  noMarginTop?: boolean;
};

const StyledTitle = styled.div<Pick<TitleProps, 'noMarginTop'>>`
  color: ${themeCssVariables.font.color.primary};
  /* Growth OS DS v2: page-title role (Geist 600, 24px, -0.02em). */
  font-size: var(--gos-page-title-size);
  font-weight: var(--gos-page-title-weight);
  letter-spacing: var(--gos-page-title-tracking);
  line-height: var(--gos-page-title-leading);
  margin-bottom: ${themeCssVariables.spacing[4]};
  margin-top: ${({ noMarginTop }) =>
    !noMarginTop ? themeCssVariables.spacing[4] : '0'};
  text-align: center;
`;

export const Title = ({
  children,
  animate = false,
  noMarginTop = false,
}: TitleProps) => {
  if (animate) {
    return (
      <StyledTitle noMarginTop={noMarginTop}>
        <AnimatedEaseIn>{children}</AnimatedEaseIn>
      </StyledTitle>
    );
  }

  return <StyledTitle noMarginTop={noMarginTop}>{children}</StyledTitle>;
};
