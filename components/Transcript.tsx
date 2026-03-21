'use client';

import { Mic } from "lucide-react";
import { useEffect, useRef } from "react";

import { Messages } from "@/types";

interface TranscriptProps {
  messages: Messages[];
  currentMessage?: string;
  currentUserMessage?: string;
}

const Transcript = ({
  messages,
  currentMessage = "",
  currentUserMessage = "",
}: TranscriptProps) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const hasMessages =
    messages.length > 0 ||
    currentMessage.trim().length > 0 ||
    currentUserMessage.trim().length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, currentMessage, currentUserMessage]);

  if (!hasMessages) {
    return (
      <div className="transcript-empty">
        <div className="mb-4 rounded-full bg-[#f3e4c7] p-4 text-[#212a3b]">
          <Mic className="size-8" />
        </div>
        <p className="transcript-empty-text">No conversation yet</p>
        <p className="transcript-empty-hint">
          Start speaking to begin chatting with the AI assistant.
        </p>
      </div>
    );
  }

  return (
    <div className="transcript-messages">
      {messages.map((message, index) => {
        const isUser = message.role === "user";

        return (
          <div
            key={`${message.role}-${index}-${message.content}`}
            className={`transcript-message ${
              isUser
                ? "transcript-message-user"
                : "transcript-message-assistant"
            }`}
          >
            <div
              className={`transcript-bubble ${
                isUser
                  ? "transcript-bubble-user"
                  : "transcript-bubble-assistant"
              }`}
            >
              {message.content}
            </div>
          </div>
        );
      })}

      {currentUserMessage.trim() ? (
        <div className="transcript-message transcript-message-user">
          <div className="transcript-bubble transcript-bubble-user">
            {currentUserMessage}
            <span className="transcript-cursor" aria-hidden="true" />
          </div>
        </div>
      ) : null}

      {currentMessage.trim() ? (
        <div className="transcript-message transcript-message-assistant">
          <div className="transcript-bubble transcript-bubble-assistant">
            {currentMessage}
            <span className="transcript-cursor" aria-hidden="true" />
          </div>
        </div>
      ) : null}

      <div ref={bottomRef} />
    </div>
  );
};

export default Transcript;
