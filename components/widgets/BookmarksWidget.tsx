import React, { useState, useEffect, useCallback } from "react";
import { BookmarkItem } from "@/types";

export const BookmarksWidget: React.FC<{ x?: number; y?: number }> = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);

  const loadBookmarks = useCallback(() => {
    if (!chrome?.bookmarks?.getTree) return;
    chrome.bookmarks.getTree((tree) => {
      const bar =
        tree[0]?.children?.find((node) => node.title === "Bookmarks bar") ||
        tree[0]?.children?.[0];
      if (!bar?.children) return;

      const items: BookmarkItem[] = [];
      bar.children.forEach((child) => {
        if (child.url) {
          items.push({
            id: child.id,
            title: child.title || "Shortcut",
            url: child.url,
          });
        }
      });
      setBookmarks(items);
    });
  }, []);

  useEffect(() => {
    loadBookmarks();

    const handleCreated = () => loadBookmarks();
    const handleRemoved = () => loadBookmarks();

    if (chrome?.bookmarks?.onCreated) {
      chrome.bookmarks.onCreated.addListener(handleCreated);
      chrome.bookmarks.onRemoved.addListener(handleRemoved);
    }

    return () => {
      if (chrome?.bookmarks?.onCreated) {
        chrome.bookmarks.onCreated.removeListener(handleCreated);
        chrome.bookmarks.onRemoved.removeListener(handleRemoved);
      }
    };
  }, [loadBookmarks]);

  const getFaviconUrl = (url: string) => {
    try {
      return `/_favicon/?pageUrl=${encodeURIComponent(url)}&size=64`;
    } catch {
      return "";
    }
  };

  const getFallbackFavicon = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return "/icons/icon16.png";
    }
  };

  if (bookmarks.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/15 bg-black/25 p-2.5 backdrop-blur-md shadow-lg">
      {bookmarks.map((b) => (
        <a
          key={b.id}
          href={b.url}
          target="_blank"
          rel="noreferrer"
          title={b.title}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-white/5 p-2 transition hover:bg-white/15 hover:border-white/20 hover:scale-110 active:scale-95"
        >
          <img
            src={getFaviconUrl(b.url)}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = getFallbackFavicon(b.url);
            }}
            alt={b.title}
            className="h-4 w-4 rounded-sm object-contain"
          />
        </a>
      ))}
    </div>
  );
};
