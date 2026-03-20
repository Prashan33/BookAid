import React from 'react'
import HeroSection from '@/components/HeroSection';
import BookCard from '@/components/BookCard';
import { getAllBooks } from '@/lib/actions/book.actions';

export const dynamic = 'force-dynamic';

const Page = async () => {
    const bookResults = await getAllBooks()
    const books = bookResults.success ? bookResults.data ?? [] : []

    return (
        <main className="page-shell">
            <section className="mx-auto mt-8 flex w-full max-w-[1180px] flex-col px-5">
            <HeroSection />

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
