'use server';

import { auth } from "@clerk/nextjs/server";
import {EndSessionResult, StartSessionResult} from "@/types";
import {connectToDatabase} from "@/database/mongoose";
import VoiceSession from "@/database/models/voice-session.model";
import { getCurrentBillingPeriod, PLAN_DISPLAY_NAMES } from "@/lib/subscription-constants";
import { getPlanLimitsFor } from "@/lib/subscription";
import { getUserPlan } from "@/lib/subscription.server";

export const startVoiceSession = async (clerkId: string, bookId: string): Promise<StartSessionResult> => {
    try {
        const { userId } = await auth();

        if (!userId || userId !== clerkId) {
            return {
                success: false,
                error: "Unauthorized",
            };
        }

        await connectToDatabase();

        const plan = await getUserPlan();
        const limits = getPlanLimitsFor(plan);
        const billingPeriod = getCurrentBillingPeriod();

        if (Number.isFinite(limits.maxSessionsPerMonth)) {
            const sessionCount = await VoiceSession.countDocuments({
                clerkId: userId,
                $or: [
                    { billingPeriodKey: billingPeriod.key },
                    {
                        billingPeriodKey: { $exists: false },
                        billingPeriodStart: {
                            $gte: billingPeriod.start,
                            $lt: billingPeriod.end,
                        },
                    },
                ],
            });

            if (sessionCount >= limits.maxSessionsPerMonth) {
                const { revalidatePath } = await import("next/cache");
                revalidatePath("/");

                return {
                    success: false,
                    error: `You have reached the monthly session limit for your ${PLAN_DISPLAY_NAMES[plan]} plan (${limits.maxSessionsPerMonth}). Please upgrade for more sessions.`,
                    isBillingError: true,
                };
            }
        }

        const session = await VoiceSession.create({
            clerkId: userId,
            bookId,
            startedAt: new Date(),
            billingPeriodKey: billingPeriod.key,
            billingPeriodStart: billingPeriod.start,
            durationSeconds: 0,
        });

        return {
            success: true,
            sessionId: session._id.toString(),
            maxDurationMinutes: limits.maxDurationPerSession,
        }
    } catch (e) {
        console.error('Error starting voice session', e);
        return { success: false, error: 'Failed to start voice session. Please try again later.' }
    }
}

export const endVoiceSession = async (sessionId: string, durationSeconds: number): Promise<EndSessionResult> => {
    try {
        const { userId } = await auth();

        if (!userId) {
            return {
                success: false,
                error: "Unauthorized",
            };
        }

        await connectToDatabase();

        const result = await VoiceSession.findOneAndUpdate({
            _id: sessionId,
            clerkId: userId,
        }, {
            endedAt: new Date(),
            durationSeconds,
        });

        if(!result) return { success: false, error: 'Voice session not found.' }

        return { success: true }
    } catch (e) {
        console.error('Error ending voice session', e);
        return { success: false, error: 'Failed to end voice session. Please try again later.' }
    }
}
