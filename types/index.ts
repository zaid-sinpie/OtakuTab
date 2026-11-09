export type PersonaType = "gamer" | "trader" | "corporate" | "otaku";

export interface WidgetSettings {
  showMusic: boolean;
  showWidgets: boolean;
  showWeather: boolean;
  showSearch: boolean;
  showShortcuts: boolean;
  showParticles: boolean;
}

export interface MusicStatus {
  connected: boolean;
  isPlaying: boolean;
  title: string;
  channel: string;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  thumbnail: string;
  url?: string;
  tabId?: number;
}

export type MediaCommand =
  | "PLAY"
  | "PAUSE"
  | "NEXT_TRACK"
  | "PREV_TRACK"
  | "SEEK"
  | "SET_VOLUME"
  | "MUTE"
  | "UNMUTE"
  | "TOGGLE_MUTE";

export interface TodoItem {
  id: number;
  text: string;
  done: boolean;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
}

export interface WeatherData {
  temp: number;
  condition: string;
  code: number;
  city: string;
}
