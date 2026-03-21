'use client';

import { Search as SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";

const Search = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(searchParams.get("query") || "");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);

      if (query) {
        params.set("query", query);
      } else {
        params.delete("query");
      }

      const suffix = params.toString();
      router.push(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [pathname, query, router]);

  return (
    <div className="library-search-wrapper">
      <div className="pl-4">
        <SearchIcon size={20} className="text-[var(--text-muted)]" />
      </div>
      <Input
        type="text"
        placeholder="Search books by title or author"
        className="library-search-input border-none shadow-none focus-visible:ring-0"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </div>
  );
};

export default Search;
