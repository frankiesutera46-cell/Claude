"""Trade executor — bridges the prediction engine with the CLOB client.

Responsibilities:
1. Takes predictions from the SentimentPredictor
2. Filters through RiskManager (edge threshold, exposure limits, daily loss)
3. Sizes positions via Kelly criterion
4. Places orders via ClobClient
5. Logs everything via TradeLogger

Supports two modes:
- DRY_RUN (default): Logs what would be traded without placing real orders
- LIVE: Actually places orders on Polymarket
"""

import logging
from enum import Enum

from .clob_client import ClobClient, Side, OrderType
from .risk_manager import RiskManager, RiskConfig
from .trade_logger import TradeLogger

logger = logging.getLogger(__name__)


class TradingMode(str, Enum):
    DRY_RUN = "dry_run"
    LIVE = "live"


class TradeExecutor:
    """Executes trades based on prediction signals."""

    def __init__(
        self,
        clob_client: ClobClient | None = None,
        risk_config: RiskConfig | None = None,
        trade_logger: TradeLogger | None = None,
        mode: TradingMode = TradingMode.DRY_RUN,
    ):
        self.clob = clob_client
        self.risk = RiskManager(risk_config)
        self.logger = trade_logger or TradeLogger()
        self.mode = mode

        if self.mode == TradingMode.LIVE and self.clob is None:
            raise ValueError("ClobClient required for LIVE trading mode")

    def execute_predictions(self, prediction_result: dict) -> list[dict]:
        """Process a full prediction result and execute qualifying trades.

        Args:
            prediction_result: Output from SentimentPredictor.run_prediction()

        Returns:
            List of executed trade details.
        """
        market_predictions = prediction_result.get("market_predictions", [])
        fear_greed = prediction_result.get("fear_greed", {})
        btc_price = prediction_result.get("btc_price", {})
        composite = prediction_result.get("composite_score", {})

        if not market_predictions:
            logger.info("No market predictions to execute")
            return []

        # Get current bankroll
        bankroll = self._get_bankroll()
        total_open_exposure = self._get_total_exposure()

        executed_trades = []
        trades_this_cycle = 0

        for pred in market_predictions:
            trade = self._evaluate_and_execute(
                prediction=pred,
                bankroll=bankroll,
                total_open_exposure=total_open_exposure,
                fear_greed_score=fear_greed.get("score", 50),
                btc_price_usd=btc_price.get("price_usd", 0),
                composite_score=composite.get("score", 0),
            )

            if trade:
                executed_trades.append(trade)
                trades_this_cycle += 1
                # Update exposure for next trade in this cycle
                total_open_exposure += trade.get("cost_usd", 0)

        # Log prediction cycle
        self.logger.log_prediction(
            fear_greed_score=fear_greed.get("score", 50),
            fear_greed_label=fear_greed.get("label", ""),
            btc_price=btc_price.get("price_usd", 0),
            btc_change_24h=btc_price.get("change_24h_pct", 0),
            composite_score=composite.get("score", 0),
            composite_direction=composite.get("direction", ""),
            confidence=composite.get("confidence", 0),
            num_markets=len(market_predictions),
            trades_placed=trades_this_cycle,
        )

        if executed_trades:
            self._print_trade_summary(executed_trades)

        return executed_trades

    def _evaluate_and_execute(
        self,
        prediction: dict,
        bankroll: float,
        total_open_exposure: float,
        fear_greed_score: float,
        btc_price_usd: float,
        composite_score: float,
    ) -> dict | None:
        """Evaluate a single market prediction and execute if it passes risk checks."""

        edge = prediction.get("edge", 0)
        confidence = prediction.get("confidence", 0)
        question = prediction.get("question", "")
        market_id = prediction.get("market_id", "")

        # ── Risk check ───────────────────────────────────────
        should_trade, reason = self.risk.should_trade(
            edge=edge,
            confidence=confidence,
            bankroll=bankroll,
            total_open_exposure=total_open_exposure,
        )

        if not should_trade:
            logger.info("SKIP [%s]: %s", question[:50], reason)
            return None

        # ── Determine trade direction ────────────────────────
        predicted_dir = prediction.get("predicted_direction", "Yes")
        model_prob = prediction.get("model_probability", 0.5)
        market_price = prediction.get("market_implied_prob", 0.5)

        if predicted_dir == "Yes":
            side = Side.BUY
            trade_price = market_price
            outcome = "Yes"
        else:
            side = Side.SELL
            trade_price = market_price
            outcome = "No"

        # ── Position sizing (Kelly) ──────────────────────────
        size_usd = self.risk.compute_kelly_size(
            model_prob=model_prob,
            market_price=trade_price,
            bankroll=bankroll,
        )

        if size_usd < self.risk.config.min_order_size:
            logger.info(
                "SKIP [%s]: Kelly size $%.2f below minimum $%.2f",
                question[:50], size_usd, self.risk.config.min_order_size,
            )
            return None

        # Calculate shares from dollar amount
        limit_price = self.risk.get_limit_price(trade_price, side.value)
        shares = round(size_usd / limit_price, 2)

        # ── Execute ──────────────────────────────────────────
        order_id = ""
        status = "dry_run"

        if self.mode == TradingMode.LIVE:
            result = self.clob.place_order(
                token_id=market_id,
                side=side,
                price=limit_price,
                size=shares,
                order_type=OrderType.LIMIT,
            )
            if result:
                order_id = result.get("orderID", "")
                status = "placed"
            else:
                status = "failed"
                logger.error("Order failed for [%s]", question[:50])
                return None
        else:
            logger.info(
                "DRY RUN: %s %.2f shares of '%s' @ $%.2f ($%.2f)",
                side.value, shares, outcome, limit_price, size_usd,
            )

        # ── Log ──────────────────────────────────────────────
        trade_detail = {
            "market_id": market_id,
            "question": question,
            "side": side.value,
            "outcome": outcome,
            "price": limit_price,
            "size_shares": shares,
            "cost_usd": size_usd,
            "model_probability": model_prob,
            "market_implied_prob": market_price,
            "edge": edge,
            "confidence": confidence,
            "order_id": order_id,
            "status": status,
        }

        self.logger.log_trade(
            fear_greed_score=fear_greed_score,
            btc_price=btc_price_usd,
            composite_score=composite_score,
            **trade_detail,
        )

        self.risk.record_trade(size_usd)

        return trade_detail

    def _get_bankroll(self) -> float:
        """Get current bankroll (USDC balance)."""
        if self.mode == TradingMode.LIVE and self.clob:
            return self.clob.get_balance()
        # Default bankroll for dry run
        return 1000.0

    def _get_total_exposure(self) -> float:
        """Get total open exposure across all positions."""
        if self.mode == TradingMode.LIVE and self.clob:
            positions = self.clob.get_positions()
            return sum(
                float(p.get("size", 0)) * float(p.get("avgPrice", 0))
                for p in positions
            )
        return 0.0

    def _print_trade_summary(self, trades: list[dict]) -> None:
        """Print a summary of executed trades."""
        mode_tag = "LIVE" if self.mode == TradingMode.LIVE else "DRY RUN"
        total_cost = sum(t["cost_usd"] for t in trades)

        print(f"\n--- Trade Execution Summary [{mode_tag}] ---")
        for t in trades:
            print(
                f"  {t['side']} {t['outcome']} | {t['question'][:60]}"
                f"\n    {t['size_shares']} shares @ ${t['price']:.2f} = ${t['cost_usd']:.2f}"
                f" | Edge: {t['edge']:+.2%} | Conf: {t['confidence']:.0%}"
            )
        print(f"  Total deployed: ${total_cost:.2f}")
        print(f"{'=' * 45}\n")
