import React, { useState, useEffect } from "react";
import { WidgetWrapper } from "./WidgetWrapper";

export const ClockWidget: React.FC<{ id?: string; x?: number; y?: number }> = ({ id, x, y }) => {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [weekDay, setWeekDay] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const newTime = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const newDate = String(now.getDate()).padStart(2, "0");
      const newWeekDay = now.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();

      setTime((prev) => (prev !== newTime ? newTime : prev));
      setDate((prev) => (prev !== newDate ? newDate : prev));
      setWeekDay((prev) => (prev !== newWeekDay ? newWeekDay : prev));
    };

    updateTime();
    const timer = setInterval(() => {
      if (!document.hidden) {
        updateTime();
      }
    }, 10000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateTime();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <WidgetWrapper id={id} x={x} y={y} noHeader className="w-fit text-center py-4 px-6 min-w-[200px]">
      <div className="font-orbitron text-5xl sm:text-6xl font-black tracking-tight text-white drop-shadow-md">
        {time}
      </div>
      <div className="mt-2 flex items-center justify-center gap-3">
        <span className="font-orbitron text-lg font-bold text-primary">
          {date}
        </span>
        <span className="h-3 w-px bg-white/20" />
        <span className="text-xs font-semibold tracking-widest text-white/70">
          {weekDay}
        </span>
      </div>
    </WidgetWrapper>
  );
};
