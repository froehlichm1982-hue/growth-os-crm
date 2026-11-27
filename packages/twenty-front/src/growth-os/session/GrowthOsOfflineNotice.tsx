import { withGosScope } from '~/growth-os/GrowthOsGosScope';
import { t } from '@lingui/core/macro';
import { useEffect, useState } from 'react';
import { createGosIcon } from '~/growth-os/icons/createGosIcon';

// DS pattern "offline" as an in-app notice: shown while the browser reports no
// connection, gone as soon as it is back. Twenty does not queue edits offline,
// so the copy asks people to wait instead of promising saved changes.
const GosIconWifiOff = createGosIcon('wifi-off', 'GosIconWifiOff');

const GrowthOsOfflineNoticeInner = () => {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' && navigator.onLine === false,
  );

  useEffect(() => {
    const update = () => setIsOffline(navigator.onLine === false);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return (
    <div className="gos-toasts" role="status" aria-live="polite">
      {isOffline && (
        <div className="gos-toast" data-testid="growth-os-offline">
          <GosIconWifiOff className="gos-icon" aria-hidden="true" />
          <span>
            <strong>{t`You’re offline.`}</strong>{' '}
            {t`We’ll reconnect automatically. Wait with edits until you’re back.`}
          </span>
        </div>
      )}
    </div>
  );
};

export const GrowthOsOfflineNotice = withGosScope(GrowthOsOfflineNoticeInner);
