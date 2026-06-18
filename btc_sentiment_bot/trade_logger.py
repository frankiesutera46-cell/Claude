"""Logs all trades and predictions to CSV for P&L tracking and analysis."""

import csv
import logging
import os
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

DEFAULT_LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "trade_logs")

TRADE_FIELDS = [
    "timestamp",
    "market_id",
    "question",
    "side",
    "outcome",
    "price",
    "size_shares",
    "cost_usd",
    "model_probability",
    "market_implied_prob",
    "edge",
    "confidence",
    "fear_greed_score",
    "btc_price",
    "composite_score",
    "order_id",
    "status",
]

PREDICTION_FIELDS = [
    "timestamp",
    "fear_greed_score",
    "fear_greed_label",
    "btc_price",
    "btc_change_24h",
    "composite_score",
    "composite_direction",
    "confidence",
    "num_markets",
    "trades_placed",
]


class TradeLogger:
    """Logs trades and predictions to CSV files."""

    def __init__(self, log_dir: str | None = None):
        self.log_dir = Path(log_dir or DEFAULT_LOG_DIR)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.trades_file = self.log_dir / "trades.csv"
        self.predictions_file = self.log_dir / "predictions.csv"
        self._ensure_headers()

    def _ensure_headers(self) -> None:
        """Write CSV headers if files don't exist."""
        for filepath, fields in [
            (self.trades_file, TRADE_FIELDS),
            (self.predictions_file, PREDICTION_FIELDS),
        ]:
            if not filepath.exists():
                with open(filepath, "w", newline="") as f:
                    writer = csv.DictWriter(f, fieldnames=fields)
                    writer.writeheader()

    def log_trade(
        self,
        market_id: str,
        question: str,
        side: str,
        outcome: str,
        price: float,
        size_shares: float,
        cost_usd: float,
        model_probability: float,
        market_implied_prob: float,
        edge: float,
        confidence: float,
        fear_greed_score: float,
        btc_price: float,
        composite_score: float,
        order_id: str = "",
        status: str = "placed",
    ) -> None:
        """Log a trade to the CSV file."""
        row = {
            "timestamp": datetime.utcnow().isoformat(),
            "market_id": market_id,
            "question": question,
            "side": side,
            "outcome": outcome,
            "price": round(price, 4),
            "size_shares": round(size_shares, 2),
            "cost_usd": round(cost_usd, 2),
            "model_probability": round(model_probability, 4),
            "market_implied_prob": round(market_implied_prob, 4),
            "edge": round(edge, 4),
            "confidence": round(confidence, 4),
            "fear_greed_score": round(fear_greed_score, 2),
            "btc_price": round(btc_price, 2),
            "composite_score": round(composite_score, 2),
            "order_id": order_id,
            "status": status,
        }

        with open(self.trades_file, "a", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=TRADE_FIELDS)
            writer.writerow(row)

        logger.info("Trade logged: %s %s @ $%.2f (%s)", side, outcome, price, status)

    def log_prediction(
        self,
        fear_greed_score: float,
        fear_greed_label: str,
        btc_price: float,
        btc_change_24h: float,
        composite_score: float,
        composite_direction: str,
        confidence: float,
        num_markets: int,
        trades_placed: int,
    ) -> None:
        """Log a prediction cycle to the CSV file."""
        row = {
            "timestamp": datetime.utcnow().isoformat(),
            "fear_greed_score": round(fear_greed_score, 2),
            "fear_greed_label": fear_greed_label,
            "btc_price": round(btc_price, 2),
            "btc_change_24h": round(btc_change_24h, 2),
            "composite_score": round(composite_score, 2),
            "composite_direction": composite_direction,
            "confidence": round(confidence, 4),
            "num_markets": num_markets,
            "trades_placed": trades_placed,
        }

        with open(self.predictions_file, "a", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=PREDICTION_FIELDS)
            writer.writerow(row)

    def get_trade_summary(self) -> dict:
        """Read trades CSV and compute summary statistics."""
        if not self.trades_file.exists():
            return {"total_trades": 0}

        trades = []
        with open(self.trades_file, "r") as f:
            reader = csv.DictReader(f)
            trades = list(reader)

        if not trades:
            return {"total_trades": 0}

        total_cost = sum(float(t["cost_usd"]) for t in trades)
        avg_edge = sum(float(t["edge"]) for t in trades) / len(trades)
        avg_confidence = sum(float(t["confidence"]) for t in trades) / len(trades)

        return {
            "total_trades": len(trades),
            "total_cost": round(total_cost, 2),
            "avg_edge": round(avg_edge, 4),
            "avg_confidence": round(avg_confidence, 4),
            "first_trade": trades[0]["timestamp"],
            "last_trade": trades[-1]["timestamp"],
        }
