import { Img } from 'react-email';
import { GROWTH_OS_BRAND } from 'twenty-shared/i18n';

const logoStyle = {
  marginBottom: '40px',
};

// Growth OS CRM: ScalePoint Ventures logo (unchanged brand asset), served by
// the app itself so emails need no third-party image host.
export const Logo = () => {
  return (
    <Img
      src={`${GROWTH_OS_BRAND.appUrl}/images/growth-os/logo-light@2x.png`}
      alt="ScalePoint Ventures · Growth OS CRM"
      width="150"
      height="30"
      style={logoStyle}
    />
  );
};
