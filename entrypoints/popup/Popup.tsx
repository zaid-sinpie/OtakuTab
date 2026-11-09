import React, { useState, useEffect } from "react";
import {
  ExternalLink,
  Gamepad2,
  TrendingUp,
  Briefcase,
  Flower2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Radio,
  Search,
  Sparkles,
  Bookmark,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PersonaType, WidgetSettings, MusicStatus, UserPlaylist } from "@/types";

export const Popup: React.FC = () => {
  const [activePersona, setActivePersona] = useState<PersonaType>("otaku");
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>({
    showMusic: true,
    showWidgets: true,
    showSearch: true,
    showShortcuts: true,
    showParticles: true,
  });
  const [musicStatus, setMusicStatus] = useState<MusicStatus>({
    connected: false,
    isPlaying: false,
    title: "No Song Playing",
    channel: "YouTube Station",
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isMuted: false,
    thumbnail: "",
  });
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [userPlaylists, setUserPlaylists] = useState<UserPlaylist[]>([]);
  const [hasBookmarks, setHasBookmarks] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(
      ["activePersona", "widgetSettings", "musicPlaylistUrl", "userPlaylists", "customShortcuts"],
      (res) => {
        if (res.activePersona) setActivePersona(res.activePersona);
        if (res.widgetSettings) {
          setWidgetSettings((prev) => ({ ...prev, ...res.widgetSettings }));
        }
        if (res.musicPlaylistUrl) setPlaylistUrl(res.musicPlaylistUrl);
        if (Array.isArray(res.userPlaylists)) setUserPlaylists(res.userPlaylists);

        const customs = Array.isArray(res.customShortcuts) ? res.customShortcuts : [];
        if (!chrome?.bookmarks?.getTree) {
          setHasBookmarks(customs.length > 0);
        } else {
          chrome.bookmarks.getTree((tree) => {
            if (!tree || !tree[0]) {
              setHasBookmarks(customs.length > 0);
              return;
            }
            const bar =
              tree[0].children?.find(
                (node) =>
                  node.id === "1" ||
                  (node.title && node.title.toLowerCase().includes("bookmark"))
              ) || tree[0].children?.[0];
            const count = (bar?.children?.filter((c) => Boolean(c.url))?.length || 0) + customs.length;
            setHasBookmarks(count > 0);
          });
        }
      }
    );

    chrome.runtime.sendMessage({ action: "GET_STATUS" }, (res) => {
      if (res && !chrome.runtime.lastError) {
        setMusicStatus(res);
      }
    });

    const listener = (msg: { type: string; status: MusicStatus }) => {
      if (msg.type === "YOUTUBE_STATUS_UPDATE" && msg.status) {
        setMusicStatus(msg.status);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  const handleSelectPersona = (p: PersonaType) => {
    setActivePersona(p);
    chrome.storage.local.set({ activePersona: p });
  };

  const handleToggleWidget = (key: keyof WidgetSettings, val: boolean) => {
    const updated = { ...widgetSettings, [key]: val };
    setWidgetSettings(updated);
    chrome.storage.local.set({ widgetSettings: updated });
  };

  const handlePlayPause = () => {
    if (!musicStatus.connected) {
      const target = playlistUrl || userPlaylists[0]?.url;
      if (target) {
        handleLaunchMusic(target);
      }
      return;
    }
    const nextCommand = musicStatus.isPlaying ? "PAUSE" : "PLAY";
    setMusicStatus((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
    chrome.runtime.sendMessage({ action: "MEDIA_COMMAND", command: nextCommand }, (res) => {
      if (res?.status) setMusicStatus(res.status);
    });
  };

  const handleNext = () => {
    chrome.runtime.sendMessage({ action: "MEDIA_COMMAND", command: "NEXT_TRACK" });
  };

  const handlePrev = () => {
    chrome.runtime.sendMessage({ action: "MEDIA_COMMAND", command: "PREV_TRACK" });
  };

  const handleLaunchMusic = (url: string) => {
    const target = url.trim() || userPlaylists[0]?.url;
    if (!target) return;
    setIsLaunching(true);
    chrome.storage.local.set({ musicPlaylistUrl: target });
    chrome.runtime.sendMessage(
      { action: "LAUNCH_PLAYLIST_TAB", url: target, mode: "pinned" },
      () => {
        setIsLaunching(false);
      }
    );
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-white">
      <header className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <img src="/icons/icon48.png" alt="Logo" className="h-7 w-7 rounded-lg shadow" />
          <div className="flex flex-col">
            <h1 className="font-orbitron text-xs font-bold tracking-widest text-white uppercase">
              Otaku Tab
            </h1>
            <span className="text-[10px] text-white/50">Theme & Studio Controls</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="iconSm"
          onClick={() => chrome.tabs.create({ url: "chrome://newtab" })}
          title="Open New Tab"
        >
          <ExternalLink className="w-3.5 h-3.5 text-white/70" />
        </Button>
      </header>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-white/70 tracking-wider uppercase">
            Persona Mode
          </span>
          <Badge variant="outline" className="font-orbitron uppercase text-[10px]">
            {activePersona}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleSelectPersona("gamer")}
            className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 transition ${
              activePersona === "gamer"
                ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            <Gamepad2 className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold">Gamer</span>
            <span className="text-[10px] text-white/40">HUD & Radar</span>
          </button>

          <button
            onClick={() => handleSelectPersona("trader")}
            className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 transition ${
              activePersona === "trader"
                ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold">Trader</span>
            <span className="text-[10px] text-white/40">Crypto & Clocks</span>
          </button>

          <button
            onClick={() => handleSelectPersona("corporate")}
            className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 transition ${
              activePersona === "corporate"
                ? "border-blue-400 bg-blue-500/20 text-blue-200"
                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            <Briefcase className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold">Corporate</span>
            <span className="text-[10px] text-white/40">Focus & Tasks</span>
          </button>

          <button
            onClick={() => handleSelectPersona("otaku")}
            className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 transition ${
              activePersona === "otaku"
                ? "border-pink-400 bg-pink-500/20 text-pink-200"
                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            <Flower2 className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-bold">Otaku</span>
            <span className="text-[10px] text-white/40">Zen & Lofi</span>
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-white/70 tracking-wider uppercase">
            Music Controller
          </span>
          <Badge variant={musicStatus.connected ? "success" : "outline"} className="text-[10px]">
            {musicStatus.connected ? (musicStatus.isPlaying ? "PLAYING" : "CONNECTED") : "DISCONNECTED"}
          </Badge>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col overflow-hidden pr-2 flex-1">
              <span className="truncate text-xs font-bold text-white">
                {musicStatus.title || "No Song Playing"}
              </span>
              <span className="truncate text-[10px] text-white/50">
                {musicStatus.channel || "YouTube Station"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="iconSm" onClick={handlePrev}>
                <SkipBack className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="glass"
                size="iconSm"
                onClick={handlePlayPause}
                className="h-7 w-7 rounded-full"
              >
                {musicStatus.isPlaying ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3 ml-0.5" />
                )}
              </Button>
              <Button variant="ghost" size="iconSm" onClick={handleNext}>
                <SkipForward className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="mt-1 flex gap-1.5">
            <Input
              type="text"
              placeholder="YouTube URL or Playlist..."
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              className="h-7 text-[11px]"
            />
            <Button
              variant="glass"
              size="sm"
              onClick={() => handleLaunchMusic(playlistUrl)}
              disabled={isLaunching}
              className="h-7 px-2.5 text-xs"
            >
              <Radio className="w-3 h-3" />
            </Button>
          </div>

          {userPlaylists.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-white/40">Playlists:</span>
              {userPlaylists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => {
                    setPlaylistUrl(pl.url);
                    handleLaunchMusic(pl.url);
                  }}
                  className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/80 hover:bg-white/10 transition"
                  title={pl.url}
                >
                  <Radio className="w-2.5 h-2.5 text-primary" />
                  <span className="max-w-[70px] truncate">{pl.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-2 border-t border-white/10 pt-3">
        <span className="text-[11px] font-semibold text-white/70 tracking-wider uppercase">
          Widget Visibility
        </span>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-white/80">
              <Radio className="w-3.5 h-3.5 text-primary" /> Music Player
            </span>
            <Switch
              checked={widgetSettings.showMusic}
              onCheckedChange={(val) => handleToggleWidget("showMusic", val)}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-white/80">
              <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" /> Persona Dashboard
            </span>
            <Switch
              checked={widgetSettings.showWidgets}
              onCheckedChange={(val) => handleToggleWidget("showWidgets", val)}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-white/80">
              <Search className="w-3.5 h-3.5 text-blue-400" /> Search Omnibox
            </span>
            <Switch
              checked={widgetSettings.showSearch}
              onCheckedChange={(val) => handleToggleWidget("showSearch", val)}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-white/80">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Floating Particles
            </span>
            <Switch
              checked={widgetSettings.showParticles}
              onCheckedChange={(val) => handleToggleWidget("showParticles", val)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-white/80">
                <Bookmark className="w-3.5 h-3.5 text-emerald-400" /> Bookmarks Bar
              </span>
              <Switch
                checked={widgetSettings.showShortcuts}
                onCheckedChange={(val) => handleToggleWidget("showShortcuts", val)}
              />
            </div>
            {!hasBookmarks && (
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200/90 leading-normal">
                No bookmarks added yet. Add at least one bookmark in Chrome to make this widget visible.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
