import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, Mic, MicOff } from "lucide-react";
import { redirect } from "next/navigation";

import { getBookBySlug } from "@/lib/actions/book.actions";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

const Page = async ({ params }: PageProps) => {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const { slug } = await params;
  const bookResult = await getBookBySlug(slug);

  if (!bookResult.success || !bookResult.data) {
    redirect("/");
  }

  const book = bookResult.data;

  return (
    <main className="book-page-container">
      <Link href="/" className="back-btn-floating" aria-label="Go back to library">
        <ArrowLeft className="size-5 text-[var(--text-primary)]" />
      </Link>

      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <article className="vapi-header-card">
          <div className="vapi-cover-wrapper">
            <Image
              src={book.coverURL}
              alt={book.title}
              width={120}
              height={180}
              className="vapi-cover-image"
            />

            <div className="vapi-mic-wrapper">
              <button
                type="button"
                className="vapi-mic-btn vapi-mic-btn-inactive"
                aria-label="Microphone disabled"
              >
                <MicOff className="size-6 text-[var(--text-primary)]" />
              </button>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="space-y-2">
              <h1 className="font-serif text-2xl font-bold leading-tight text-[var(--text-primary)] sm:text-3xl">
                {book.title}
              </h1>
              <p className="text-base text-[#5f5140] sm:text-lg">by {book.author}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="vapi-status-indicator">
                <span className="vapi-status-dot vapi-status-dot-ready" />
                <span className="vapi-status-text">Ready</span>
              </div>

              <div className="vapi-status-indicator">
                <span className="vapi-status-text">Voice: {book.persona || "Default"}</span>
              </div>

              <div className="vapi-status-indicator">
                <span className="vapi-status-text">0:00/15:00</span>
              </div>
            </div>
          </div>
        </article>

        <section className="transcript-container min-h-[400px]">
          <div className="transcript-empty">
            <Mic className="mb-4 size-12 text-[var(--text-muted)]" />
            <p className="transcript-empty-text">No conversation yet</p>
            <p className="transcript-empty-hint">
              Click the mic button above to start talking
            </p>
          </div>
        </section>
      </section>
    </main>
  );
};

export default Page;
