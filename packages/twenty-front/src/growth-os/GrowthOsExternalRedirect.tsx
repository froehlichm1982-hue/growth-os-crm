import { useEffect } from 'react';

// Growth OS CRM: upstream pages that describe Twenty's own cloud contracts
// (e.g. Twenty's DPA generator) are replaced by our published documents.
export const GrowthOsExternalRedirect = ({ to }: { to: string }) => {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return null;
};
