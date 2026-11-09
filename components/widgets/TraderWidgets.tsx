import React, { useState, useEffect, useCallback } from "react";
import { TrendingUp, RefreshCw, DollarSign, Globe } from "lucide-react";
import { WidgetWrapper } from "./WidgetWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface TickerData {
  symbol: string;
  price: number;
  change: number;
}

export const TraderWidgets: React.FC = () => {
  const [tickers, setTickers] = useState<TickerData[]>([
    { symbol: "BTC", price: 94250, change: 3.45 },
    { symbol: "ETH", price: 3420.5, change: 2.18 },
    { symbol: "SOL", price: 188.75, change: -0.82 },
    { symbol: "BNB", price: 645.2, change: 1.12 },
  ]);
  const [isFetching, setIsFetching] = useState(false);
  const [convertAmount, setConvertAmount] = useState<number>(1);
  const [convertSymbol, setConvertSymbol] = useState<string>("BTC");

  const fetchPrices = useCallback(() => {
    setIsFetching(true);
    fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT"]')
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        const updated = data.map((item: { symbol: string; lastPrice: string; priceChangePercent: string }) => ({
          symbol: item.symbol.replace("USDT", ""),
          price: parseFloat(item.lastPrice),
          change: parseFloat(item.priceChangePercent),
        }));
        setTickers(updated);
      })
      .catch(() => {
        setTickers((prev) =>
          prev.map((t) => ({
            ...t,
            price: t.price * (1 + (Math.random() - 0.48) * 0.005),
          }))
        );
      })
      .finally(() => {
        setIsFetching(false);
      });
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const getMarketStatus = () => {
    const now = new Date();
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
    const utcDay = now.getUTCDay();
    const isWeekend = utcDay === 0 || utcDay === 6;

    return {
      nyse: !isWeekend && utcHours >= 14.5 && utcHours < 21.0,
      lse: !isWeekend && utcHours >= 8.0 && utcHours < 16.5,
      tse: !isWeekend && utcHours >= 0.0 && utcHours < 6.0,
    };
  };

  const marketClocks = getMarketStatus();

  const selectedTicker = tickers.find((t) => t.symbol === convertSymbol);
  const convertedTotal = (convertAmount * (selectedTicker?.price || 1)).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <WidgetWrapper
        x={1}
        y={1}
        w={2}
        title="Crypto Terminal"
        icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
        badge={<Badge variant="outline">24H TICKERS</Badge>}
        headerRight={
          <Button
            variant="ghost"
            size="iconSm"
            onClick={fetchPrices}
            disabled={isFetching}
          >
            <RefreshCw className={`w-3 h-3 text-white/70 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-1">
          {tickers.map((t) => {
            const isUp = t.change >= 0;
            return (
              <div
                key={t.symbol}
                className="flex flex-col rounded-xl border border-white/5 bg-white/5 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white/80">{t.symbol} / USD</span>
                  <span className={`text-[10px] font-semibold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                    {isUp ? "+" : ""}{t.change.toFixed(2)}%
                  </span>
                </div>
                <span className="font-orbitron text-base font-bold text-white mt-1.5">
                  ${t.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            );
          })}
        </div>
      </WidgetWrapper>

      <WidgetWrapper
        x={1}
        y={2}
        title="Market Clocks"
        icon={<Globe className="w-3.5 h-3.5 text-sky-400" />}
      >
        <div className="flex flex-col gap-2 py-1">
          <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
            <span className="text-xs font-medium text-white/80">NEW YORK (NYSE)</span>
            <Badge variant={marketClocks.nyse ? "success" : "outline"}>
              {marketClocks.nyse ? "OPEN" : "CLOSED"}
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
            <span className="text-xs font-medium text-white/80">LONDON (LSE)</span>
            <Badge variant={marketClocks.lse ? "success" : "outline"}>
              {marketClocks.lse ? "OPEN" : "CLOSED"}
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
            <span className="text-xs font-medium text-white/80">TOKYO (TSE)</span>
            <Badge variant={marketClocks.tse ? "success" : "outline"}>
              {marketClocks.tse ? "OPEN" : "CLOSED"}
            </Badge>
          </div>
        </div>
      </WidgetWrapper>

      <WidgetWrapper
        x={2}
        y={2}
        title="Instant Converter"
        icon={<DollarSign className="w-3.5 h-3.5 text-amber-400" />}
      >
        <div className="flex flex-col gap-3 py-1">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              step="any"
              value={convertAmount}
              onChange={(e) => setConvertAmount(parseFloat(e.target.value) || 0)}
              className="h-8 text-xs font-semibold"
            />
            <select
              value={convertSymbol}
              onChange={(e) => setConvertSymbol(e.target.value)}
              aria-label="Crypto conversion currency"
              className="h-8 rounded-lg border border-white/15 bg-black/40 px-2 text-xs font-bold text-white focus:outline-none"
            >
              {tickers.map((t) => (
                <option key={t.symbol} value={t.symbol} className="bg-slate-900 text-white">
                  {t.symbol}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
            <span className="text-xs text-white/60">Estimated USD</span>
            <span className="font-orbitron text-sm font-bold text-amber-300">
              {convertedTotal}
            </span>
          </div>
        </div>
      </WidgetWrapper>
    </div>
  );
};
