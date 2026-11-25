import { useLingui } from '@lingui/react/macro';

// Kit "or" divider between OAuth buttons and the email form.
export const GrowthOsAuthDivider = () => {
  const { t } = useLingui();

  return (
    <div className="gos-divider" role="separator">
      {t`or`}
    </div>
  );
};
