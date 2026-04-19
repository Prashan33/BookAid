import { TextSegment } from "@/types";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { DEFAULT_VOICE, voiceOptions } from "@/lib/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function serializeData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data))
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function splitIntoSegments(
  text: string,
  segmentSize = 500,
  overlapSize = 50,
): TextSegment[] {
  if (segmentSize <= 0) {
    throw new Error("segmentSize must be greater than 0");
  }
  if (overlapSize < 0 || overlapSize >= segmentSize) {
    throw new Error("overlapSize must be >= 0 and < segmentSize");
  }

  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const segments: TextSegment[] = [];

  let segmentIndex = 0;
  let startIndex = 0;

  while (startIndex < words.length) {
    const endIndex = Math.min(startIndex + segmentSize, words.length);
    const segmentWords = words.slice(startIndex, endIndex);
    const segmentText = segmentWords.join(" ");

    segments.push({
      text: segmentText,
      segmentIndex,
      wordCount: segmentWords.length,
    });

    segmentIndex++;

    if (endIndex >= words.length) break;
    startIndex = endIndex - overlapSize;
  }

  return segments;
}

export function getVoice(persona?: string) {
  if (!persona) return voiceOptions[DEFAULT_VOICE];

  const voiceEntry = Object.values(voiceOptions).find((voice) => voice.id === persona);
  if (voiceEntry) return voiceEntry;

  return voiceOptions[persona as keyof typeof voiceOptions] || voiceOptions[DEFAULT_VOICE];
}

export async function parsePDFFile(file: File) {
  try {
    const pdfjsLib = await import("pdfjs-dist");

    if (typeof window !== "undefined") {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;

    const firstPage = await pdfDocument.getPage(1);
    const viewport = firstPage.getViewport({ scale: 2 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not get canvas context");
    }

    await firstPage.render({
      canvas,
      canvasContext: context,
      viewport,
    }).promise;

    const cover = canvas.toDataURL("image/png");

    let fullText = "";

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .filter((item) => "str" in item)
        .map((item) => (item as { str: string }).str)
        .join(" ");
      fullText += pageText + "\n";
    }

    await pdfDocument.destroy();

    return {
      content: splitIntoSegments(fullText),
      cover,
    };
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error(
      `Failed to parse PDF file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
