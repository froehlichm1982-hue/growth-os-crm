import { Field, Int, ObjectType } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

@ObjectType('GrowthOsPlan')
export class GrowthOsPlanDTO {
  @Field(() => String)
  plan: string;

  @Field(() => String)
  effectivePlan: string;

  @Field(() => String)
  status: string;

  @Field(() => Boolean)
  isTrial: boolean;

  @Field(() => Date, { nullable: true })
  trialEndsAt: Date | null;

  @Field(() => Int, { nullable: true })
  trialDaysLeft: number | null;

  @Field(() => Date, { nullable: true })
  graceEndsAt: Date | null;

  @Field(() => Boolean)
  isReadOnly: boolean;

  @Field(() => Boolean)
  cancelAtPeriodEnd: boolean;

  @Field(() => String, { nullable: true })
  interval: string | null;

  @Field(() => Date, { nullable: true })
  currentPeriodEnd: Date | null;

  @Field(() => Int, { nullable: true })
  seatsAllowed: number | null;

  @Field(() => Int)
  seatsUsed: number;

  @Field(() => Int)
  pendingInvitations: number;

  @Field(() => Int)
  pipelines: number;

  @Field(() => Int, { nullable: true })
  maxPipelines: number | null;

  @Field(() => Int, { nullable: true })
  maxCustomFieldsPerObject: number | null;

  @Field(() => Int)
  apiRequestsPerMinute: number;

  @Field(() => Int)
  aiMonthlyCap: number;

  @Field(() => GraphQLJSON)
  features: Record<string, boolean>;

  // Price catalog (net EUR, lookup keys) so the UI never hard-codes prices.
  @Field(() => GraphQLJSON)
  catalog: unknown;
}
