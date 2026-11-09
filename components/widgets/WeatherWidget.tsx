import React, { useState, useEffect } from "react";
import { Sun, CloudSun, CloudFog, CloudRain, CloudSnow, CloudLightning } from "lucide-react";
import { WeatherData } from "@/types";

export const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData>({
    temp: 24,
    condition: "Clear Sky",
    code: 0,
    city: "Tokyo, JP",
  });

  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=35.6895&longitude=139.6917&current_weather=true")
      .then((res) => res.json())
      .then((data) => {
        if (!data || !data.current_weather) return;
        const temp = Math.round(data.current_weather.temperature);
        const code = data.current_weather.weathercode;

        let condition = "Pleasant";
        if (code === 0) condition = "Clear Sky";
        else if (code <= 3) condition = "Partly Cloudy";
        else if (code <= 48) condition = "Misty / Fog";
        else if (code <= 67) condition = "Rain Showers";
        else if (code <= 77) condition = "Snow Flurries";
        else if (code <= 99) condition = "Thunderstorm";

        setWeather({
          temp,
          condition,
          code,
          city: "Tokyo, JP",
        });
      })
      .catch(() => {});
  }, []);

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="w-5 h-5 text-amber-300" />;
    if (code <= 3) return <CloudSun className="w-5 h-5 text-amber-200" />;
    if (code <= 48) return <CloudFog className="w-5 h-5 text-slate-300" />;
    if (code <= 67) return <CloudRain className="w-5 h-5 text-blue-400" />;
    if (code <= 77) return <CloudSnow className="w-5 h-5 text-sky-200" />;
    if (code <= 99) return <CloudLightning className="w-5 h-5 text-yellow-400" />;
    return <Sun className="w-5 h-5 text-amber-300" />;
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/25 px-3.5 py-1.5 backdrop-blur-md shadow-lg">
      <div className="flex items-center gap-1.5">
        {getWeatherIcon(weather.code)}
        <span className="font-orbitron text-sm font-bold text-white">
          {weather.temp}°C
        </span>
      </div>
      <div className="flex flex-col text-left">
        <span className="text-[11px] font-semibold text-white/90 leading-tight">
          {weather.city}
        </span>
        <span className="text-[10px] text-white/50 leading-tight">
          {weather.condition}
        </span>
      </div>
    </div>
  );
};
