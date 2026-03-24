"""Flask web dashboard for the BTC Sentiment Prediction Bot."""

import csv
import json
import os
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, render_template

LOG_DIR = Path(os.path.dirname(__file__)) / ".." / ".." / "trade_logs"

app = Flask(
    __name__,
    template_folder=os.path.join(os.path.dirname(__file__), "templates"),
    static_folder=os.path.join(os.path.dirname(__file__), "static"),
)


def _read_csv(filename: str) -> list[dict]:
    """Read a CSV file from the trade_logs directory."""
    filepath = LOG_DIR / filename
    if not filepath.exists():
        return []
    with open(filepath, "r") as f:
        return list(csv.DictReader(f))


@app.route("/")
def dashboard():
    """Main dashboard page."""
    return render_template("dashboard.html")


@app.route("/api/predictions")
def api_predictions():
    """Return all prediction cycle data."""
    rows = _read_csv("predictions.csv")
    return jsonify(rows)


@app.route("/api/trades")
def api_trades():
    """Return all trade data."""
    rows = _read_csv("trades.csv")
    return jsonify(rows)


@app.route("/api/summary")
def api_summary():
    """Return summary statistics."""
    trades = _read_csv("trades.csv")
    predictions = _read_csv("predictions.csv")

    if not trades and not predictions:
        return jsonify({
            "total_trades": 0,
            "total_predictions": 0,
            "status": "waiting",
            "message": "Bot is running — waiting for first prediction cycle...",
        })

    total_cost = sum(float(t.get("cost_usd", 0)) for t in trades)
    avg_edge = (
        sum(float(t.get("edge", 0)) for t in trades) / len(trades)
        if trades else 0
    )
    avg_confidence = (
        sum(float(t.get("confidence", 0)) for t in trades) / len(trades)
        if trades else 0
    )

    # Group trades by side
    buys = [t for t in trades if t.get("side") == "BUY"]
    sells = [t for t in trades if t.get("side") == "SELL"]

    # Latest prediction
    latest = predictions[-1] if predictions else {}

    # Fear & greed history
    fg_scores = [float(p.get("fear_greed_score", 50)) for p in predictions]
    btc_prices = [float(p.get("btc_price", 0)) for p in predictions]

    return jsonify({
        "total_trades": len(trades),
        "total_predictions": len(predictions),
        "total_deployed": round(total_cost, 2),
        "avg_edge": round(avg_edge, 4),
        "avg_confidence": round(avg_confidence, 4),
        "buy_count": len(buys),
        "sell_count": len(sells),
        "latest_fg_score": latest.get("fear_greed_score", "—"),
        "latest_fg_label": latest.get("fear_greed_label", "—"),
        "latest_btc_price": latest.get("btc_price", "—"),
        "latest_composite": latest.get("composite_score", "—"),
        "latest_direction": latest.get("composite_direction", "—"),
        "latest_timestamp": latest.get("timestamp", "—"),
        "fg_history": fg_scores[-50:],
        "btc_history": btc_prices[-50:],
        "status": "running",
    })


def run_dashboard(host: str = "0.0.0.0", port: int = 5000, debug: bool = False):
    """Run the Flask dashboard server."""
    print(f"\n  Dashboard running at http://localhost:{port}\n")
    app.run(host=host, port=port, debug=debug)


if __name__ == "__main__":
    run_dashboard(debug=True)
