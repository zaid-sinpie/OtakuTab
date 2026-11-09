import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Settings, Disc, Radio, ExternalLink, RefreshCw } from "lucide-react";
import { WidgetWrapper } from "./WidgetWrapper";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MusicStatus } from "@/types";

const PRESET_PLAYLISTS = [
  { name: "Lofi Girl Study", url: "https://www.youtube.com/watch?v=jfKfPfyJRdk" },
  { name: "Synthwave Radio", url: "https://www.youtube.com/watch?v=4xDzrJKXOOY" },
  { name: "Epic Gaming OST", url: "https://www.youtube.com/watch?v=WPni755-Krg" },
  { name: "Piano & Rain Lofi", url: "https://www.youtube.com/watch?v=lTRiuFIWV54" },
];

export const MusicWidget: React.FC<{ x?: number; y?: number }> = ({ x, y }) => {
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
    chrome.storage.local.get("musicPlaylistUrl", (res) => {
      if (res.musicPlaylistUrl) setPlaylistUrl(res.musicPlaylistUrl);
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
      launchStation(playlistUrl || PRESET_PLAYLISTS[0].url);
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
    const url = urlToLaunch.trim() || PRESET_PLAYLISTS[0].url;
    chrome.storage.local.set({ musicPlaylistUrl: url });
    chrome.runtime.sendMessage(
      { action: "LAUNCH_PLAYLIST_TAB", url, mode: stationMode },
      () => {
        setIsSetupOpen(false);
        setTimeout(fetchStatus, 1500);
      }
    );
  };

  const formatSeconds = (sec: number) => {
    if (!sec || isNaN(sec)) return "0:00";
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPercent = status.duration > 0 ? (status.currentTime / status.duration) * 100 : 0;

  return (
    <>
      <WidgetWrapper
        x={x}
        y={y}
        title="Music Studio"
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
              <span className={`w-0.5 rounded-full bg-primary ${status.isPlaying ? "animate-eq-1" : "h-1"}`} />
              <span className={`w-0.5 rounded-full bg-primary ${status.isPlaying ? "animate-eq-2" : "h-1.5"}`} />
              <span className={`w-0.5 rounded-full bg-primary ${status.isPlaying ? "animate-eq-3" : "h-1"}`} />
              <span className={`w-0.5 rounded-full bg-primary ${status.isPlaying ? "animate-eq-4" : "h-2"}`} />
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
              <Button
                variant="ghost"
                size="iconSm"
                onClick={toggleMute}
              >
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>YouTube Music Station</DialogTitle>
            <DialogDescription>
              Control background or pinned YouTube music seamlessly.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex gap-2">
              <Input
                placeholder="YouTube playlist or video URL..."
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                className="text-xs"
              />
              <Button
                variant="glass"
                size="sm"
                onClick={() => launchStation(playlistUrl)}
              >
                Launch
              </Button>
            </div>

            <div className="flex items-center gap-4 text-xs">
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

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-white/70">
                Quick Preset Stations:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_PLAYLISTS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => {
                      setPlaylistUrl(p.url);
                      launchStation(p.url);
                    }}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2.5 text-left text-xs font-medium text-white/90 hover:bg-white/10 transition"
                  >
                    <span>{p.name}</span>
                    <Play className="w-3 h-3 text-primary" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => chrome.runtime.sendMessage({ action: "FOCUS_MUSIC_TAB" })}
                className="gap-1.5"
              >
                <ExternalLink className="w-3 h-3" /> Focus Tab
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => chrome.runtime.sendMessage({ action: "RECONNECT_MUSIC_TAB" }, fetchStatus)}
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
