"""Risk management and position sizing.

Implements:
- Kelly criterion for optimal bet sizing
- Maximum position limits (per-market and total)
- Daily loss limits (circuit breaker)
- Minimum edge threshold to filter low-conviction trades
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, date

logger = logging.getLogger(__name__)


@dataclass
class RiskConfig:
    """Risk management configuration."""

    # Position sizing
    max_position_pct: float = 0.05      # Max 5% of bankroll per trade
    max_total_exposure_pct: float = 0.30 # Max 30% of bankroll in open positions
    kelly_fraction: float = 0.25         # Use quarter-Kelly (conservative)

    # Edge thresholds
    min_edge: float = 0.05              # Minimum 5% edge to place a trade
    min_confidence: float = 0.55        # Minimum 55% model confidence

    # Loss limits
    daily_loss_limit_pct: float = 0.10  # Stop trading after 10% daily loss
    max_trades_per_day: int = 10        # Max trades per day

    # Order constraints
    min_order_size: float = 1.0         # Minimum $1 order
    max_order_size: float = 100.0       # Maximum $100 per order
    price_slippage_buffer: float = 0.02 # 2 cent buffer on limit price


@dataclass
class DailyStats:
    """Track daily trading statistics."""

    date: date = field(default_factory=date.today)
    trades_placed: int = 0
    total_cost: float = 0.0
    realized_pnl: float = 0.0

    def reset_if_new_day(self) -> None:
        today = date.today()
        if self.date != today:
            logger.info("New trading day — resetting daily stats")
            self.date = today
            self.trades_placed = 0
            self.total_cost = 0.0
            self.realized_pnl = 0.0


class RiskManager:
    """Manages risk limits and position sizing for the trading bot."""

    def __init__(self, config: RiskConfig | None = None):
        self.config = config or RiskConfig()
        self.daily_stats = DailyStats()

    def compute_kelly_size(
        self,
        model_prob: float,
        market_price: float,
        bankroll: float,
    ) -> float:
        """Compute position size using fractional Kelly criterion.

        Kelly formula: f* = (bp - q) / b
        where:
            b = odds received (payout ratio)
            p = probability of winning
            q = 1 - p (probability of losing)

        We use fractional Kelly (quarter-Kelly by default) to reduce variance.

        Returns:
            Dollar amount to risk, or 0 if trade doesn't meet criteria.
        """
        if market_price <= 0 or market_price >= 1:
            return 0.0

        # For a prediction market share at price `market_price`:
        # If you buy Yes at 0.55 and it resolves Yes, you get $1, profit = 1 - 0.55 = 0.45
        # b = profit / cost = (1 - market_price) / market_price
        b = (1.0 - market_price) / market_price
        p = model_prob
        q = 1.0 - p

        kelly_raw = (b * p - q) / b
        if kelly_raw <= 0:
            return 0.0

        # Apply fractional Kelly
        kelly_adjusted = kelly_raw * self.config.kelly_fraction

        # Convert to dollar amount
        dollar_amount = bankroll * kelly_adjusted

        # Apply position limits
        max_by_position = bankroll * self.config.max_position_pct
        dollar_amount = min(dollar_amount, max_by_position)
        dollar_amount = min(dollar_amount, self.config.max_order_size)
        dollar_amount = max(dollar_amount, 0.0)

        return round(dollar_amount, 2)

    def should_trade(
        self,
        edge: float,
        confidence: float,
        bankroll: float,
        total_open_exposure: float,
    ) -> tuple[bool, str]:
        """Check if a trade should be placed given current risk limits.

        Returns:
            (should_trade, reason) tuple.
        """
        self.daily_stats.reset_if_new_day()

        # Check edge threshold
        if abs(edge) < self.config.min_edge:
            return False, f"Edge {edge:.2%} below minimum {self.config.min_edge:.2%}"

        # Check confidence threshold
        if confidence < self.config.min_confidence:
            return False, f"Confidence {confidence:.2%} below minimum {self.config.min_confidence:.2%}"

        # Check daily trade limit
        if self.daily_stats.trades_placed >= self.config.max_trades_per_day:
            return False, f"Daily trade limit reached ({self.config.max_trades_per_day})"

        # Check daily loss limit
        if bankroll > 0 and self.daily_stats.realized_pnl < 0:
            loss_pct = abs(self.daily_stats.realized_pnl) / bankroll
            if loss_pct >= self.config.daily_loss_limit_pct:
                return False, f"Daily loss limit hit ({loss_pct:.1%} >= {self.config.daily_loss_limit_pct:.1%})"

        # Check total exposure
        if bankroll > 0:
            exposure_pct = total_open_exposure / bankroll
            if exposure_pct >= self.config.max_total_exposure_pct:
                return False, f"Total exposure limit ({exposure_pct:.1%} >= {self.config.max_total_exposure_pct:.1%})"

        return True, "Trade approved"

    def record_trade(self, cost: float) -> None:
        """Record a trade for daily tracking."""
        self.daily_stats.reset_if_new_day()
        self.daily_stats.trades_placed += 1
        self.daily_stats.total_cost += cost
        logger.info(
            "Trade recorded: $%.2f | Day total: %d trades, $%.2f cost",
            cost, self.daily_stats.trades_placed, self.daily_stats.total_cost,
        )

    def record_pnl(self, pnl: float) -> None:
        """Record realized P&L."""
        self.daily_stats.reset_if_new_day()
        self.daily_stats.realized_pnl += pnl

    def get_limit_price(self, market_price: float, side: str) -> float:
        """Calculate limit price with slippage buffer.

        For buys: slightly above market to improve fill rate.
        For sells: slightly below market.
        """
        buf = self.config.price_slippage_buffer
        if side == "BUY":
            return min(round(market_price + buf, 2), 0.99)
        else:
            return max(round(market_price - buf, 2), 0.01)
