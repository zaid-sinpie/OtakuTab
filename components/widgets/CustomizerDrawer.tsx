import React, { useState } from "react";
import { Sliders, Gamepad2, TrendingUp, Briefcase, Flower2, Upload, RotateCcw, Plus, Radio, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PersonaType } from "@/types";

interface CustomizerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activePersona: PersonaType;
  onSelectPersona: (p: PersonaType) => void;
  particleColor: string;
  onParticleColorChange: (c: string) => void;
  onWallpaperChange: (src: string) => void;
  onResetLayout?: () => void;
}

export const CustomizerDrawer: React.FC<CustomizerDrawerProps> = ({
  isOpen,
  onClose,
  activePersona,
  onSelectPersona,
  particleColor,
  onParticleColorChange,
  onWallpaperChange,
  onResetLayout,
}) => {
  const [bookmarkName, setBookmarkName] = useState("");
  const [bookmarkUrl, setBookmarkUrl] = useState("");
  const [stationUrl, setStationUrl] = useState("");

  if (!isOpen) return null;

  const extractTheme = (src: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);

        const pixels = ctx.getImageData(0, 0, 50, 50).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          r += pixels[i];
          g += pixels[i + 1];
          b += pixels[i + 2];
          count++;
        }
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);

        document.documentElement.style.setProperty("--primary", `${r} ${g} ${b}`);
      } catch {}
    };
    img.src = src;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("Please select an image smaller than 3 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (src) {
        onWallpaperChange(src);
        chrome.storage.local.set({ wallpaper: src });
        extractTheme(src);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetWallpaper = () => {
    chrome.storage.local.remove("wallpaper", () => {
      onWallpaperChange("");
    });
  };

  const handleAddBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    const name = bookmarkName.trim();
    let url = bookmarkUrl.trim();
    if (!name || !url) return;

    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    if (chrome?.bookmarks?.getTree) {
      chrome.bookmarks.getTree((tree) => {
        const bar =
          tree[0]?.children?.find(
            (node) =>
              node.id === "1" ||
              (node.title && node.title.toLowerCase().includes("bookmark"))
          ) || tree[0]?.children?.[0];
        if (!bar) return;

        chrome.bookmarks.create({
          parentId: bar.id,
          title: name,
          url: url,
        });
        setBookmarkName("");
        setBookmarkUrl("");
      });
    }
  };

  const handleLaunchMusic = () => {
    if (!stationUrl.trim()) return;
    chrome.storage.local.set({ musicPlaylistUrl: stationUrl });
    chrome.runtime.sendMessage({
      action: "LAUNCH_PLAYLIST_TAB",
      url: stationUrl,
      mode: "pinned",
    });
    onClose();
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-white/10 bg-slate-950/90 p-6 shadow-2xl backdrop-blur-2xl transition-all duration-300">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-primary" />
          <h2 className="font-orbitron text-sm font-bold text-white uppercase tracking-wider">
            Studio Customizer
          </h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto py-4 pr-1">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/70">Persona Mode</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSelectPersona("gamer")}
              className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition ${
                activePersona === "gamer"
                  ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" /> Gamer
            </button>
            <button
              onClick={() => onSelectPersona("trader")}
              className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition ${
                activePersona === "trader"
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Trader
            </button>
            <button
              onClick={() => onSelectPersona("corporate")}
              className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition ${
                activePersona === "corporate"
                  ? "border-blue-400 bg-blue-500/20 text-blue-200"
                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" /> Corporate
            </button>
            <button
              onClick={() => onSelectPersona("otaku")}
              className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition ${
                activePersona === "otaku"
                  ? "border-pink-400 bg-pink-500/20 text-pink-200"
                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
              }`}
            >
              <Flower2 className="w-3.5 h-3.5" /> Otaku
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/70">Custom Wallpaper</label>
          <div className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 p-3 text-xs text-white/70 hover:bg-white/10 transition">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload image (&lt;3MB)</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetWallpaper}
              className="gap-1.5 w-full text-xs"
            >
              <RotateCcw className="w-3 h-3" /> Reset to Default Wallpaper
            </Button>
            {onResetLayout && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResetLayout}
                className="gap-1.5 w-full text-xs"
              >
                <RotateCcw className="w-3 h-3" /> Reset Widget Layout
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/70">Particle Glow Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={particleColor}
              onChange={(e) => onParticleColorChange(e.target.value)}
              className="h-8 w-12 cursor-pointer rounded border border-white/20 bg-transparent p-0.5"
            />
            <span className="text-xs font-mono text-white/60 uppercase">{particleColor}</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/70">Add Bookmark Shortcut</label>
          <form onSubmit={handleAddBookmark} className="space-y-2">
            <Input
              placeholder="Name (e.g. GitHub)"
              value={bookmarkName}
              onChange={(e) => setBookmarkName(e.target.value)}
              className="text-xs"
            />
            <Input
              placeholder="https://..."
              value={bookmarkUrl}
              onChange={(e) => setBookmarkUrl(e.target.value)}
              className="text-xs"
            />
            <Button type="submit" variant="glass" size="sm" className="w-full gap-1.5 text-xs">
              <Plus className="w-3 h-3" /> Add Bookmark
            </Button>
          </form>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/70">YouTube Station URL</label>
          <div className="space-y-2">
            <Input
              placeholder="https://www.youtube.com/playlist?list=..."
              value={stationUrl}
              onChange={(e) => setStationUrl(e.target.value)}
              className="text-xs"
            />
            <Button
              variant="glass"
              size="sm"
              onClick={handleLaunchMusic}
              className="w-full gap-1.5 text-xs"
            >
              <Radio className="w-3 h-3" /> Launch Music Tab
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
