import { type ReactNode } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { type AnimatedPlaceholderType } from 'twenty-ui/feedback';
import { type IconComponent } from 'twenty-ui/icon';

import {
  GrowthOsEmptyState,
  type GrowthOsIconName,
  type GrowthOsStateAction,
} from '~/growth-os/states/GrowthOsStates';

type RecordIndexEmptyStateDisplayProps = {
  animatedPlaceholderType: AnimatedPlaceholderType;
  title: string;
  subTitle: string;
  // Kept for API compatibility; Growth OS uses kit icons per state.
  ButtonIcon?: IconComponent;
  buttonTitle?: string;
  onButtonClick?: () => void;
  buttonIcon?: GrowthOsIconName;
  // Growth OS CRM: max 1 primary + 1 secondary action, plus a "more" line.
  secondary?: GrowthOsStateAction;
  width?: number;
  extra?: ReactNode;
};

const ART: Partial<
  Record<AnimatedPlaceholderType, { icon: GrowthOsIconName; badge?: GrowthOsIconName }>
> = {
  noRecord: { icon: 'people', badge: 'plus' },
  noMatchRecord: { icon: 'search' },
  noDeletedRecord: { icon: 'filterOff' },
  errorIndex: { icon: 'alert' },
};

// Growth OS CRM: kit empty / no-results states (PRODUCT-UX-STANDARD §3.3).
export const RecordIndexEmptyStateDisplay = ({
  animatedPlaceholderType,
  title,
  subTitle,
  buttonTitle,
  onButtonClick,
  buttonIcon,
  secondary,
  width,
  extra,
}: RecordIndexEmptyStateDisplayProps) => {
  const art = ART[animatedPlaceholderType] ?? { icon: 'people' };

  return (
    <GrowthOsEmptyState
      icon={art.icon}
      badge={art.badge}
      title={title}
      description={subTitle}
      testId={`growth-os-empty-${animatedPlaceholderType}`}
      primary={
        isDefined(onButtonClick) && isDefined(buttonTitle)
          ? { label: buttonTitle, onClick: onButtonClick, icon: buttonIcon }
          : undefined
      }
      secondary={secondary}
      more={extra}
      width={width}
    />
  );
};
