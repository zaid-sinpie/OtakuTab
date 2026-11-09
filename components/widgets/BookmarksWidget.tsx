import React, { useState, useEffect, useCallback } from "react";
import { Bookmark, Plus, X, Globe } from "lucide-react";
import { BookmarkItem } from "@/types";
import { WidgetWrapper } from "./WidgetWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const BookmarksWidget: React.FC<{ id?: string; x?: number; y?: number }> = ({
  id,
  x,
  y,
}) => {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const loadBookmarks = useCallback(() => {
    chrome.storage.local.get(["customShortcuts"], (storageRes) => {
      const customs: BookmarkItem[] = Array.isArray(storageRes.customShortcuts)
        ? storageRes.customShortcuts
        : [];

      if (!chrome?.bookmarks?.getTree) {
        setBookmarks(customs);
        return;
      }

      chrome.bookmarks.getTree((tree) => {
        if (chrome.runtime.lastError || !tree || !tree[0]) {
          setBookmarks(customs);
          return;
        }

        const bar =
          tree[0].children?.find(
            (node) =>
              node.id === "1" ||
              (node.title && node.title.toLowerCase().includes("bookmark"))
          ) || tree[0].children?.[0];

        const items: BookmarkItem[] = [];
        if (bar?.children) {
          bar.children.forEach((child) => {
            if (child.url) {
              items.push({
                id: child.id,
                title: child.title || "Shortcut",
                url: child.url,
              });
            }
          });
        }

        setBookmarks([...items, ...customs]);
      });
    });
  }, []);

  useEffect(() => {
    loadBookmarks();

    const handleBookmarksChanged = () => loadBookmarks();

    if (chrome?.bookmarks?.onCreated) {
      chrome.bookmarks.onCreated.addListener(handleBookmarksChanged);
      chrome.bookmarks.onRemoved.addListener(handleBookmarksChanged);
      chrome.bookmarks.onChanged?.addListener(handleBookmarksChanged);
    }

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === "local" && (changes.customShortcuts || changes.lastBookmarkAdded)) {
        loadBookmarks();
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      if (chrome?.bookmarks?.onCreated) {
        chrome.bookmarks.onCreated.removeListener(handleBookmarksChanged);
        chrome.bookmarks.onRemoved.removeListener(handleBookmarksChanged);
        chrome.bookmarks.onChanged?.removeListener(handleBookmarksChanged);
      }
      chrome.storage.onChanged.removeListener(handleStorageChange);
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

  const handleAddBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    let url = newUrl.trim();
    if (!title || !url) return;

    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    if (chrome?.bookmarks?.create && chrome?.bookmarks?.getTree) {
      chrome.bookmarks.getTree((tree) => {
        const bar =
          tree[0]?.children?.find(
            (node) =>
              node.id === "1" ||
              (node.title && node.title.toLowerCase().includes("bookmark"))
          ) || tree[0]?.children?.[0];

        if (bar) {
          chrome.bookmarks.create(
            {
              parentId: bar.id,
              title,
              url,
            },
            () => {
              setNewTitle("");
              setNewUrl("");
              setIsAddOpen(false);
              loadBookmarks();
            }
          );
          return;
        }

        saveToCustomStorage(title, url);
      });
    } else {
      saveToCustomStorage(title, url);
    }
  };

  const saveToCustomStorage = (title: string, url: string) => {
    chrome.storage.local.get(["customShortcuts"], (res) => {
      const current: BookmarkItem[] = Array.isArray(res.customShortcuts)
        ? res.customShortcuts
        : [];
      const updated = [...current, { id: Date.now().toString(), title, url }];
      chrome.storage.local.set({ customShortcuts: updated }, () => {
        setNewTitle("");
        setNewUrl("");
        setIsAddOpen(false);
        loadBookmarks();
      });
    });
  };

  const handleDeleteBookmark = (targetId: string) => {
    if (chrome?.bookmarks?.remove) {
      chrome.bookmarks.remove(targetId, () => {
        if (chrome.runtime.lastError) {
          deleteFromCustomStorage(targetId);
        } else {
          loadBookmarks();
        }
      });
    } else {
      deleteFromCustomStorage(targetId);
    }
  };

  const deleteFromCustomStorage = (targetId: string) => {
    chrome.storage.local.get(["customShortcuts"], (res) => {
      const current: BookmarkItem[] = Array.isArray(res.customShortcuts)
        ? res.customShortcuts
        : [];
      const updated = current.filter((b) => b.id !== targetId);
      chrome.storage.local.set({ customShortcuts: updated }, () => {
        loadBookmarks();
      });
    });
  };

  if (bookmarks.length === 0) return null;

  return (
    <>
      <WidgetWrapper
        id={id}
        x={x}
        y={y}
        title="Bookmarks"
        icon={<Bookmark className="w-3.5 h-3.5 text-emerald-400" />}
        className="w-fit max-w-[460px] min-w-[200px]"
        headerRight={
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setIsAddOpen(true)}
            title="Add Bookmark"
            className="h-6 w-6 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        }
      >
        <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 custom-scrollbar max-w-full">
          {bookmarks.map((b) => (
            <div
              key={b.id}
              className="group/item relative flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/15 hover:border-white/20 transition shrink-0"
            >
              <a
                href={b.url}
                target="_blank"
                rel="noreferrer"
                title={b.title}
                className="flex items-center gap-2 max-w-[140px]"
              >
                <img
                  src={getFaviconUrl(b.url)}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = getFallbackFavicon(b.url);
                  }}
                  alt={b.title}
                  className="h-4 w-4 rounded-sm object-contain shrink-0"
                />
                <span className="truncate text-xs font-medium">{b.title}</span>
              </a>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteBookmark(b.id);
                }}
                title="Remove Bookmark"
                className="opacity-0 group-hover/item:opacity-100 rounded p-0.5 text-white/40 hover:text-rose-400 hover:bg-white/10 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </WidgetWrapper>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Bookmark Shortcut</DialogTitle>
            <DialogDescription>
              Add a quick link to your horizontal bookmark bar.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddBookmark} className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/80">Label</label>
              <Input
                placeholder="e.g. GitHub"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="text-xs"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/80">URL</label>
              <Input
                placeholder="https://github.com"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="glass" size="sm" className="gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};