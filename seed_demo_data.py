"""Seeds the trade_logs with realistic demo data for dashboard testing."""

import csv
import os
import random
from datetime import datetime, timedelta
from pathlib import Path

LOG_DIR = Path("trade_logs")
LOG_DIR.mkdir(exist_ok=True)

TRADE_FIELDS = [
    "timestamp", "market_id", "question", "side", "outcome", "price",
    "size_shares", "cost_usd", "model_probability", "market_implied_prob",
    "edge", "confidence", "fear_greed_score", "btc_price", "composite_score",
    "order_id", "status",
]

PREDICTION_FIELDS = [
    "timestamp", "fear_greed_score", "fear_greed_label", "btc_price",
    "btc_change_24h", "composite_score", "composite_direction", "confidence",
    "num_markets", "trades_placed",
]

MARKETS = [
    ("Will Bitcoin reach $75,000 by April 2026?", "reach", "above"),
    ("Will Bitcoin exceed $80,000 by May 2026?", "exceed", "above"),
    ("Will Bitcoin drop below $60,000 by April 2026?", "drop", "below"),
    ("Will Bitcoin hit $100,000 in 2026?", "hit", "above"),
]

LABELS = {
    (0, 25): "Extreme Fear", (25, 45): "Fear", (45, 55): "Neutral",
    (55, 75): "Greed", (75, 100): "Extreme Greed",
}


def label_for(score):
    for (lo, hi), lbl in LABELS.items():
        if lo <= score < hi:
            return lbl
    return "Extreme Greed"


def direction_for(composite):
    if composite > 20:
        return "bullish"
    elif composite < -20:
        return "bearish"
    return "neutral"


random.seed(42)
now = datetime.utcnow()

predictions = []
trades = []

# Generate 48 cycles (every 15 min over ~12 hours)
fg_score = 35.0
btc_price = 67000.0

for i in range(48):
    ts = now - timedelta(minutes=(47 - i) * 15)
    ts_str = ts.isoformat()

    # Random walk the indicators
    fg_score = max(5, min(95, fg_score + random.gauss(0, 4)))
    btc_price = max(58000, min(78000, btc_price + random.gauss(50, 400)))
    change_24h = random.gauss(0.5, 2.0)

    # Composite from contrarian F&G + momentum
    fg_component = (50 - fg_score) * 1.0
    momentum = random.gauss(5, 10)
    composite = max(-100, min(100, fg_component + momentum + change_24h * 2))
    confidence = round(random.uniform(0.55, 0.85), 2)
    direction = direction_for(composite)

    num_markets = random.randint(2, 4)
    trades_placed = 0

    # Generate trades for some cycles
    if abs(composite) > 20 and random.random() > 0.3:
        market = random.choice(MARKETS)
        question, _, mtype = market

        if mtype == "above":
            market_price = round(random.uniform(0.30, 0.65), 2)
            if direction == "bullish":
                model_prob = min(0.85, market_price + random.uniform(0.05, 0.20))
                side, outcome = "BUY", "Yes"
            else:
                model_prob = max(0.15, market_price - random.uniform(0.05, 0.15))
                side, outcome = "SELL", "No"
        else:
            market_price = round(random.uniform(0.10, 0.35), 2)
            if direction == "bearish":
                model_prob = min(0.85, market_price + random.uniform(0.05, 0.15))
                side, outcome = "BUY", "Yes"
            else:
                model_prob = max(0.15, market_price - random.uniform(0.03, 0.10))
                side, outcome = "SELL", "No"

        edge = round(model_prob - market_price if side == "BUY" else market_price - model_prob, 4)
        if abs(edge) >= 0.05:
            price = round(market_price + (0.02 if side == "BUY" else -0.02), 2)
            price = max(0.01, min(0.99, price))
            cost = round(random.uniform(15, 50), 2)
            shares = round(cost / price, 2)

            trades.append({
                "timestamp": ts_str,
                "market_id": f"token_{random.randint(100000, 999999)}",
                "question": question,
                "side": side,
                "outcome": outcome,
                "price": price,
                "size_shares": shares,
                "cost_usd": cost,
                "model_probability": round(model_prob, 4),
                "market_implied_prob": market_price,
                "edge": edge,
                "confidence": confidence,
                "fear_greed_score": round(fg_score, 2),
                "btc_price": round(btc_price, 2),
                "composite_score": round(composite, 2),
                "order_id": "",
                "status": "dry_run",
            })
            trades_placed = 1

    predictions.append({
        "timestamp": ts_str,
        "fear_greed_score": round(fg_score, 2),
        "fear_greed_label": label_for(fg_score),
        "btc_price": round(btc_price, 2),
        "btc_change_24h": round(change_24h, 2),
        "composite_score": round(composite, 2),
        "composite_direction": direction,
        "confidence": confidence,
        "num_markets": num_markets,
        "trades_placed": trades_placed,
    })

# Write CSVs
with open(LOG_DIR / "predictions.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=PREDICTION_FIELDS)
    w.writeheader()
    w.writerows(predictions)

with open(LOG_DIR / "trades.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=TRADE_FIELDS)
    w.writeheader()
    w.writerows(trades)

print(f"Seeded {len(predictions)} predictions and {len(trades)} trades to trade_logs/")
