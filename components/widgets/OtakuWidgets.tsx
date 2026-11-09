import React, { useState, useEffect, useRef } from "react";
import { CloudRain, Sparkles, Wind, Play, Pause, RefreshCw } from "lucide-react";
import { WidgetWrapper } from "./WidgetWrapper";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

const ANIME_QUOTES = [
  { quote: "Whatever you lose, you'll find it again. But what you throw away you'll never get back.", source: "Kenshin Himura" },
  { quote: "If you don't take risks, you can't create a future.", source: "Monkey D. Luffy" },
  { quote: "El Psy Kongroo. The timeline has shifted.", source: "Rintaro Okabe (Steins;Gate)" },
  { quote: "If you truly want to escape everyday life, you must constantly evolve.", source: "Durarara!!" },
  { quote: "Hard work is worthless for those that don't believe in themselves.", source: "Naruto Uzumaki" },
  { quote: "See you, space cowboy.", source: "Cowboy Bebop" },
];

export const OtakuWidgets: React.FC = () => {
  const [isRainPlaying, setIsRainPlaying] = useState(false);
  const [rainVolume, setRainVolume] = useState(0.3);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const rainNoiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const rainGainNodeRef = useRef<GainNode | null>(null);

  const startRain = (vol: number) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1000, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start();
      rainNoiseNodeRef.current = whiteNoise;
      rainGainNodeRef.current = gain;
    } catch {}
  };

  const stopRain = () => {
    if (rainNoiseNodeRef.current) {
      try {
        rainNoiseNodeRef.current.stop();
        rainNoiseNodeRef.current.disconnect();
      } catch {}
      rainNoiseNodeRef.current = null;
    }
  };

  const toggleRain = () => {
    if (isRainPlaying) {
      stopRain();
      setIsRainPlaying(false);
    } else {
      startRain(rainVolume);
      setIsRainPlaying(true);
    }
  };

  const handleVolumeChange = (vals: number[]) => {
    const val = vals[0];
    setRainVolume(val);
    if (rainGainNodeRef.current && audioCtxRef.current) {
      rainGainNodeRef.current.gain.setValueAtTime(val, audioCtxRef.current.currentTime);
    }
  };

  useEffect(() => {
    return () => {
      stopRain();
    };
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <WidgetWrapper
        x={1}
        y={1}
        title="Ambient Rain"
        icon={<CloudRain className="w-3.5 h-3.5 text-pink-400" />}
        badge={<Badge variant={isRainPlaying ? "default" : "outline"}>{isRainPlaying ? "ACTIVE" : "OFF"}</Badge>}
      >
        <div className="flex flex-col gap-3 py-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/70">Binaural lo-fi rain noise</span>
            <Button
              variant={isRainPlaying ? "destructive" : "glass"}
              size="sm"
              onClick={toggleRain}
              className="gap-1.5"
            >
              {isRainPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isRainPlaying ? "Stop" : "Play"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-white/50 w-8">VOL</span>
            <Slider
              value={[rainVolume]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={handleVolumeChange}
            />
          </div>
        </div>
      </WidgetWrapper>

      <WidgetWrapper
        x={2}
        y={1}
        title="Zen Breathing"
        icon={<Wind className="w-3.5 h-3.5 text-purple-300" />}
      >
        <div className="flex flex-col items-center justify-center py-1">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-pink-400/40 bg-pink-500/10 animate-breathe" />
            <div className="h-6 w-6 rounded-full bg-pink-400/60 shadow-lg shadow-pink-500/30" />
          </div>
          <span className="mt-2 text-[11px] font-medium text-pink-200/70">
            Breathe in... Breathe out...
          </span>
        </div>
      </WidgetWrapper>

      <WidgetWrapper
        x={1}
        y={2}
        w={2}
        title="Anime Quote"
        icon={<Sparkles className="w-3.5 h-3.5 text-amber-300" />}
        headerRight={
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setQuoteIndex((prev) => (prev + 1) % ANIME_QUOTES.length)}
          >
            <RefreshCw className="w-3 h-3 text-white/70" />
          </Button>
        }
      >
        <div className="flex flex-col justify-between py-1">
          <p className="text-xs italic text-pink-100/90 leading-relaxed font-light">
            &ldquo;{ANIME_QUOTES[quoteIndex].quote}&rdquo;
          </p>
          <span className="text-[10px] font-medium text-pink-300/60 mt-2 text-right">
            — {ANIME_QUOTES[quoteIndex].source}
          </span>
        </div>
      </WidgetWrapper>
    </div>
  );
};
