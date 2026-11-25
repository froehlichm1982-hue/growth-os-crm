import { styled } from '@linaria/react';

import { useContext } from 'react';
import { ThemeContext, themeCssVariables } from 'twenty-ui/theme-constants';
import { GROWTH_OS_LOGO_DARK, GROWTH_OS_LOGO_LIGHT } from '~/growth-os/brand';

const StyledWordmark = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  margin: ${themeCssVariables.spacing[4]} 0;
`;

const StyledImage = styled.img`
  display: block;
  height: 30px;
  width: 150px;
`;

const StyledProduct = styled.span`
  color: ${themeCssVariables.color.blue10};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0.2em;
  text-transform: uppercase;
`;

// ScalePoint Ventures logo (unchanged brand asset) + "Growth OS CRM" label,
// mirroring the header of the Growth OS preview site.
export const GrowthOsWordmark = () => {
  const { colorScheme } = useContext(ThemeContext);

  return (
    <StyledWordmark className="growth-os-wordmark">
      <StyledImage
        src={colorScheme === 'dark' ? GROWTH_OS_LOGO_DARK : GROWTH_OS_LOGO_LIGHT}
        alt="ScalePoint Ventures"
      />
      <StyledProduct>Growth OS CRM</StyledProduct>
    </StyledWordmark>
  );
};
