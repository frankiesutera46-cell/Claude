import React, { useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";

// ── Deterministic seeded random (same as seed_demo_data.py seed=42) ──
function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussRand(rng) {
  const u1 = rng(), u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function labelFor(score) {
  if (score < 25) return "Extreme Fear";
  if (score < 45) return "Fear";
  if (score < 55) return "Neutral";
  if (score < 75) return "Greed";
  return "Extreme Greed";
}

function directionFor(c) {
  if (c > 20) return "bullish";
  if (c < -20) return "bearish";
  return "neutral";
}

function generateDemoData() {
  const rng = mulberry32(42);
  const gauss = (mean, std) => mean + gaussRand(rng) * std;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const MARKETS = [
    "Will Bitcoin reach $75,000 by April 2026?",
    "Will Bitcoin exceed $80,000 by May 2026?",
    "Will Bitcoin drop below $60,000 by April 2026?",
    "Will Bitcoin hit $100,000 in 2026?",
  ];

  const now = Date.now();
  const predictions = [];
  const trades = [];
  let fg = 35, btc = 67000;

  for (let i = 0; i < 48; i++) {
    const ts = new Date(now - (47 - i) * 15 * 60000);
    fg = clamp(fg + gauss(0, 4), 5, 95);
    btc = clamp(btc + gauss(50, 400), 58000, 78000);
    const change24h = gauss(0.5, 2);
    const fgComp = (50 - fg) * 1.0;
    const momentum = gauss(5, 10);
    const composite = clamp(fgComp + momentum + change24h * 2, -100, 100);
    const confidence = +(0.55 + rng() * 0.3).toFixed(2);
    const direction = directionFor(composite);

    let tradesPlaced = 0;

    if (Math.abs(composite) > 20 && rng() > 0.3) {
      const mIdx = Math.floor(rng() * MARKETS.length);
      const question = MARKETS[mIdx];
      const isAbove = mIdx !== 2;

      let marketPrice, modelProb, side, outcome;
      if (isAbove) {
        marketPrice = +(0.3 + rng() * 0.35).toFixed(2);
        if (direction === "bullish") {
          modelProb = Math.min(0.85, marketPrice + 0.05 + rng() * 0.15);
          side = "BUY"; outcome = "Yes";
        } else {
          modelProb = Math.max(0.15, marketPrice - 0.05 - rng() * 0.1);
          side = "SELL"; outcome = "No";
        }
      } else {
        marketPrice = +(0.1 + rng() * 0.25).toFixed(2);
        if (direction === "bearish") {
          modelProb = Math.min(0.85, marketPrice + 0.05 + rng() * 0.1);
          side = "BUY"; outcome = "Yes";
        } else {
          modelProb = Math.max(0.15, marketPrice - 0.03 - rng() * 0.07);
          side = "SELL"; outcome = "No";
        }
      }

      const edge = +(side === "BUY" ? modelProb - marketPrice : marketPrice - modelProb).toFixed(4);
      if (Math.abs(edge) >= 0.05) {
        let price = +(marketPrice + (side === "BUY" ? 0.02 : -0.02)).toFixed(2);
        price = clamp(price, 0.01, 0.99);
        const cost = +(15 + rng() * 35).toFixed(2);
        const shares = +(cost / price).toFixed(2);
        trades.push({
          timestamp: ts.toISOString(), question, side, outcome,
          price, size_shares: shares, cost_usd: cost,
          model_probability: +modelProb.toFixed(4),
          market_implied_prob: marketPrice,
          edge, confidence,
          fear_greed_score: +fg.toFixed(2),
          btc_price: +btc.toFixed(2),
          composite_score: +composite.toFixed(2),
          status: "dry_run",
        });
        tradesPlaced = 1;
      }
    }

    predictions.push({
      timestamp: ts.toISOString(),
      fear_greed_score: +fg.toFixed(2),
      fear_greed_label: labelFor(fg),
      btc_price: +btc.toFixed(2),
      btc_change_24h: +change24h.toFixed(2),
      composite_score: +composite.toFixed(2),
      composite_direction: direction,
      confidence, trades_placed: tradesPlaced,
    });
  }
  return { predictions, trades };
}

// ── Formatting helpers ──
const fmtTime = (ts) => {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};
const fmtMoney = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? "—" : "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const fmtPct = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? "—" : (n * 100).toFixed(1) + "%";
};
const fmtEdge = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  const p = (n * 100).toFixed(1);
  return n >= 0 ? "+" + p + "%" : p + "%";
};

// ── Color palette ──
const C = {
  bg: "#0d1117", card: "#161b22", border: "#30363d", text: "#e6edf3",
  muted: "#8b949e", green: "#3fb950", red: "#f85149", blue: "#58a6ff",
  orange: "#d29922", purple: "#bc8cff", gridLine: "#21262d",
};

// ── Stat Card ──
const StatCard = ({ label, value, color, sub }) => (
  <div style={{
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
    padding: 20, minWidth: 0,
  }}>
    <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 700, color: color || C.text }}>{value}</div>
    {sub && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{sub}</div>}
  </div>
);

// ── Chart Card wrapper ──
const ChartCard = ({ title, children, full }) => (
  <div style={{
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
    padding: 20, gridColumn: full ? "1 / -1" : undefined,
  }}>
    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: C.muted }}>{title}</h3>
    {children}
  </div>
);

// ── Custom tooltip ──
const DarkTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1c2128", border: `1px solid ${C.border}`, borderRadius: 6,
      padding: "8px 12px", fontSize: 12,
    }}>
      <div style={{ color: C.muted, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || C.text }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </div>
      ))}
    </div>
  );
};

// ── Main Dashboard ──
export default function BTCSentimentDashboard() {
  const { predictions, trades } = useMemo(() => generateDemoData(), []);
  const [tab, setTab] = useState("charts");

  // Summary stats
  const latest = predictions[predictions.length - 1];
  const totalCost = trades.reduce((s, t) => s + t.cost_usd, 0);
  const avgEdge = trades.length ? trades.reduce((s, t) => s + t.edge, 0) / trades.length : 0;
  const avgConf = trades.length ? trades.reduce((s, t) => s + t.confidence, 0) / trades.length : 0;
  const buys = trades.filter((t) => t.side === "BUY").length;
  const sells = trades.filter((t) => t.side === "SELL").length;

  const dirColor = latest.composite_direction === "bullish" ? C.green
    : latest.composite_direction === "bearish" ? C.red : C.blue;

  // Chart data
  const fgData = predictions.map((p) => ({ time: fmtTime(p.timestamp), value: p.fear_greed_score }));
  const btcData = predictions.map((p) => ({ time: fmtTime(p.timestamp), value: p.btc_price }));
  const compData = predictions.map((p) => ({
    time: fmtTime(p.timestamp), value: +p.composite_score.toFixed(1),
    fill: p.composite_score > 20 ? C.green : p.composite_score < -20 ? C.red : C.muted,
  }));
  const edgeData = trades.map((t, i) => ({
    label: `#${i + 1}`, value: +(t.edge * 100).toFixed(1),
    fill: t.edge >= 0 ? "rgba(63,185,80,0.7)" : "rgba(248,81,73,0.7)",
  }));

  const recentTrades = [...trades].reverse().slice(0, 50);

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif", background: C.bg, color: C.text, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{
        padding: "24px 32px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>
          <span style={{ color: C.orange }}>BTC</span> Sentiment Prediction Bot
        </h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {["charts", "trades"].map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? C.border : "transparent", border: `1px solid ${C.border}`,
              borderRadius: 6, padding: "6px 16px", color: tab === t ? C.text : C.muted,
              fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "uppercase",
            }}>{t}</button>
          ))}
          <span style={{
            padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: "rgba(63,185,80,0.15)", color: C.green, textTransform: "uppercase",
          }}>
            DEMO DATA
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 32px" }}>
        {/* Stat cards */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16, marginBottom: 24,
        }}>
          <StatCard label="Fear & Greed Index" value={latest.fear_greed_score.toFixed(0)} color={C.orange} sub={latest.fear_greed_label} />
          <StatCard label="BTC Price" value={fmtMoney(latest.btc_price)} color={C.blue} sub={`Last: ${fmtTime(latest.timestamp)}`} />
          <StatCard label="Composite Signal" value={latest.composite_direction.toUpperCase()} color={dirColor} sub={`Score: ${latest.composite_score.toFixed(1)}`} />
          <StatCard label="Total Trades" value={trades.length} sub={`${buys} buys / ${sells} sells`} />
          <StatCard label="Capital Deployed" value={fmtMoney(totalCost)} color={C.purple} sub="Dry run mode" />
          <StatCard label="Avg Edge" value={fmtEdge(avgEdge)} color={avgEdge >= 0 ? C.green : C.red} sub={`Confidence: ${fmtPct(avgConf)}`} />
        </div>

        {tab === "charts" && (
          <>
            {/* Charts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <ChartCard title="Fear & Greed Index Over Time">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={fgData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.gridLine} />
                    <XAxis dataKey="time" tick={{ fill: C.muted, fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis domain={[0, 100]} tick={{ fill: C.muted, fontSize: 11 }} />
                    <Tooltip content={<DarkTooltip />} />
                    <Line type="monotone" dataKey="value" stroke={C.orange} strokeWidth={2} dot={{ r: 2, fill: C.orange }} name="F&G" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="BTC Price Over Time">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={btcData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.gridLine} />
                    <XAxis dataKey="time" tick={{ fill: C.muted, fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: C.muted, fontSize: 11 }} tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} domain={["dataMin - 500", "dataMax + 500"]} />
                    <Tooltip content={<DarkTooltip formatter={(v) => fmtMoney(v)} />} />
                    <Line type="monotone" dataKey="value" stroke={C.blue} strokeWidth={2} dot={{ r: 2, fill: C.blue }} name="BTC" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Composite Signal Score">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={compData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.gridLine} />
                    <XAxis dataKey="time" tick={{ fill: C.muted, fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis domain={[-100, 100]} tick={{ fill: C.muted, fontSize: 11 }} />
                    <Tooltip content={<DarkTooltip />} />
                    <ReferenceLine y={0} stroke={C.border} />
                    <Bar dataKey="value" name="Score" radius={[4, 4, 0, 0]}>
                      {compData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Trade Edge Distribution">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={edgeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.gridLine} />
                    <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 11 }} />
                    <YAxis tick={{ fill: C.muted, fontSize: 11 }} tickFormatter={(v) => v + "%"} />
                    <Tooltip content={<DarkTooltip formatter={(v) => v.toFixed(1) + "%"} />} />
                    <ReferenceLine y={0} stroke={C.border} />
                    <Bar dataKey="value" name="Edge" radius={[4, 4, 0, 0]}>
                      {edgeData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </>
        )}

        {tab === "trades" && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, padding: "16px 20px", borderBottom: `1px solid ${C.border}`, color: C.muted }}>
              Recent Trades ({trades.length} total)
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Time", "Market", "Side", "Price", "Size", "Cost", "Model Prob", "Market Prob", "Edge", "F&G"].map((h) => (
                      <th key={h} style={{
                        textAlign: "left", padding: "10px 16px", fontSize: 11, color: C.muted,
                        textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${C.border}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((t, i) => {
                    const sideColor = t.side === "BUY" ? C.green : C.red;
                    const sideBg = t.side === "BUY" ? "rgba(63,185,80,0.15)" : "rgba(248,81,73,0.15)";
                    const edgeColor = t.edge >= 0 ? C.green : C.red;
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "12px 16px", fontSize: 13 }}>{fmtTime(t.timestamp)}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.question}>{t.question}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13 }}>
                          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: sideBg, color: sideColor }}>
                            {t.side} {t.outcome}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 13 }}>{fmtMoney(t.price)}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13 }}>{t.size_shares.toFixed(1)}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13 }}>{fmtMoney(t.cost_usd)}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13 }}>{fmtPct(t.model_probability)}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13 }}>{fmtPct(t.market_implied_prob)}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: edgeColor }}>{fmtEdge(t.edge)}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13 }}>{t.fear_greed_score.toFixed(0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", padding: 16, fontSize: 12, color: C.muted }}>
          BTC Sentiment Prediction Bot — Demo Dashboard with seeded data
        </div>
      </div>
    </div>
  );
}
