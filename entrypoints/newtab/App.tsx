import React, { useState, useEffect } from "react";
import {
  Gamepad2,
  TrendingUp,
  Briefcase,
  Flower2,
  Sliders,
} from "lucide-react";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { SearchOmnibox } from "@/components/widgets/SearchOmnibox";
import { ClockWidget } from "@/components/widgets/ClockWidget";
import { MusicWidget } from "@/components/widgets/MusicWidget";
import { BookmarksWidget } from "@/components/widgets/BookmarksWidget";
import { ParticlesCanvas } from "@/components/widgets/ParticlesCanvas";
import { CustomizerDrawer } from "@/components/widgets/CustomizerDrawer";
import { GamerWidgets } from "@/components/widgets/GamerWidgets";
import { TraderWidgets } from "@/components/widgets/TraderWidgets";
import { CorporateWidgets } from "@/components/widgets/CorporateWidgets";
import { OtakuWidgets } from "@/components/widgets/OtakuWidgets";
import { PersonaType, WidgetSettings } from "@/types";

export const App: React.FC = () => {
  const [activePersona, setActivePersona] = useState<PersonaType>("otaku");
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>({
    showMusic: true,
    showWidgets: true,
    showWeather: true,
    showSearch: true,
    showShortcuts: true,
    showParticles: true,
  });
  const [wallpaper, setWallpaper] = useState<string>("");
  const [particleColor, setParticleColor] = useState<string>("rgba(255, 255, 255, 0.4)");
  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);

  useEffect(() => {
    chrome.storage.local.get(
      ["activePersona", "widgetSettings", "wallpaper", "particleColor"],
      (res) => {
        if (res.activePersona) setActivePersona(res.activePersona);
        if (res.widgetSettings) {
          setWidgetSettings((prev) => ({ ...prev, ...res.widgetSettings }));
        }
        if (res.wallpaper) setWallpaper(res.wallpaper);
        if (res.particleColor) setParticleColor(res.particleColor);
      }
    );

    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === "local") {
        if (changes.activePersona) {
          setActivePersona(changes.activePersona.newValue);
        }
        if (changes.widgetSettings) {
          setWidgetSettings((prev) => ({
            ...prev,
            ...changes.widgetSettings.newValue,
          }));
        }
        if (changes.wallpaper) {
          setWallpaper(changes.wallpaper.newValue || "");
        }
        if (changes.particleColor) {
          setParticleColor(changes.particleColor.newValue);
        }
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  const handleSelectPersona = (p: PersonaType) => {
    setActivePersona(p);
    chrome.storage.local.set({ activePersona: p });
  };

  const handleParticleColorChange = (color: string) => {
    setParticleColor(color);
    chrome.storage.local.set({ particleColor: color });
  };

  const personaClass = `persona-${activePersona}`;

  const defaultWallpaper =
    "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&q=80";

  return (
    <div
      className={`relative min-h-screen w-full flex flex-col justify-between p-6 sm:p-8 bg-cover bg-center bg-no-repeat transition-all duration-500 ${personaClass}`}
      style={{
        backgroundImage: `url(${wallpaper || defaultWallpaper})`,
      }}
    >
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {widgetSettings.showParticles && <ParticlesCanvas color={particleColor} />}

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {widgetSettings.showWeather && <WeatherWidget />}
        </div>

        {widgetSettings.showSearch && (
          <div className="flex-1 flex justify-center max-w-xl mx-auto">
            <SearchOmnibox />
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-2xl border border-white/15 bg-black/25 p-1 backdrop-blur-md shadow-lg">
            <button
              onClick={() => handleSelectPersona("gamer")}
              title="Gamer HUD"
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                activePersona === "gamer"
                  ? "bg-cyan-500/30 text-cyan-300 shadow"
                  : "text-white/50 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleSelectPersona("trader")}
              title="Trader Terminal"
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                activePersona === "trader"
                  ? "bg-emerald-500/30 text-emerald-300 shadow"
                  : "text-white/50 hover:bg-white/10 hover:text-white"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleSelectPersona("corporate")}
              title="Corporate Focus"
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                activePersona === "corporate"
                  ? "bg-blue-500/30 text-blue-300 shadow"
                  : "text-white/50 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Briefcase className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleSelectPersona("otaku")}
              title="Otaku Zen"
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                activePersona === "otaku"
                  ? "bg-pink-500/30 text-pink-300 shadow"
                  : "text-white/50 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Flower2 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsCustomizerOpen(true)}
            className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black/25 px-3.5 py-2 text-xs font-semibold text-white/90 backdrop-blur-md shadow-lg hover:bg-black/35 hover:border-white/25 transition active:scale-95"
          >
            <Sliders className="w-3.5 h-3.5 text-primary" />
            <span>Customize</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 my-auto py-8">
        <section className="lg:col-span-5 flex flex-col gap-6 justify-center">
          {widgetSettings.showMusic && <MusicWidget x={1} y={1} />}
          {widgetSettings.showShortcuts && <BookmarksWidget x={1} y={2} />}
        </section>

        <section className="lg:col-span-7 flex flex-col gap-6 justify-center">
          <ClockWidget x={1} y={1} />

          {widgetSettings.showWidgets && (
            <div className="w-full">
              {activePersona === "gamer" && <GamerWidgets />}
              {activePersona === "trader" && <TraderWidgets />}
              {activePersona === "corporate" && <CorporateWidgets />}
              {activePersona === "otaku" && <OtakuWidgets />}
            </div>
          )}
        </section>
      </main>

      <footer className="relative z-10 flex items-center justify-between text-[11px] text-white/30 pt-4">
        <span>Otaku Tab v1.2</span>
        <span className="font-orbitron tracking-widest uppercase">
          Aesthetic Studio &amp; Lo-Fi Terminal
        </span>
      </footer>

      <CustomizerDrawer
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        activePersona={activePersona}
        onSelectPersona={handleSelectPersona}
        particleColor={particleColor}
        onParticleColorChange={handleParticleColorChange}
        onWallpaperChange={setWallpaper}
      />
    </div>
  );
};
