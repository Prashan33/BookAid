import React from 'react'
import HeroSection from '@/components/HeroSection';
import BookCard from '@/components/BookCard';
import { getAllBooks } from '@/lib/actions/book.actions';
import Search from '@/components/Search';

export const dynamic = 'force-dynamic';

const Page = async ({
    searchParams,
}: {
    searchParams: Promise<{ query?: string }>;
}) => {
    const { query } = await searchParams;
    const bookResults = await getAllBooks(query)
    const books = bookResults.success ? bookResults.data ?? [] : []

    return (
        <main className="page-shell">
            <section className="mx-auto mt-8 flex w-full max-w-[1180px] flex-col px-5">
            <HeroSection />

            <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <h2 className="font-serif text-3xl font-bold text-[#212a3b]">Recent Books</h2>
                <Search />
            </div>

            <div className="library-books-grid">
                {books.map((book) => (
                    <BookCard
                        key={book._id}
                        title={book.title}
                        author={book.author}
                        coverURL={book.coverURL}
                        slug={book.slug}
                    />
                ))}
            </div>
            </section>
        </main>
    )
}

export default Page
