import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('GrowthOsBccInbox')
export class GrowthOsBccInboxDTO {
  // Unique per workspace, e.g. log-1a2b3c4d5e6f@in.crm.scalepoint-ventures.com
  @Field(() => String, { nullable: true })
  address: string | null;

  // Plan includes it (Growth, Scale, trial) and the workspace is writable.
  @Field(() => Boolean)
  isAvailable: boolean;

  // INBOUND_EMAIL_DOMAIN and an inbound provider are configured on the server.
  @Field(() => Boolean)
  isConfigured: boolean;

  @Field(() => String, { nullable: true })
  messageChannelId: string | null;
}
