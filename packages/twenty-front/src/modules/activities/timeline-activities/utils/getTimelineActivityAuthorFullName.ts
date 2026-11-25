import { type TimelineActivity } from '@/activities/timeline-activities/types/TimelineActivity';
import { type CurrentWorkspaceMember } from '@/auth/states/currentWorkspaceMemberState';
import { isDefined } from 'twenty-shared/utils';
import { GROWTH_OS_PRODUCT_NAME } from '~/growth-os/brand';

export const getTimelineActivityAuthorFullName = (
  event: TimelineActivity,
  currentWorkspaceMember: CurrentWorkspaceMember,
) => {
  if (isDefined(event.workspaceMember)) {
    return currentWorkspaceMember.id === event.workspaceMember.id
      ? 'You'
      : `${event.workspaceMember?.name.firstName} ${event.workspaceMember?.name.lastName}`;
  }
  return GROWTH_OS_PRODUCT_NAME;
};
