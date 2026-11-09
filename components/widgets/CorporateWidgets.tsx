import React, { useState, useEffect, useRef } from "react";
import { Briefcase, CheckSquare, FileText, Play, Pause, Coffee, RotateCcw, Plus, Trash2 } from "lucide-react";
import { WidgetWrapper } from "./WidgetWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TodoItem } from "@/types";

export const CorporateWidgets: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"focus" | "break">("focus");

  const [todos, setTodos] = useState<TodoItem[]>([
    { id: 1, text: "Review sprint deliverables", done: false },
    { id: 2, text: "Sync design tokens", done: true },
  ]);
  const [newTodo, setNewTodo] = useState("");
  const [notes, setNotes] = useState("");
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    chrome.storage.local.get(["corporateTodos", "scratchpadNotes"], (res) => {
      if (Array.isArray(res.corporateTodos)) setTodos(res.corporateTodos);
      if (typeof res.scratchpadNotes === "string") setNotes(res.scratchpadNotes);
    });
  }, []);

  const saveTodosToStorage = (updated: TodoItem[]) => {
    setTodos(updated);
    chrome.storage.local.set({ corporateTodos: updated });
  };

  const playChime = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880.0, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch {}
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRunning) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            playChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTodo.trim();
    if (!trimmed) return;
    const item: TodoItem = { id: Date.now(), text: trimmed, done: false };
    saveTodosToStorage([...todos, item]);
    setNewTodo("");
  };

  const toggleTodo = (id: number) => {
    saveTodosToStorage(
      todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const deleteTodo = (id: number) => {
    saveTodosToStorage(todos.filter((t) => t.id !== id));
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNotes(text);
    chrome.storage.local.set({ scratchpadNotes: text });
  };

  const completedCount = todos.filter((t) => t.done).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <WidgetWrapper
        x={1}
        y={1}
        title="Pomodoro Focus"
        icon={<Briefcase className="w-3.5 h-3.5 text-blue-400" />}
        badge={
          <Badge variant={mode === "focus" ? "default" : "secondary"}>
            {mode === "focus" ? "FOCUS 25M" : "BREAK 5M"}
          </Badge>
        }
      >
        <div className="flex flex-col items-center py-2">
          <div className="font-orbitron text-4xl font-extrabold tracking-wider text-blue-300">
            {formatTimer(timeLeft)}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button
              variant={isRunning ? "destructive" : "glass"}
              size="sm"
              onClick={() => setIsRunning((prev) => !prev)}
              className="gap-1.5"
            >
              {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isRunning ? "Pause" : "Start"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsRunning(false);
                setMode("break");
                setTimeLeft(5 * 60);
              }}
              className="gap-1.5"
            >
              <Coffee className="w-3 h-3" /> Break
            </Button>
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => {
                setIsRunning(false);
                setMode("focus");
                setTimeLeft(25 * 60);
              }}
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </WidgetWrapper>

      <WidgetWrapper
        x={2}
        y={1}
        title="Daily Objectives"
        icon={<CheckSquare className="w-3.5 h-3.5 text-teal-400" />}
        badge={<Badge variant="outline">{completedCount}/{todos.length}</Badge>}
      >
        <div className="flex flex-col gap-2 py-1 max-h-[160px]">
          <form onSubmit={handleAddTodo} className="flex gap-2">
            <Input
              type="text"
              placeholder="Add task and press Enter..."
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              className="h-8 text-xs"
            />
            <Button type="submit" size="iconSm" variant="glass">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </form>

          <div className="flex flex-col gap-1.5 overflow-y-auto pr-1">
            {todos.map((t) => (
              <div
                key={t.id}
                className="group flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-2.5 py-1.5 text-xs transition hover:bg-white/10"
              >
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => toggleTodo(t.id)}
                    className="rounded border-white/20 bg-white/10 text-teal-500 focus:ring-0"
                  />
                  <span className={t.done ? "line-through text-white/40" : "text-white/90"}>
                    {t.text}
                  </span>
                </label>
                <button
                  onClick={() => deleteTodo(t.id)}
                  className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </WidgetWrapper>

      <WidgetWrapper
        x={1}
        y={2}
        w={2}
        title="Quick Scratchpad"
        icon={<FileText className="w-3.5 h-3.5 text-indigo-400" />}
        badge={<Badge variant="outline">AUTO-SAVING</Badge>}
      >
        <textarea
          value={notes}
          onChange={handleNotesChange}
          placeholder="Jot down quick thoughts, ideas, or meeting notes..."
          className="w-full h-24 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
        />
      </WidgetWrapper>
    </div>
  );
};
