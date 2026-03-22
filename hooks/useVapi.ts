'use client';

import { useAuth } from "@clerk/nextjs";
import Vapi from "@vapi-ai/web";
import { useCallback, useEffect, useRef, useState } from "react";

import { startVoiceSession, endVoiceSession } from "@/lib/actions/session.actions";
import { ASSISTANT_ID, DEFAULT_VOICE, VOICE_SETTINGS } from "@/lib/constants";
import { getVoice } from "@/lib/utils";
import { type IBook, type Messages } from "@/types";
import { useSubscription } from "@/hooks/useSubscription";

const VAPI_API_KEY = process.env.NEXT_PUBLIC_VAPI_API_KEY;
const TIMER_INTERVAL_MS = 1000;
const SECONDS_PER_MINUTE = 60;

export type CallStatus =
  | "idle"
  | "connecting"
  | "starting"
  | "listening"
  | "thinking"
  | "speaking";

export function useLatestRef<T>(value: T) {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
}

let vapi: InstanceType<typeof Vapi>;

function getVapi() {
  if (!VAPI_API_KEY) {
    return null;
  }

  if (!vapi) {
    vapi = new Vapi(VAPI_API_KEY);
  }

  return vapi;
}

export const useVapi = (book: IBook) => {
  const { userId } = useAuth();
  const { limits } = useSubscription();

  const [status, setStatus] = useState<CallStatus>("idle");
  const [messages, setMessages] = useState<Messages[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [currentUserMessage, setCurrentUserMessage] = useState("");
  const [duration, setDuration] = useState(0);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [isBillingError, setIsBillingError] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isStoppingRef = useRef(false);

  const maxDurationSeconds = limits?.maxDurationPerSession
    ? limits.maxDurationPerSession * SECONDS_PER_MINUTE
    : 15 * SECONDS_PER_MINUTE;
  const maxDurationRef = useLatestRef(maxDurationSeconds);
  const durationRef = useLatestRef(duration);
  const voice = book.persona || DEFAULT_VOICE;

  useEffect(() => {
    const vapiClient = getVapi();
    if (!vapiClient) {
      return;
    }

    const handlers = {
      "call-start": () => {
        isStoppingRef.current = false;
        setStatus("starting");
        setCurrentMessage("");
        setCurrentUserMessage("");

        startTimeRef.current = Date.now();
        setDuration(0);

        timerRef.current = setInterval(() => {
          if (!startTimeRef.current) return;

          const nextDuration = Math.floor((Date.now() - startTimeRef.current) / TIMER_INTERVAL_MS);
          setDuration(nextDuration);

          if (nextDuration >= maxDurationRef.current) {
            setLimitError("You have reached the maximum session duration for your plan.");
            setIsBillingError(true);
            isStoppingRef.current = true;
            vapiClient.stop();
          }
        }, TIMER_INTERVAL_MS);
      },
      "call-end": () => {
        setStatus("idle");
        setCurrentMessage("");
        setCurrentUserMessage("");

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        if (sessionIdRef.current) {
          endVoiceSession(sessionIdRef.current, durationRef.current).catch((error) =>
            console.error("Failed to end voice session:", error),
          );
          sessionIdRef.current = null;
        }

        startTimeRef.current = null;
        isStoppingRef.current = false;
      },
      "speech-start": () => {
        if (!isStoppingRef.current) {
          setStatus("speaking");
        }
      },
      "speech-end": () => {
        if (!isStoppingRef.current) {
          setStatus("listening");
        }
      },
      message: (message: {
        type: string;
        role: string;
        transcriptType: string;
        transcript: string;
      }) => {
        if (message.type !== "transcript") return;

        if (message.role === "user" && message.transcriptType === "final") {
          if (!isStoppingRef.current) {
            setStatus("thinking");
          }
          setCurrentUserMessage("");
        }

        if (message.role === "user" && message.transcriptType === "partial") {
          setCurrentUserMessage(message.transcript);
          return;
        }

        if (message.role === "assistant" && message.transcriptType === "partial") {
          setCurrentMessage(message.transcript);
          return;
        }

        if (message.transcriptType === "final") {
          if (message.role === "assistant") setCurrentMessage("");
          if (message.role === "user") setCurrentUserMessage("");

          setMessages((prev) => {
            const isDuplicate = prev.some(
              (entry) => entry.role === message.role && entry.content === message.transcript,
            );

            return isDuplicate
              ? prev
              : [...prev, { role: message.role, content: message.transcript }];
          });
        }
      },
      error: (error: Error) => {
        console.error("Vapi error:", error);
        setStatus("idle");
        setCurrentMessage("");
        setCurrentUserMessage("");

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        if (sessionIdRef.current) {
          endVoiceSession(sessionIdRef.current, durationRef.current).catch((sessionError) =>
            console.error("Failed to end voice session on error:", sessionError),
          );
          sessionIdRef.current = null;
        }

        const errorMessage = error.message?.toLowerCase() || "";
        if (errorMessage.includes("timeout") || errorMessage.includes("silence")) {
          setLimitError("Session ended due to inactivity. Click the mic to start again.");
        } else if (errorMessage.includes("network") || errorMessage.includes("connection")) {
          setLimitError("Connection lost. Please check your internet and try again.");
        } else {
          setLimitError("Session ended unexpectedly. Click the mic to start again.");
        }

        startTimeRef.current = null;
      },
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      vapiClient.on(event as keyof typeof handlers, handler as () => void);
    });

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const finalDuration = durationRef.current;

      if (sessionIdRef.current) {
        vapiClient.stop();
        endVoiceSession(sessionIdRef.current, finalDuration).catch((error) =>
          console.error("Failed to end voice session on unmount:", error),
        );
        sessionIdRef.current = null;
      }

      Object.entries(handlers).forEach(([event, handler]) => {
        vapiClient.off(event as keyof typeof handlers, handler as () => void);
      });

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [durationRef, maxDurationRef]);

  const start = useCallback(async () => {
    if (!userId) {
      setLimitError("Please sign in to start a voice session.");
      return;
    }

    const vapiClient = getVapi();
    if (!vapiClient) {
      setLimitError("NEXT_PUBLIC_VAPI_API_KEY is not set. Add it to your environment variables.");
      setIsBillingError(false);
      setStatus("idle");
      return;
    }

    if (!ASSISTANT_ID) {
      setLimitError("NEXT_PUBLIC_ASSISTANT_ID is not set. Add it to your environment variables.");
      setIsBillingError(false);
      setStatus("idle");
      return;
    }

    setLimitError(null);
    setIsBillingError(false);
    setStatus("connecting");

    try {
      const result = await startVoiceSession(userId, book._id);

      if (!result.success) {
        setLimitError(result.error || "Session limit reached. Please upgrade your plan.");
        setIsBillingError(!!result.isBillingError);
        setStatus("idle");
        return;
      }

      sessionIdRef.current = result.sessionId || null;

      const firstMessage = `Hey, good to meet you. Quick question before we dive in - have you actually read ${book.title} yet, or are we starting fresh?`;

      await vapiClient.start(ASSISTANT_ID, {
        firstMessage,
        variableValues: {
          title: book.title,
          author: book.author,
          bookId: book._id,
        },
        voice: {
          provider: "11labs" as const,
          voiceId: getVoice(voice).id,
          model: "eleven_turbo_v2_5" as const,
          stability: VOICE_SETTINGS.stability,
          similarityBoost: VOICE_SETTINGS.similarityBoost,
          style: VOICE_SETTINGS.style,
          useSpeakerBoost: VOICE_SETTINGS.useSpeakerBoost,
        },
      });
    } catch (error) {
      console.error("Failed to start call:", error);
      setStatus("idle");

      const errorMessage = error instanceof Error ? error.message.toLowerCase() : "";
      const errorName = error instanceof Error ? error.name : "";

      if (
        errorName === "NotAllowedError" ||
        errorMessage.includes("permission") ||
        errorMessage.includes("notallowederror")
      ) {
        setLimitError("Microphone access was blocked. Allow microphone permissions in your browser and try again.");
        return;
      }

      if (errorMessage.includes("assistant")) {
        setLimitError("The Vapi assistant failed to start. Check NEXT_PUBLIC_ASSISTANT_ID in your deployment settings.");
        return;
      }

      if (errorMessage.includes("api key")) {
        setLimitError("The Vapi client could not authenticate. Check NEXT_PUBLIC_VAPI_API_KEY in your deployment settings.");
        return;
      }

      setLimitError("Failed to start voice session. Check deployment env vars and microphone permissions, then try again.");
    }
  }, [book._id, book.author, book.title, userId, voice]);

  const stop = useCallback(() => {
    const vapiClient = getVapi();
    if (!vapiClient) {
      setStatus("idle");
      return;
    }

    isStoppingRef.current = true;
    vapiClient.stop();
  }, []);

  const clearError = useCallback(() => {
    setLimitError(null);
    setIsBillingError(false);
  }, []);

  const isActive =
    status === "starting" ||
    status === "listening" ||
    status === "thinking" ||
    status === "speaking";
  const isAiResponding = status === "thinking" || status === "speaking";

  return {
    status,
    isActive,
    isAiResponding,
    messages,
    currentMessage,
    currentUserMessage,
    duration,
    start,
    stop,
    limitError,
    isBillingError,
    maxDurationSeconds,
    clearError,
  };
};

export default useVapi;
