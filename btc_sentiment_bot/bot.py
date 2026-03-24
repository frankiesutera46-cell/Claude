"""Main bot entry point — runs the prediction loop on a schedule."""

import argparse
import logging
import os
import sys
import time

import schedule
from dotenv import load_dotenv

from .predictor import SentimentPredictor

load_dotenv()

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL_MINUTES", "15"))

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("btc_sentiment_bot")


def run_once(predictor: SentimentPredictor) -> None:
    """Run a single prediction cycle and print the report."""
    logger.info("Starting prediction cycle...")
    try:
        result = predictor.run_prediction()
        print("\n" + result["summary"] + "\n")
    except Exception:
        logger.exception("Error during prediction cycle")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="BTC Sentiment Prediction Bot — uses CNN Fear & Greed to predict Polymarket BTC outcomes"
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single prediction and exit (no scheduling loop)",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=POLL_INTERVAL,
        help=f"Polling interval in minutes (default: {POLL_INTERVAL})",
    )
    args = parser.parse_args()

    predictor = SentimentPredictor()

    if args.once:
        run_once(predictor)
        return

    # Run immediately, then schedule
    logger.info("Bot started. Polling every %d minutes. Press Ctrl+C to stop.", args.interval)
    run_once(predictor)

    schedule.every(args.interval).minutes.do(run_once, predictor)

    try:
        while True:
            schedule.run_pending()
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Bot stopped by user.")
        sys.exit(0)


if __name__ == "__main__":
    main()
