export const PLANS = {
  FREE: "free",
  STANDARD: "standard",
  PRO: "pro",
} as const;

export type PlanType = (typeof PLANS)[keyof typeof PLANS];

export interface PlanLimits {
  maxBooks: number;
  maxSessionsPerMonth: number;
  maxDurationPerSession: number;
  hasSessionHistory: boolean;
}

export interface BillingPeriod {
  key: string;
  start: Date;
  end: Date;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  [PLANS.FREE]: {
    maxBooks: 1,
    maxSessionsPerMonth: 5,
    maxDurationPerSession: 5,
    hasSessionHistory: false,
  },
  [PLANS.STANDARD]: {
    maxBooks: 10,
    maxSessionsPerMonth: 100,
    maxDurationPerSession: 15,
    hasSessionHistory: true,
  },
  [PLANS.PRO]: {
    maxBooks: 100,
    maxSessionsPerMonth: Infinity,
    maxDurationPerSession: 60,
    hasSessionHistory: true,
  },
};

export const PLAN_DISPLAY_NAMES: Record<PlanType, string> = {
  [PLANS.FREE]: "Free",
  [PLANS.STANDARD]: "Standard",
  [PLANS.PRO]: "Pro",
};

export const CLERK_PLAN_SLUGS = {
  [PLANS.STANDARD]: "standard",
  [PLANS.PRO]: "pro",
} as const;

export const getCurrentBillingPeriod = (date = new Date()): BillingPeriod => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));

  return {
    key: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`,
    start,
    end,
  };
};

export const formatPlanLimit = (value: number) => {
  if (!Number.isFinite(value)) {
    return "Unlimited";
  }

  return value.toString();
};
