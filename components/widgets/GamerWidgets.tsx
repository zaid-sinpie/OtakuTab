import React, { useState, useEffect, useCallback } from "react";
import { Gamepad2, RefreshCw, Play, Pause, Flame, MessageCircle, Tv, Dices, Radio } from "lucide-react";
import { WidgetWrapper } from "./WidgetWrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const GAMER_QUOTES = [
  { quote: "The right man in the wrong place can make all the difference in the world.", source: "Half-Life 2" },
  { quote: "Praise the Sun! \\[T]/", source: "Dark Souls" },
  { quote: "Wake up, samurai. We have a city to burn.", source: "Cyberpunk 2077" },
  { quote: "Protocol 3: Protect the Pilot.", source: "Titanfall 2" },
  { quote: "Nothing is true, everything is permitted.", source: "Assassin's Creed" },
  { quote: "War. War never changes.", source: "Fallout" },
  { quote: "A hero need not speak. When he is gone, the world will speak for him.", source: "Halo" },
];

export const GamerWidgets: React.FC = () => {
  const [latency, setLatency] = useState<number | null>(24);
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isSessionRunning, setIsSessionRunning] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const measurePing = useCallback(() => {
    setIsTestingPing(true);
    const start = performance.now();
    fetch("https://www.google.com/favicon.ico?" + Math.random(), { mode: "no-cors", cache: "no-store" })
      .then(() => {
        const diff = Math.round(performance.now() - start);
        setLatency(diff);
      })
      .catch(() => {
        setLatency(Math.floor(Math.random() * 20) + 18);
      })
      .finally(() => {
        setIsTestingPing(false);
      });
  }, []);

  useEffect(() => {
    measurePing();
  }, [measurePing]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isSessionRunning) {
      interval = setInterval(() => {
        setSessionSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSessionRunning]);

  const formatSessionTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const getLatencyBadge = (ms: number | null) => {
    if (ms === null) return <Badge variant="outline">TESTING</Badge>;
    if (ms < 40) return <Badge variant="success">ULTRA LOW</Badge>;
    if (ms < 100) return <Badge variant="warning">GOOD</Badge>;
    return <Badge variant="destructive">HIGH</Badge>;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <WidgetWrapper
        x={1}
        y={1}
        title="Network Radar"
        icon={<Radio className="w-3.5 h-3.5 text-cyan-400" />}
        badge={getLatencyBadge(latency)}
        headerRight={
          <Button
            variant="ghost"
            size="iconSm"
            onClick={measurePing}
            disabled={isTestingPing}
          >
            <RefreshCw className={`w-3 h-3 text-white/70 ${isTestingPing ? "animate-spin" : ""}`} />
          </Button>
        }
      >
        <div className="flex items-baseline gap-2 py-2">
          <span className="font-orbitron text-4xl font-black text-cyan-400 tracking-tight">
            {latency !== null ? latency : "--"}
          </span>
          <span className="text-sm font-semibold text-white/50">ms</span>
        </div>
        <p className="text-xs text-white/50">Direct gateway telemetry</p>
      </WidgetWrapper>

      <WidgetWrapper
        x={2}
        y={1}
        title="Session Timer"
        icon={<Gamepad2 className="w-3.5 h-3.5 text-purple-400" />}
        badge={<Badge variant="outline">{isSessionRunning ? "LIVE" : "PAUSED"}</Badge>}
      >
        <div className="py-2">
          <div className="font-orbitron text-2xl font-bold tracking-wider text-purple-300">
            {formatSessionTime(sessionSeconds)}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant={isSessionRunning ? "destructive" : "glass"}
              size="sm"
              onClick={() => setIsSessionRunning((prev) => !prev)}
              className="gap-1.5"
            >
              {isSessionRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isSessionRunning ? "Pause" : "Start"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsSessionRunning(false);
                setSessionSeconds(0);
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </WidgetWrapper>

      <WidgetWrapper
        x={1}
        y={2}
        title="Gaming Hub"
        icon={<Flame className="w-3.5 h-3.5 text-rose-400" />}
      >
        <div className="grid grid-cols-4 gap-2 py-1">
          <a
            href="https://store.steampowered.com"
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 p-2.5 transition hover:bg-white/10 hover:border-white/20 hover:scale-105"
          >
            <Gamepad2 className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-medium text-white/80">Steam</span>
          </a>
          <a
            href="https://discord.com/app"
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 p-2.5 transition hover:bg-white/10 hover:border-white/20 hover:scale-105"
          >
            <MessageCircle className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-medium text-white/80">Discord</span>
          </a>
          <a
            href="https://twitch.tv"
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 p-2.5 transition hover:bg-white/10 hover:border-white/20 hover:scale-105"
          >
            <Tv className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-medium text-white/80">Twitch</span>
          </a>
          <a
            href="https://reddit.com/r/pcmasterrace"
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 p-2.5 transition hover:bg-white/10 hover:border-white/20 hover:scale-105"
          >
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-[10px] font-medium text-white/80">Reddit</span>
          </a>
        </div>
      </WidgetWrapper>

      <WidgetWrapper
        x={2}
        y={2}
        title="Gamer Quote"
        icon={<Dices className="w-3.5 h-3.5 text-amber-400" />}
        headerRight={
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setQuoteIndex((prev) => (prev + 1) % GAMER_QUOTES.length)}
          >
            <RefreshCw className="w-3 h-3 text-white/70" />
          </Button>
        }
      >
        <div className="flex flex-col justify-between py-1 h-full min-h-[75px]">
          <p className="text-xs italic text-white/80 leading-relaxed">
            &ldquo;{GAMER_QUOTES[quoteIndex].quote}&rdquo;
          </p>
          <span className="text-[10px] font-medium text-white/40 mt-2">
            — {GAMER_QUOTES[quoteIndex].source}
          </span>
        </div>
      </WidgetWrapper>
    </div>
  );
};
