import { isMultiWorkspaceEnabledState } from '@/client-config/states/isMultiWorkspaceEnabledState';
import { domainConfigurationState } from '@/domain-manager/states/domainConfigurationState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export const useReadDefaultDomainFromConfiguration = () => {
  const domainConfiguration = useAtomStateValue(domainConfigurationState);
  const isMultiWorkspaceEnabled = useAtomStateValue(
    isMultiWorkspaceEnabledState,
  );

  // Growth OS CRM: an empty default subdomain means the bare front domain.
  const defaultDomain =
    isMultiWorkspaceEnabled && domainConfiguration.defaultSubdomain
      ? `${domainConfiguration.defaultSubdomain}.${domainConfiguration.frontDomain}`
      : domainConfiguration.frontDomain;

  return {
    defaultDomain,
  };
};
