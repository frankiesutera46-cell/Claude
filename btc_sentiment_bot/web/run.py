"""Run both the bot (background) and the web dashboard together."""

import argparse
import logging
import os
import sys
import threading
import time

from dotenv import load_dotenv

load_dotenv()

# Set up logging before imports that use it
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

from ..predictor import SentimentPredictor
from ..executor import TradeExecutor, TradingMode
from ..risk_manager import RiskConfig
from ..trade_logger import TradeLogger
from .app import run_dashboard

import schedule

logger = logging.getLogger("btc_sentiment_bot")


def bot_loop(predictor: SentimentPredictor, executor: TradeExecutor, interval: int):
    """Run the prediction bot in a background thread."""
    def cycle():
        logger.info("Starting prediction cycle...")
        try:
            result = predictor.run_prediction()
            print("\n" + result["summary"] + "\n")
            executor.execute_predictions(result)
        except Exception:
            logger.exception("Error during prediction cycle")

    cycle()
    schedule.every(interval).minutes.do(cycle)

    while True:
        schedule.run_pending()
        time.sleep(1)


def main():
    parser = argparse.ArgumentParser(description="BTC Sentiment Bot + Web Dashboard")
    parser.add_argument("--port", type=int, default=5000, help="Dashboard port (default: 5000)")
    parser.add_argument("--interval", type=int, default=int(os.getenv("POLL_INTERVAL_MINUTES", "15")),
                        help="Bot polling interval in minutes")
    args = parser.parse_args()

    risk_config = RiskConfig(
        max_position_pct=float(os.getenv("MAX_POSITION_PCT", "0.05")),
        max_total_exposure_pct=float(os.getenv("MAX_TOTAL_EXPOSURE_PCT", "0.30")),
        kelly_fraction=float(os.getenv("KELLY_FRACTION", "0.25")),
        min_edge=float(os.getenv("MIN_EDGE", "0.05")),
        min_confidence=float(os.getenv("MIN_CONFIDENCE", "0.55")),
        daily_loss_limit_pct=float(os.getenv("DAILY_LOSS_LIMIT_PCT", "0.10")),
        max_trades_per_day=int(os.getenv("MAX_TRADES_PER_DAY", "10")),
        min_order_size=float(os.getenv("MIN_ORDER_SIZE", "1.0")),
        max_order_size=float(os.getenv("MAX_ORDER_SIZE", "100.0")),
    )

    predictor = SentimentPredictor()
    executor = TradeExecutor(
        risk_config=risk_config,
        trade_logger=TradeLogger(),
        mode=TradingMode.DRY_RUN,
    )

    logger.info("Starting bot (dry-run) + dashboard on port %d", args.port)

    # Start bot in background thread
    bot_thread = threading.Thread(
        target=bot_loop, args=(predictor, executor, args.interval), daemon=True
    )
    bot_thread.start()

    # Run dashboard in main thread (blocking)
    run_dashboard(port=args.port)


if __name__ == "__main__":
    main()
