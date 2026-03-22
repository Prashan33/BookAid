'use server';

import { auth } from "@clerk/nextjs/server";
import {CreateBook, TextSegment} from "@/types";
import { connectToDatabase } from "@/database/mongoose";
import {escapeRegex, generateSlug, serializeData} from "@/lib/utils";
import Book from "@/database/models/book.model";
import BookSegment from "@/database/models/book-segment.model";
import mongoose from "mongoose";
import { PLAN_DISPLAY_NAMES } from "@/lib/subscription-constants";
import { getPlanLimitsFor } from "@/lib/subscription";
import { getUserPlan } from "@/lib/subscription.server";

export const getAllBooks = async (search?: string) => {
    try {
        await connectToDatabase();

        let query = {};

        if (search) {
            const escapedSearch = escapeRegex(search);
            const regex = new RegExp(escapedSearch, 'i');
            query = {
                $or: [
                    { title: { $regex: regex } },
                    { author: { $regex: regex } },
                ]
            };
        }

        const books = await Book.find(query).sort({ createdAt: -1 }).lean();

        return {
            success: true,
            data: serializeData(books)
        }
    } catch (e) {
        console.error('Error connecting to database', e);
        return {
            success: false, error: e
        }
    }
}

export const getBookBySlug = async (slug: string) => {
    try {
        await connectToDatabase();

        const book = await Book.findOne({ slug }).lean();

        if (!book) {
            return {
                success: false,
                data: null,
            };
        }

        return {
            success: true,
            data: serializeData(book),
        };
    } catch (e) {
        console.error('Error fetching book by slug', e);
        return {
            success: false,
            data: null,
            error: e,
        };
    }
}


export const checkBookExists = async (title: string) => {
    try {
        await connectToDatabase();

        const slug = generateSlug(title);

        const existingBook = await Book.findOne({slug}).lean();

        if(existingBook) {
            return {
                exists: true,
                book: serializeData(existingBook)
            }
        }

        return {
            exists: false,
        }
    } catch (e) {
        console.error('Error checking book exists', e);
        return {
            exists: false, error: e
        }
    }
}


export const createBook = async (data: CreateBook) => {
    try {
        const { userId } = await auth();

        if (!userId || userId !== data.clerkId) {
            return {
                success: false,
                error: "Unauthorized",
            };
        }

        await connectToDatabase();

        const slug = generateSlug(data.title);

        const existingBook = await Book.findOne({ slug }).lean();

        if (existingBook) {
            return {
                success: true,
                data:serializeData(existingBook),
                alreadyExists: true,
            };
        }

        const plan = await getUserPlan();
        const limits = getPlanLimitsFor(plan);
        const bookCount = await Book.countDocuments({ clerkId: userId });

        if (bookCount >= limits.maxBooks) {
            const { revalidatePath } = await import("next/cache");
            revalidatePath("/");

            return {
                success: false,
                error: `You have reached the maximum number of books allowed for your ${PLAN_DISPLAY_NAMES[plan]} plan (${limits.maxBooks}). Please upgrade to add more books.`,
                isBillingError: true,
            };
        }

        const book = await Book.create({...data, clerkId: userId, slug, totalSegments: 0});

        return {
            success: true,
            data: serializeData(book),
        }


    } catch (e) {
        console.error("Error creating a book", e);

        return {
            success: false,
            error: e,
        };
    }
};


export const saveBookSegments = async (bookId: string, clerkId: string, segments: TextSegment[]) => {
    try {
        await connectToDatabase();

        console.log('Saving book segments...');

        const segmentsToInsert = segments.map(({ text, segmentIndex, pageNumber, wordCount }) => ({
            clerkId, bookId, content: text, segmentIndex, pageNumber, wordCount
        }));

        await BookSegment.insertMany(segmentsToInsert);

        await Book.findByIdAndUpdate(bookId, { totalSegments: segments.length });

        console.log('Book segments saved successfully.');

        return {
            success: true,
            data: { segmentsCreated: segments.length}
        }
    } catch (e) {
        console.error('Error saving book segments', e);

        return {
            success: false,
            error: e,
        }
    }
}

export const searchBookSegments = async (bookId: string, query: string, limit: number = 5) => {
    try {
        await connectToDatabase();

        if (!mongoose.Types.ObjectId.isValid(bookId)) {
            return {
                success: false,
                error: "Invalid book ID",
                data: [],
            };
        }

        const bookObjectId = new mongoose.Types.ObjectId(bookId);

        let segments: Record<string, unknown>[] = [];

        try {
            segments = await BookSegment.find({
                bookId: bookObjectId,
                $text: { $search: query },
            })
                .select("_id bookId content segmentIndex pageNumber wordCount")
                .sort({ score: { $meta: "textScore" } })
                .limit(limit)
                .lean();
        } catch {
            segments = [];
        }

        if (segments.length === 0) {
            const keywords = query.split(/\s+/).filter((keyword) => keyword.length > 2);
            const pattern = keywords.map(escapeRegex).join("|");

            if (!pattern) {
                return {
                    success: true,
                    data: [],
                };
            }

            segments = await BookSegment.find({
                bookId: bookObjectId,
                content: { $regex: pattern, $options: "i" },
            })
                .select("_id bookId content segmentIndex pageNumber wordCount")
                .sort({ segmentIndex: 1 })
                .limit(limit)
                .lean();
        }

        return {
            success: true,
            data: serializeData(segments),
        };
    } catch (error) {
        console.error("Error searching segments:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            data: [],
        };
    }
}
