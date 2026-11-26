import { clientConfigApiStatusState } from '@/client-config/states/clientConfigApiStatusState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useEffect } from 'react';
import { GrowthOsMaintenancePage } from '~/growth-os/states/GrowthOsMaintenancePage';

// Growth OS: back end unreachable (maintenance/outage) → kit maintenance page
// that retries on its own every 30 s.
export const ClientConfigProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const { isErrored, error } = useAtomStateValue(clientConfigApiStatusState);
  const isDown = isErrored && error instanceof Error;

  useEffect(() => {
    if (!isDown) return;
    const timer = window.setTimeout(() => window.location.reload(), 30000);

    return () => window.clearTimeout(timer);
  }, [isDown]);

  return isDown ? <GrowthOsMaintenancePage /> : children;
};
