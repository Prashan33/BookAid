import HeroSection from "@/components/HeroSection";
import BookCard from "@/components/BookCard";
import { sampleBooks } from "@/lib/constants";

const Page = () => {
  return (
    <main className="page-shell">
      <section className="mx-auto flex w-full max-w-[1180px] flex-col px-5">
        <HeroSection />

        <div className="library-books-grid w-full">
          {sampleBooks.map((book) => (
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
  );
};

export default Page;
