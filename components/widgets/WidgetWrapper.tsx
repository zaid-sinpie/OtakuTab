import * as React from "react";
import { GripVertical, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWidgetContext, WidgetRect } from "./WidgetContext";

export interface WidgetWrapperProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  id?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  headerRight?: React.ReactNode;
  noHeader?: boolean;
}

export const WidgetWrapper = React.forwardRef<HTMLDivElement, WidgetWrapperProps>(
  (
    {
      id,
      x = 32,
      y = 100,
      w,
      h,
      title,
      icon,
      badge,
      headerRight,
      noHeader = false,
      className,
      style,
      children,
      ...props
    },
    forwardedRef
  ) => {
    let context: ReturnType<typeof useWidgetContext> | null = null;
    try {
      context = useWidgetContext();
    } catch {}

    const internalRef = React.useRef<HTMLDivElement>(null);
    const elementRef = (forwardedRef as React.RefObject<HTMLDivElement>) || internalRef;

    const [isDraggingLocal, setIsDraggingLocal] = React.useState(false);
    const [dragPos, setDragPos] = React.useState<{ x: number; y: number } | null>(null);
    const [hasConflict, setHasConflict] = React.useState(false);

    const initialPos = React.useMemo(() => ({ x, y }), [x, y]);

    React.useEffect(() => {
      if (!id || !context) return;
      const el = elementRef.current;
      if (!el) return;

      const rect: WidgetRect = {
        x: context.positions[id]?.x ?? x,
        y: context.positions[id]?.y ?? y,
        w: el.offsetWidth || 360,
        h: el.offsetHeight || 200,
      };

      context.registerWidget(id, initialPos, rect);

      return () => {
        context?.unregisterWidget(id);
      };
    }, [id, context, x, y, initialPos]);

    React.useEffect(() => {
      if (!id || !context) return;
      const el = elementRef.current;
      if (!el) return;

      const currentPos = context.positions[id] || initialPos;
      context.updateWidgetRect(id, {
        x: currentPos.x,
        y: currentPos.y,
        w: el.offsetWidth || 360,
        h: el.offsetHeight || 200,
      });
    }, [id, context, initialPos, context?.positions[id || ""]?.x, context?.positions[id || ""]?.y]);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!id || !context) return;
      const target = e.target as HTMLElement;
      if (target.closest('button, input, select, textarea, a, [role="slider"], [role="button"]')) {
        return;
      }

      const el = elementRef.current;
      if (!el) return;

      e.preventDefault();

      const startX = e.clientX;
      const startY = e.clientY;
      const cur = context.positions[id] || initialPos;
      const originX = cur.x;
      const originY = cur.y;
      const width = el.offsetWidth;
      const height = el.offsetHeight;

      setIsDraggingLocal(true);
      context.setIsDragging(true);
      setDragPos({ x: originX, y: originY });

      let latestX = originX;
      let latestY = originY;
      let latestConflict = false;

      const onPointerMove = (moveEvt: PointerEvent) => {
        const deltaX = moveEvt.clientX - startX;
        const deltaY = moveEvt.clientY - startY;

        const minX = 16;
        const maxX = Math.max(minX, window.innerWidth - width - 16);
        const minY = 80;
        const maxY = Math.max(minY, window.innerHeight - height - 16);

        const clampedX = Math.min(Math.max(originX + deltaX, minX), maxX);
        const clampedY = Math.min(Math.max(originY + deltaY, minY), maxY);

        latestX = clampedX;
        latestY = clampedY;

        const candidateRect: WidgetRect = {
          x: clampedX,
          y: clampedY,
          w: width,
          h: height,
        };

        const conflict = context?.checkCollision(id, candidateRect) ?? false;
        latestConflict = conflict;
        setHasConflict(conflict);
        setDragPos({ x: clampedX, y: clampedY });
      };

      const onPointerUp = () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);

        setIsDraggingLocal(false);
        context?.setIsDragging(false);
        setDragPos(null);

        if (!latestConflict && context) {
          context.savePosition(id, { x: latestX, y: latestY });
          context.updateWidgetRect(id, {
            x: latestX,
            y: latestY,
            w: width,
            h: height,
          });
        }
        setHasConflict(false);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    };

    if (id && context) {
      const activePos = dragPos || context.positions[id] || initialPos;

      const dynamicStyle: React.CSSProperties = {
        position: "fixed",
        left: `${activePos.x}px`,
        top: `${activePos.y}px`,
        zIndex: isDraggingLocal ? 50 : 20,
        ...style,
      };

      return (
        <div
          ref={elementRef}
          style={dynamicStyle}
          className={cn(
            "group relative flex flex-col rounded-2xl border bg-black/25 p-4 text-white backdrop-blur-md transition-shadow select-none",
            isDraggingLocal
              ? hasConflict
                ? "border-rose-500/80 bg-rose-950/30 ring-2 ring-rose-500/80 shadow-2xl scale-[1.01]"
                : "border-primary/80 ring-2 ring-primary/60 shadow-2xl scale-[1.01]"
              : "border-white/15 shadow-xl hover:border-white/25 hover:bg-black/30",
            className
          )}
          {...props}
        >
          {hasConflict && isDraggingLocal && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-rose-600/90 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-lg animate-bounce">
              <AlertCircle className="w-3 h-3" /> Overlap Not Allowed
            </div>
          )}

          {!noHeader && (title || icon || badge || headerRight) && (
            <div
              onPointerDown={handlePointerDown}
              className="mb-3 flex items-center justify-between border-b border-white/10 pb-2.5 cursor-grab active:cursor-grabbing"
              title="Drag to relocate"
            >
              <div className="flex items-center gap-2">
                <span className="text-white/30 group-hover:text-white/60 transition">
                  <GripVertical className="w-3.5 h-3.5" />
                </span>
                {icon && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-white/90">
                    {icon}
                  </span>
                )}
                {title && (
                  <h3 className="font-orbitron text-xs font-semibold tracking-wider text-white/90 uppercase">
                    {title}
                  </h3>
                )}
              </div>

              <div className="flex items-center gap-2">
                {badge}
                {headerRight}
              </div>
            </div>
          )}

          {noHeader && (
            <div
              onPointerDown={handlePointerDown}
              className="absolute top-2 right-2 p-1 text-white/30 hover:text-white/80 cursor-grab active:cursor-grabbing rounded-lg hover:bg-white/10 transition z-10"
              title="Drag to relocate"
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}

          <div className="flex-1">{children}</div>
        </div>
      );
    }

    const gridStyle: React.CSSProperties = {
      ...(x !== undefined && { gridColumn: `${x} / span ${w || 1}` }),
      ...(y !== undefined && { gridRow: `${y} / span ${h || 1}` }),
      ...style,
    };

    return (
      <div
        ref={elementRef}
        style={gridStyle}
        className={cn(
          "group relative flex flex-col rounded-2xl border border-white/15 bg-black/25 p-4 text-white shadow-xl backdrop-blur-md transition-all duration-300 hover:border-white/25 hover:bg-black/30 hover:shadow-2xl",
          className
        )}
        {...props}
      >
        {!noHeader && (title || icon || badge || headerRight) && (
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              {icon && (
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-white/90">
                  {icon}
                </span>
              )}
              {title && (
                <h3 className="font-orbitron text-xs font-semibold tracking-wider text-white/90 uppercase">
                  {title}
                </h3>
              )}
            </div>

            <div className="flex items-center gap-2">
              {badge}
              {headerRight}
            </div>
          </div>
        )}

        <div className="flex-1">{children}</div>
      </div>
    );
  }
);

WidgetWrapper.displayName = "WidgetWrapper";
