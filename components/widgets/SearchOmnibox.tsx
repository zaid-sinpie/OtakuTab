import React, { useState } from "react";
import { Search } from "lucide-react";

export const SearchOmnibox: React.FC = () => {
  const [engine, setEngine] = useState("google");
  const [query, setQuery] = useState("");

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    if (/^(https?:\/\/|[a-z0-9]+\.[a-z]{2,})/i.test(trimmed)) {
      window.location.href = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
      return;
    }

    let url = `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
    if (engine === "duckduckgo") {
      url = `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
    } else if (engine === "youtube") {
      url = `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}`;
    } else if (engine === "bing") {
      url = `https://www.bing.com/search?q=${encodeURIComponent(trimmed)}`;
    }

    window.location.href = url;
  };

  return (
    <form
      onSubmit={handleSearch}
      className="flex items-center w-full max-w-md rounded-2xl border border-white/15 bg-black/25 px-3 py-1 backdrop-blur-md shadow-lg transition-all focus-within:border-white/30 focus-within:bg-black/35"
    >
      <select
        value={engine}
        onChange={(e) => setEngine(e.target.value)}
        aria-label="Search engine"
        className="rounded-lg border-0 bg-transparent pr-2 text-xs font-semibold text-white/70 focus:outline-none cursor-pointer"
      >
        <option value="google" className="bg-slate-900 text-white">Google</option>
        <option value="duckduckgo" className="bg-slate-900 text-white">DuckDuckGo</option>
        <option value="youtube" className="bg-slate-900 text-white">YouTube</option>
        <option value="bing" className="bg-slate-900 text-white">Bing</option>
      </select>

      <span className="h-4 w-px bg-white/15 mx-1" />

      <input
        type="text"
        placeholder="Search the web or type a URL..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1 bg-transparent px-2 text-xs text-white placeholder:text-white/40 focus:outline-none"
      />

      <button
        type="submit"
        aria-label="Submit search"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition"
      >
        <Search className="w-3.5 h-3.5" />
      </button>
    </form>
  );
};
