import React, { useState, useEffect } from "react";
import {
  Gamepad2,
  TrendingUp,
  Briefcase,
  Flower2,
  Sliders,
} from "lucide-react";
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
import { WidgetWrapper } from "@/components/widgets/WidgetWrapper";
import { WidgetProvider, useWidgetContext } from "@/components/widgets/WidgetContext";
import { PersonaType, WidgetSettings } from "@/types";

const AppContent: React.FC = () => {
  const { resetPositions } = useWidgetContext();
  const [activePersona, setActivePersona] = useState<PersonaType>("otaku");
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>({
    showMusic: true,
    showWidgets: true,
    showSearch: true,
    showShortcuts: true,
    showParticles: true,
  });
  const [wallpaper, setWallpaper] = useState<string>("");
  const [particleColor, setParticleColor] = useState<string>("rgba(255, 255, 255, 0.4)");
  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);
  const [defaultRightX, setDefaultRightX] = useState<number>(() =>
    typeof window !== "undefined" ? Math.max(440, window.innerWidth - 740) : 880
  );

  useEffect(() => {
    const handleResize = () => {
      setDefaultRightX(Math.max(440, window.innerWidth - 740));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  return (
    <div
      className={`relative min-h-screen w-full flex flex-col justify-between p-6 sm:p-8 bg-cover bg-center bg-no-repeat transition-all duration-500 ${personaClass}`}
      style={{
        backgroundColor: "#0a0e17",
        backgroundImage: wallpaper ? `url(${wallpaper})` : undefined,
      }}
    >
      {wallpaper && <div className="absolute inset-0 bg-black/20 pointer-events-none" />}

      {widgetSettings.showParticles && <ParticlesCanvas color={particleColor} />}

      <header className="relative z-30 flex items-center justify-between min-h-[48px]">
        {widgetSettings.showSearch && (
          <div className="absolute left-1/2 -translate-x-1/2 flex justify-center w-full max-w-md px-4 pointer-events-auto">
            <SearchOmnibox />
          </div>
        )}

        <div className="flex items-center gap-3 ml-auto">
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

      <main className="relative z-10 flex-1 w-full min-h-[calc(100vh-140px)]">
        {widgetSettings.showMusic && (
          <MusicWidget id="music" x={36} y={100} />
        )}

        {widgetSettings.showShortcuts && (
          <BookmarksWidget id="shortcuts" x={36} y={450} />
        )}

        <ClockWidget id="clock" x={defaultRightX} y={100} />

        {widgetSettings.showWidgets && (
          <WidgetWrapper
            id="dashboard"
            x={defaultRightX}
            y={260}
            noHeader
            className="w-[660px] xl:w-[700px] max-w-[calc(100vw-48px)]"
          >
            {activePersona === "gamer" && <GamerWidgets />}
            {activePersona === "trader" && <TraderWidgets />}
            {activePersona === "corporate" && <CorporateWidgets />}
            {activePersona === "otaku" && <OtakuWidgets />}
          </WidgetWrapper>
        )}
      </main>

      <footer className="fixed bottom-3 left-6 right-6 z-10 flex items-center justify-between text-[11px] text-white/30 pointer-events-none">
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
        onResetLayout={resetPositions}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <WidgetProvider>
      <AppContent />
    </WidgetProvider>
  );
};
