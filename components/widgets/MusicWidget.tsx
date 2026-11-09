import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Settings,
  Disc,
  Radio,
  ExternalLink,
  RefreshCw,
  Plus,
  Trash2,
} from "lucide-react";
import { WidgetWrapper } from "./WidgetWrapper";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MusicStatus, UserPlaylist } from "@/types";

export const MusicWidget: React.FC<{ id?: string; x?: number; y?: number }> = ({
  id,
  x,
  y,
}) => {
  const [status, setStatus] = useState<MusicStatus>({
    connected: false,
    isPlaying: false,
    title: "Ready to Play",
    channel: "Connect or Launch Station",
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isMuted: false,
    thumbnail: "",
  });

  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [stationMode, setStationMode] = useState<"pinned" | "minimized">("pinned");
  const [userPlaylists, setUserPlaylists] = useState<UserPlaylist[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistUrl, setNewPlaylistUrl] = useState("");
  const progressRef = useRef<HTMLDivElement>(null);

  const fetchStatus = () => {
    chrome.runtime.sendMessage({ action: "GET_STATUS" }, (res) => {
      if (chrome.runtime.lastError || !res) {
        setStatus((prev) => ({ ...prev, connected: false }));
        return;
      }
      setStatus(res);
    });
  };

  useEffect(() => {
    fetchStatus();
    chrome.storage.local.get(["musicPlaylistUrl", "userPlaylists"], (res) => {
      if (res.musicPlaylistUrl) setPlaylistUrl(res.musicPlaylistUrl);
      if (Array.isArray(res.userPlaylists)) setUserPlaylists(res.userPlaylists);
    });

    const listener = (msg: { type: string; status: MusicStatus }) => {
      if (msg.type === "YOUTUBE_STATUS_UPDATE" && msg.status) {
        setStatus(msg.status);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  const sendMediaCommand = (command: string, extra?: Record<string, unknown>) => {
    chrome.runtime.sendMessage({ action: "MEDIA_COMMAND", command, ...extra }, (res) => {
      if (res && res.status) setStatus(res.status);
    });
  };

  const handlePlayPause = () => {
    if (!status.connected) {
      const target = playlistUrl || userPlaylists[0]?.url;
      if (target) {
        launchStation(target);
      } else {
        setIsSetupOpen(true);
      }
      return;
    }
    const nextCommand = status.isPlaying ? "PAUSE" : "PLAY";
    setStatus((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
    sendMediaCommand(nextCommand);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !status.duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSeconds = ratio * status.duration;
    sendMediaCommand("SEEK", { seconds: targetSeconds });
  };

  const handleVolumeChange = (vals: number[]) => {
    const val = vals[0];
    setStatus((prev) => ({ ...prev, volume: val, isMuted: false }));
    sendMediaCommand("SET_VOLUME", { volume: val });
  };

  const toggleMute = () => {
    sendMediaCommand("TOGGLE_MUTE");
  };

  const launchStation = (urlToLaunch: string) => {
    const url = urlToLaunch.trim();
    if (!url) return;
    chrome.storage.local.set({ musicPlaylistUrl: url });
    chrome.runtime.sendMessage(
      { action: "LAUNCH_PLAYLIST_TAB", url, mode: stationMode },
      () => {
        setIsSetupOpen(false);
        setTimeout(fetchStatus, 1500);
      }
    );
  };

  const handleAddPlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPlaylistName.trim();
    const url = newPlaylistUrl.trim();
    if (!name || !url) return;

    const item: UserPlaylist = {
      id: Date.now().toString(),
      name,
      url,
    };
    const updated = [...userPlaylists, item];
    setUserPlaylists(updated);
    chrome.storage.local.set({ userPlaylists: updated });
    setNewPlaylistName("");
    setNewPlaylistUrl("");
  };

  const handleDeletePlaylist = (playlistId: string) => {
    const updated = userPlaylists.filter((p) => p.id !== playlistId);
    setUserPlaylists(updated);
    chrome.storage.local.set({ userPlaylists: updated });
  };

  const formatSeconds = (sec: number) => {
    if (!sec || isNaN(sec)) return "0:00";
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPercent =
    status.duration > 0 ? (status.currentTime / status.duration) * 100 : 0;

  return (
    <>
      <WidgetWrapper
        id={id}
        x={x}
        y={y}
        title="Music Studio"
        className="w-[360px] sm:w-[380px]"
        icon={<Radio className="w-3.5 h-3.5 text-primary" />}
        badge={
          <Badge variant={status.connected ? "success" : "outline"}>
            {status.connected ? "CONNECTED" : "DISCONNECTED"}
          </Badge>
        }
        headerRight={
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setIsSetupOpen(true)}
            title="Setup Music Station"
          >
            <Settings className="w-3 h-3 text-white/70" />
          </Button>
        }
      >
        <div className="flex flex-col gap-3 py-1">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/60 shadow-inner overflow-hidden">
              <div
                className={`flex h-full w-full items-center justify-center rounded-full ${
                  status.isPlaying ? "animate-spin-slow" : ""
                }`}
              >
                {status.thumbnail ? (
                  <img
                    src={status.thumbnail}
                    alt="Cover"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Disc className="w-6 h-6 text-white/40" />
                )}
              </div>
              <div className="absolute h-3 w-3 rounded-full bg-slate-950 border border-white/40" />
            </div>

            <div className="flex flex-col overflow-hidden min-w-0 flex-1">
              <span className="truncate text-xs font-bold text-white leading-tight">
                {status.title}
              </span>
              <span className="truncate text-[11px] text-white/50 leading-tight mt-0.5">
                {status.channel}
              </span>
            </div>

            <div className="flex items-center gap-0.5 h-5 px-1">
              <span
                className={`w-0.5 rounded-full bg-primary ${
                  status.isPlaying ? "animate-eq-1" : "h-1"
                }`}
              />
              <span
                className={`w-0.5 rounded-full bg-primary ${
                  status.isPlaying ? "animate-eq-2" : "h-1.5"
                }`}
              />
              <span
                className={`w-0.5 rounded-full bg-primary ${
                  status.isPlaying ? "animate-eq-3" : "h-1"
                }`}
              />
              <span
                className={`w-0.5 rounded-full bg-primary ${
                  status.isPlaying ? "animate-eq-4" : "h-2"
                }`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div
              ref={progressRef}
              onClick={handleSeek}
              className="relative h-1.5 w-full cursor-pointer rounded-full bg-white/10 hover:h-2 transition-all"
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-150"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-white/40 font-mono">
              <span>{formatSeconds(status.currentTime)}</span>
              <span>{formatSeconds(status.duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => sendMediaCommand("PREV_TRACK")}
              >
                <SkipBack className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="glass"
                size="icon"
                onClick={handlePlayPause}
                className="h-8 w-8 rounded-full"
              >
                {status.isPlaying ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5 ml-0.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => sendMediaCommand("NEXT_TRACK")}
              >
                <SkipForward className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-2 w-28">
              <Button variant="ghost" size="iconSm" onClick={toggleMute}>
                {status.isMuted || status.volume === 0 ? (
                  <VolumeX className="w-3 h-3 text-white/50" />
                ) : (
                  <Volume2 className="w-3 h-3 text-white/80" />
                )}
              </Button>
              <Slider
                value={[status.isMuted ? 0 : status.volume]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={handleVolumeChange}
              />
            </div>
          </div>
        </div>
      </WidgetWrapper>

      <Dialog open={isSetupOpen} onOpenChange={setIsSetupOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden p-6 gap-0">
          <DialogHeader className="shrink-0 pb-3">
            <DialogTitle>YouTube Music Station</DialogTitle>
            <DialogDescription>
              Launch or save your custom YouTube playlists and streams.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-1 flex-col min-h-0 overflow-hidden gap-3.5">
            <div className="shrink-0 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/80">Quick Launch URL</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste YouTube playlist or video URL..."
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  className="text-xs min-w-0 flex-1"
                />
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => launchStation(playlistUrl)}
                  className="shrink-0"
                >
                  Launch
                </Button>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={stationMode === "pinned"}
                  onChange={() => setStationMode("pinned")}
                />
                <span>Pinned Background Tab</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={stationMode === "minimized"}
                  onChange={() => setStationMode("minimized")}
                />
                <span>Minimized Window</span>
              </label>
            </div>

            <div className="shrink-0 flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
              <label className="text-xs font-semibold text-white/80">Save Custom Playlist</label>
              <form onSubmit={handleAddPlaylist} className="flex flex-col gap-2">
                <Input
                  placeholder="Playlist Label (e.g. Chill Synthwave)"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="h-8 text-xs"
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="https://www.youtube.com/playlist?list=..."
                    value={newPlaylistUrl}
                    onChange={(e) => setNewPlaylistUrl(e.target.value)}
                    className="h-8 text-xs min-w-0 flex-1"
                  />
                  <Button type="submit" variant="glass" size="sm" className="h-8 gap-1 px-3 text-xs shrink-0">
                    <Plus className="w-3.5 h-3.5" /> Save
                  </Button>
                </div>
              </form>
            </div>

            <div className="flex flex-1 flex-col min-h-0 gap-1.5 overflow-hidden">
              <span className="shrink-0 text-xs font-semibold text-white/80">Your Saved Playlists</span>
              {userPlaylists.length > 0 ? (
                <div className="flex flex-1 flex-col min-h-0 gap-1.5 overflow-y-auto pr-1">
                  {userPlaylists.map((p) => (
                    <div
                      key={p.id}
                      className="group flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-2 text-xs transition hover:bg-white/10 min-w-0 shrink-0"
                    >
                      <div
                        onClick={() => {
                          setPlaylistUrl(p.url);
                          launchStation(p.url);
                        }}
                        className="flex min-w-0 flex-1 flex-col overflow-hidden cursor-pointer"
                      >
                        <span className="font-semibold text-white/90 truncate block">{p.name}</span>
                        <span className="text-[10px] text-white/40 truncate block">{p.url}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="iconSm"
                          onClick={() => {
                            setPlaylistUrl(p.url);
                            launchStation(p.url);
                          }}
                          title="Play playlist"
                        >
                          <Play className="w-3 h-3 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="iconSm"
                          onClick={() => handleDeletePlaylist(p.id)}
                          title="Delete playlist"
                          className="hover:text-rose-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="shrink-0 rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-white/40">
                  No saved playlists yet. Label and save your favorite YouTube playlists above!
                </div>
              )}
            </div>

            <div className="shrink-0 flex items-center justify-between border-t border-white/10 pt-3 mt-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  chrome.runtime.sendMessage({ action: "FOCUS_MUSIC_TAB" })
                }
                className="gap-1.5"
              >
                <ExternalLink className="w-3 h-3" /> Focus Tab
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  chrome.runtime.sendMessage(
                    { action: "RECONNECT_MUSIC_TAB" },
                    fetchStatus
                  )
                }
                className="gap-1.5"
              >
                <RefreshCw className="w-3 h-3" /> Reconnect
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
