'use client';

import { Search as SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Input } from "@/components/ui/input";

const Search = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const query = searchParams.get("query") || "";

  const updateQuery = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const normalizedValue = value.trim();

    if (normalizedValue) {
      params.set("query", normalizedValue);
    } else {
      params.delete("query");
    }

    const suffix = params.toString();

    startTransition(() => {
      router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
    });
  };

  return (
    <div className="library-search-wrapper">
      <div className="pl-4">
        <SearchIcon size={20} className="text-[var(--text-muted)]" />
      </div>
      <Input
        type="text"
        placeholder="Search books by title or author"
        className="library-search-input border-none shadow-none focus-visible:ring-0"
        key={query}
        defaultValue={query}
        onChange={(event) => updateQuery(event.target.value)}
        aria-busy={isPending}
      />
    </div>
  );
};

export default Search;
