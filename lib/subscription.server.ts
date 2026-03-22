import { auth } from "@clerk/nextjs/server";

import { type PlanType } from "@/lib/subscription-constants";
import { getPlanLimitsFor, getPlanFromHas } from "@/lib/subscription";

export const getUserPlan = async (): Promise<PlanType> => {
  const { has, userId } = await auth();

  if (!userId) {
    return getPlanFromHas(undefined);
  }

  return getPlanFromHas(has);
};

export const getPlanLimits = async () => {
  const plan = await getUserPlan();
  return getPlanLimitsFor(plan);
};
