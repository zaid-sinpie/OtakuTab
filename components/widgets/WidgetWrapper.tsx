import * as React from "react";
import { cn } from "@/lib/utils";

export interface WidgetWrapperProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
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
      x,
      y,
      w = 1,
      h = 1,
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
    ref
  ) => {
    const gridStyle: React.CSSProperties = {
      ...(x !== undefined && { gridColumn: `${x} / span ${w}` }),
      ...(y !== undefined && { gridRow: `${y} / span ${h}` }),
      ...style,
    };

    return (
      <div
        ref={ref}
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
