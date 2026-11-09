import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

export interface WidgetRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface WidgetContextType {
  positions: Record<string, { x: number; y: number }>;
  registerWidget: (id: string, defaultPos: { x: number; y: number }, rect: WidgetRect) => void;
  unregisterWidget: (id: string) => void;
  updateWidgetRect: (id: string, rect: WidgetRect) => void;
  checkCollision: (id: string, candidate: WidgetRect) => boolean;
  savePosition: (id: string, pos: { x: number; y: number }) => void;
  resetPositions: () => void;
  isDragging: boolean;
  setIsDragging: (val: boolean) => void;
}

const WidgetContext = createContext<WidgetContextType | null>(null);

export const useWidgetContext = () => {
  const ctx = useContext(WidgetContext);
  if (!ctx) {
    throw new Error("useWidgetContext must be used within a WidgetProvider");
  }
  return ctx;
};

export const WidgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [isDragging, setIsDragging] = useState(false);
  const rectsRef = useRef<Map<string, WidgetRect>>(new Map());
  const defaultsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    chrome.storage.local.get("widgetPositions", (res) => {
      if (res.widgetPositions && typeof res.widgetPositions === "object") {
        setPositions(res.widgetPositions);
      }
    });
  }, []);

  const registerWidget = useCallback(
    (id: string, defaultPos: { x: number; y: number }, rect: WidgetRect) => {
      defaultsRef.current.set(id, defaultPos);
      rectsRef.current.set(id, rect);

      setPositions((prev) => {
        if (prev[id]) return prev;
        return {
          ...prev,
          [id]: defaultPos,
        };
      });
    },
    []
  );

  const unregisterWidget = useCallback((id: string) => {
    defaultsRef.current.delete(id);
    rectsRef.current.delete(id);
  }, []);

  const updateWidgetRect = useCallback((id: string, rect: WidgetRect) => {
    rectsRef.current.set(id, rect);
  }, []);

  const checkCollision = useCallback((id: string, candidate: WidgetRect): boolean => {
    const margin = 8;
    for (const [otherId, otherRect] of rectsRef.current.entries()) {
      if (otherId === id) continue;

      const collides =
        candidate.x < otherRect.x + otherRect.w + margin &&
        candidate.x + candidate.w + margin > otherRect.x &&
        candidate.y < otherRect.y + otherRect.h + margin &&
        candidate.y + candidate.h + margin > otherRect.y;

      if (collides) return true;
    }
    return false;
  }, []);

  const savePosition = useCallback((id: string, pos: { x: number; y: number }) => {
    setPositions((prev) => {
      const next = { ...prev, [id]: pos };
      chrome.storage.local.set({ widgetPositions: next });
      return next;
    });
  }, []);

  const resetPositions = useCallback(() => {
    const resetObj: Record<string, { x: number; y: number }> = {};
    for (const [id, def] of defaultsRef.current.entries()) {
      resetObj[id] = def;
    }
    setPositions(resetObj);
    chrome.storage.local.remove("widgetPositions");
  }, []);

  return (
    <WidgetContext.Provider
      value={{
        positions,
        registerWidget,
        unregisterWidget,
        updateWidgetRect,
        checkCollision,
        savePosition,
        resetPositions,
        isDragging,
        setIsDragging,
      }}
    >
      {children}
    </WidgetContext.Provider>
  );
};
