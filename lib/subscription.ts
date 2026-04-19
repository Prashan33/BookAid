import type { PlanType } from "@/lib/subscription-constants";
import { CLERK_PLAN_SLUGS, PLAN_LIMITS, PLANS } from "@/lib/subscription-constants";

type HasPlanCheck = ((params: { plan: string }) => boolean) | undefined;

export const getPlanFromHas = (has: HasPlanCheck): PlanType => {
  if (has?.({ plan: CLERK_PLAN_SLUGS[PLANS.PRO] })) {
    return PLANS.PRO;
  }

  if (has?.({ plan: CLERK_PLAN_SLUGS[PLANS.STANDARD] })) {
    return PLANS.STANDARD;
  }

  return PLANS.FREE;
};

export const getPlanLimitsFor = (plan: PlanType) => PLAN_LIMITS[plan];
