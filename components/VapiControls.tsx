'use client';

import {AlertCircle, Mic, MicOff} from "lucide-react";
import useVapi from "@/hooks/useVapi";
import {IBook} from "@/types";
import Image from "next/image";
import Transcript from "@/components/Transcript";
import {toast} from "sonner";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useEffect} from "react";

const VapiControls = ({ book }: { book: IBook }) => {
    const {
        status,
        isActive,
        isAiResponding,
        messages,
        currentMessage,
        currentUserMessage,
        duration,
        start,
        stop,
        clearError,
        displayError,
        dismissDisplayError,
        limitError,
        isBillingError,
        shouldRedirectHome,
        maxDurationSeconds,
    } = useVapi(book)
    const router = useRouter();

    useEffect(() => {
        if (limitError) {
            toast.error(limitError);
            if (shouldRedirectHome) {
                router.push("/");
            } else if (isBillingError) {
                router.push("/subscriptions");
            }
            clearError();
        }
    }, [clearError, isBillingError, limitError, router, shouldRedirectHome]);

    const getErrorHint = (message: string) => {
        const normalizedMessage = message.toLowerCase();

        if (normalizedMessage.includes("next_public_vapi_api_key")) {
            return "The deployed app is missing NEXT_PUBLIC_VAPI_API_KEY or needs a fresh redeploy after the env var was added.";
        }

        if (normalizedMessage.includes("next_public_assistant_id")) {
            return "The deployed app is missing NEXT_PUBLIC_ASSISTANT_ID or needs a fresh redeploy after the env var was added.";
        }

        if (normalizedMessage.includes("microphone access")) {
            return "Allow microphone access for the deployed domain in your browser settings, then try again.";
        }

        if (normalizedMessage.includes("authenticate")) {
            return "The configured Vapi public key is not valid for the deployed environment.";
        }

        if (normalizedMessage.includes("assistant")) {
            return "The configured Vapi assistant ID is invalid or not available in this deployed environment.";
        }

        if (normalizedMessage.includes("sign in") || normalizedMessage.includes("unauthorized")) {
            return "Your production Clerk session may be missing, or the deployment is pointed at the wrong Clerk environment.";
        }

        return "Open the browser console on the deployed page and inspect the exact startup error if this keeps happening.";
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getStatusDisplay = () => {
        switch (status) {
            case 'connecting': return { label: 'Connecting...', color: 'vapi-status-dot-connecting' };
            case 'starting': return { label: 'Starting...', color: 'vapi-status-dot-starting' };
            case 'listening': return { label: 'Listening', color: 'vapi-status-dot-listening' };
            case 'thinking': return { label: 'Thinking...', color: 'vapi-status-dot-thinking' };
            case 'speaking': return { label: 'Speaking', color: 'vapi-status-dot-speaking' };
            default: return { label: 'Ready', color: 'vapi-status-dot-ready' };
        }
    };

    const statusDisplay = getStatusDisplay();

    return (
        <>
            <div className="max-w-4xl mx-auto flex flex-col gap-8">
                {/* Header Card */}
                <div className="vapi-header-card">
                    <div className="vapi-cover-wrapper">
                        <Image
                            src={book.coverURL || "/images/book-placeholder.png"}
                            alt={book.title}
                            width={120}
                            height={180}
                            className="vapi-cover-image !w-[120px] !h-auto"
                            priority
                        />
                        <div className="vapi-mic-wrapper relative">
                            {isActive && isAiResponding && (
                                <div
                                    aria-hidden="true"
                                    className="vapi-pulse-ring"
                                />
                            )}
                            <button
                                onClick={isActive ? stop : start}
                                disabled={status === 'connecting'}
                                className={`vapi-mic-btn shadow-md !w-[60px] !h-[60px] z-10 ${isActive ? 'vapi-mic-btn-active' : 'vapi-mic-btn-inactive'}`}
                                aria-pressed={isActive}
                                aria-label={isActive ? "Stop microphone" : "Start microphone"}
                            >
                                {isActive ? (
                                    <Mic className="size-7" />
                                ) : (
                                    <MicOff className="size-7" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 flex-1">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#212a3b] mb-1">
                                {book.title}
                            </h1>
                            <p className="text-[#3d485e] font-medium">by {book.author}</p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <div className="vapi-status-indicator">
                                <span className={`vapi-status-dot ${statusDisplay.color}`} />
                                <span className="vapi-status-text">{statusDisplay.label}</span>
                            </div>

                            <div className="vapi-status-indicator">
                                <span className="vapi-status-text">Voice: {book.persona || "Daniel"}</span>
                            </div>

                            <div className="vapi-status-indicator">
                                <span className="vapi-status-text">
                                    {formatDuration(duration)}/{formatDuration(maxDurationSeconds)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="vapi-transcript-wrapper">
                    {displayError && (
                        <div className="vapi-error-panel">
                            <div className="vapi-error-header">
                                <AlertCircle className="size-5 shrink-0" />
                                <p className="vapi-error-title">Voice session failed to start</p>
                            </div>
                            <p className="vapi-error-message">{displayError}</p>
                            <p className="vapi-error-hint">{getErrorHint(displayError)}</p>
                            <div className="vapi-error-actions">
                                <button
                                    type="button"
                                    className="vapi-error-action"
                                    onClick={dismissDisplayError}
                                >
                                    Dismiss
                                </button>
                                {isBillingError && (
                                    <Link href="/subscriptions" className="vapi-error-link">
                                        View plans
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="transcript-container min-h-[400px]">
                        <Transcript
                            messages={messages}
                            currentMessage={currentMessage}
                            currentUserMessage={currentUserMessage}
                        />
                    </div>
                </div>
            </div>
        </>
    )
}
export default VapiControls
