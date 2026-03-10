import HeroSection from "@/components/HeroSection";
import BookCard from "@/components/BookCard";
import { sampleBooks } from "@/lib/constants";

const Page = () => {
  return (
    <main className="container">
      <section className="wrapper">
        <HeroSection />

        <div className="library-books-grid">
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
