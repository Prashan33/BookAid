'use client';

import { useAuth, useUser } from "@clerk/nextjs";

import { PLAN_LIMITS, PLANS } from "@/lib/subscription-constants";
import { getPlanFromHas } from "@/lib/subscription";

export const useSubscription = () => {
  const { has, isLoaded: isAuthLoaded } = useAuth();
  const { isLoaded: isUserLoaded } = useUser();

  const isLoaded = isAuthLoaded && isUserLoaded;

  if (!isLoaded) {
    return {
      plan: PLANS.FREE,
      limits: PLAN_LIMITS[PLANS.FREE],
      isLoaded: false,
    };
  }

  const plan = getPlanFromHas(has);

  return {
    plan,
    limits: PLAN_LIMITS[plan],
    isLoaded: true,
  };
};
