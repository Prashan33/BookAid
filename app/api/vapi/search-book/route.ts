import { NextResponse } from "next/server";

import { searchBookSegments } from "@/lib/actions/book.actions";

const SEARCH_BOOK_TOOL_NAMES = new Set(["searchBook", "search book"]);
const NO_INFORMATION_RESULT = "no information found about this topic.";

function isSearchBookTool(name: unknown) {
  return typeof name === "string" && SEARCH_BOOK_TOOL_NAMES.has(name);
}

function extractBookSearchParams(args: Record<string, unknown>) {
  return {
    bookId: args.bookId ?? args.bookID ?? args["book-id"] ?? args.id,
    query: args.query ?? args.searchQuery ?? args.topic ?? args.prompt,
  };
}

async function processBookSearch(bookId: unknown, query: unknown) {
  if (bookId == null || query == null || query === "") {
    return { result: "Missing bookId or query" };
  }

  const bookIdStr = String(bookId);
  const queryStr = String(query).trim();

  if (!bookIdStr || bookIdStr === "null" || bookIdStr === "undefined" || !queryStr) {
    return { result: "Missing bookId or query" };
  }

  const searchResult = await searchBookSegments(bookIdStr, queryStr, 3);

  if (!searchResult.success || !searchResult.data?.length) {
    return { result: NO_INFORMATION_RESULT };
  }

  const combinedText = searchResult.data
    .map((segment) => {
      const typedSegment = segment as { content: string; segmentIndex?: number };
      const segmentNumber =
        typeof typedSegment.segmentIndex === "number" ? typedSegment.segmentIndex + 1 : null;

      return segmentNumber == null
        ? typedSegment.content
        : `Segment ${segmentNumber}\n${typedSegment.content}`;
    })
    .join("\n\n");

  return { result: combinedText };
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}

function parseArgs(args: unknown): Record<string, unknown> {
  if (!args) return {};

  if (typeof args === "string") {
    try {
      return JSON.parse(args);
    } catch {
      return {};
    }
  }

  return args as Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const functionCall = body?.message?.functionCall;
    const toolCallList = body?.message?.toolCallList || body?.message?.toolCalls;

    if (functionCall) {
      const { name, parameters } = functionCall;
      const parsed = parseArgs(parameters);

      if (isSearchBookTool(name)) {
        const { bookId, query } = extractBookSearchParams(parsed);
        const result = await processBookSearch(bookId, query);
        return NextResponse.json(result);
      }

      return NextResponse.json({ result: `Unknown function: ${name}` });
    }

    if (!toolCallList || toolCallList.length === 0) {
      return NextResponse.json({
        results: [{ result: "No tool calls found" }],
      });
    }

    const results = [];

    for (const toolCall of toolCallList) {
      const { id, function: func } = toolCall;
      const name = func?.name;
      const args = parseArgs(func?.arguments);

      if (isSearchBookTool(name)) {
        const { bookId, query } = extractBookSearchParams(args);
        const searchResult = await processBookSearch(bookId, query);
        results.push({ toolCallId: id, ...searchResult });
      } else {
        results.push({ toolCallId: id, result: `Unknown function: ${name}` });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Vapi search-book error:", error);
    return NextResponse.json({
      results: [{ result: "Error processing request" }],
    });
  }
}
