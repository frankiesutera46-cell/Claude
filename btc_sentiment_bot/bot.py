"""Main bot entry point — runs the prediction loop on a schedule.

Supports two modes:
  --mode dry_run  (default) Log what trades WOULD be placed
  --mode live     Actually place orders on Polymarket
"""

import argparse
import logging
import os
import sys
import time

import schedule
from dotenv import load_dotenv

from .predictor import SentimentPredictor
from .executor import TradeExecutor, TradingMode
from .clob_client import ClobClient
from .risk_manager import RiskConfig
from .trade_logger import TradeLogger

load_dotenv()

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL_MINUTES", "15"))

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("btc_sentiment_bot")


def _build_risk_config() -> RiskConfig:
    """Build risk config from environment variables."""
    return RiskConfig(
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


def _build_executor(mode: TradingMode) -> TradeExecutor:
    """Build the trade executor with appropriate config."""
    risk_config = _build_risk_config()
    trade_logger = TradeLogger()

    clob_client = None
    if mode == TradingMode.LIVE:
        api_key = os.getenv("POLY_API_KEY", "")
        api_secret = os.getenv("POLY_API_SECRET", "")
        api_passphrase = os.getenv("POLY_API_PASSPHRASE", "")

        if not all([api_key, api_secret, api_passphrase]):
            logger.error(
                "LIVE mode requires POLY_API_KEY, POLY_API_SECRET, and "
                "POLY_API_PASSPHRASE in .env"
            )
            sys.exit(1)

        clob_client = ClobClient(api_key, api_secret, api_passphrase)
        balance = clob_client.get_balance()
        logger.info("Connected to Polymarket. USDC balance: $%.2f", balance)

    return TradeExecutor(
        clob_client=clob_client,
        risk_config=risk_config,
        trade_logger=trade_logger,
        mode=mode,
    )


def run_cycle(predictor: SentimentPredictor, executor: TradeExecutor) -> None:
    """Run a single prediction + trade execution cycle."""
    logger.info("Starting prediction cycle...")
    try:
        result = predictor.run_prediction()
        print("\n" + result["summary"] + "\n")

        # Execute trades based on predictions
        trades = executor.execute_predictions(result)
        if not trades:
            logger.info("No trades executed this cycle")

    except Exception:
        logger.exception("Error during prediction cycle")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="BTC Sentiment Prediction Bot — uses CNN Fear & Greed to predict and trade Polymarket BTC outcomes"
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single prediction cycle and exit",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=POLL_INTERVAL,
        help=f"Polling interval in minutes (default: {POLL_INTERVAL})",
    )
    parser.add_argument(
        "--mode",
        type=str,
        choices=["dry_run", "live"],
        default=os.getenv("TRADING_MODE", "dry_run"),
        help="Trading mode: dry_run (default) or live",
    )
    args = parser.parse_args()

    mode = TradingMode(args.mode)

    if mode == TradingMode.LIVE:
        print("\n" + "!" * 50)
        print("  WARNING: LIVE TRADING MODE ENABLED")
        print("  Real orders will be placed on Polymarket.")
        print("  Press Ctrl+C within 5 seconds to abort...")
        print("!" * 50 + "\n")
        try:
            time.sleep(5)
        except KeyboardInterrupt:
            print("Aborted.")
            sys.exit(0)

    predictor = SentimentPredictor()
    executor = _build_executor(mode)

    logger.info("Bot started in %s mode", mode.value.upper())

    if args.once:
        run_cycle(predictor, executor)
        return

    logger.info("Polling every %d minutes. Press Ctrl+C to stop.", args.interval)
    run_cycle(predictor, executor)

    schedule.every(args.interval).minutes.do(run_cycle, predictor, executor)

    try:
        while True:
            schedule.run_pending()
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Bot stopped by user.")
        summary = executor.logger.get_trade_summary()
        if summary.get("total_trades", 0) > 0:
            print("\n--- Session Summary ---")
            print(f"  Total trades: {summary['total_trades']}")
            print(f"  Total deployed: ${summary['total_cost']:.2f}")
            print(f"  Avg edge: {summary['avg_edge']:.2%}")
            print(f"  Avg confidence: {summary['avg_confidence']:.0%}")
            print()
        sys.exit(0)


if __name__ == "__main__":
    main()
