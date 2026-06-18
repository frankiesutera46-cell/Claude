"""Prediction engine that combines CNN Fear & Greed sentiment with BTC price data
to generate predictions for Polymarket BTC markets."""

import logging
from datetime import datetime

import numpy as np

from .fear_greed import get_fear_greed_index, get_sentiment_signal
from .btc_price import get_btc_price, get_btc_price_history
from .polymarket import search_btc_markets

logger = logging.getLogger(__name__)


class SentimentPredictor:
    """Generates BTC price predictions using CNN Fear & Greed as a contrarian indicator.

    Strategy:
    - CNN Fear & Greed measures traditional market sentiment (stocks).
    - Historically, extreme fear in traditional markets correlates with BTC volatility.
    - Extreme Fear (0-25): Contrarian bullish — panic selling creates buying opportunities.
    - Extreme Greed (75-100): Contrarian bearish — euphoria precedes corrections.
    - The model weights sentiment alongside recent price momentum.
    """

    def __init__(self):
        self.history: list[dict] = []

    def run_prediction(self) -> dict:
        """Run a full prediction cycle.

        Returns:
            dict with prediction details including signal, confidence, and market analysis.
        """
        # 1. Gather all data
        fear_greed = get_fear_greed_index()
        btc_price = get_btc_price()
        btc_history = get_btc_price_history(days=7)
        polymarkets = search_btc_markets()

        # 2. Compute sentiment signal
        fg_score = fear_greed["score"]
        sentiment_signal = get_sentiment_signal(fg_score)

        # 3. Compute price momentum
        momentum = self._compute_momentum(btc_history)

        # 4. Combine signals into a composite score
        composite = self._composite_score(fg_score, momentum, btc_price.get("change_24h_pct", 0))

        # 5. Generate predictions for each Polymarket market
        market_predictions = []
        for market in polymarkets:
            pred = self._predict_market(market, composite, sentiment_signal)
            market_predictions.append(pred)

        # 6. Build result
        result = {
            "timestamp": datetime.utcnow().isoformat(),
            "fear_greed": fear_greed,
            "btc_price": btc_price,
            "sentiment_signal": sentiment_signal,
            "momentum": momentum,
            "composite_score": composite,
            "market_predictions": market_predictions,
            "summary": self._generate_summary(
                fg_score, sentiment_signal, composite, btc_price, market_predictions
            ),
        }

        self.history.append(result)
        return result

    def _compute_momentum(self, price_history: list[dict]) -> dict:
        """Compute price momentum indicators from historical data."""
        if len(price_history) < 2:
            return {"trend": "neutral", "strength": 0, "volatility": 0}

        prices = np.array([p["price"] for p in price_history])

        # Simple trend: compare recent avg vs older avg
        midpoint = len(prices) // 2
        recent_avg = np.mean(prices[midpoint:])
        older_avg = np.mean(prices[:midpoint])
        trend_pct = ((recent_avg - older_avg) / older_avg) * 100

        # Volatility (std dev of returns)
        returns = np.diff(prices) / prices[:-1]
        volatility = float(np.std(returns) * 100)

        if trend_pct > 2:
            trend = "bullish"
        elif trend_pct < -2:
            trend = "bearish"
        else:
            trend = "neutral"

        return {
            "trend": trend,
            "strength": round(trend_pct, 2),
            "volatility": round(volatility, 4),
            "recent_avg_price": round(recent_avg, 2),
            "older_avg_price": round(older_avg, 2),
        }

    def _composite_score(self, fg_score: float, momentum: dict, change_24h: float) -> dict:
        """Combine Fear & Greed + momentum into a single composite score.

        Score range: -100 (very bearish) to +100 (very bullish)

        The Fear & Greed index is used as a CONTRARIAN signal:
        - Low F&G (fear) -> positive contribution (buy the fear)
        - High F&G (greed) -> negative contribution (sell the greed)
        """
        # Contrarian F&G component: invert the scale
        # F&G=0 (extreme fear) -> +50 (bullish), F&G=100 (extreme greed) -> -50 (bearish)
        fg_component = (50 - fg_score) * 1.0  # Range: -50 to +50

        # Momentum component: direct signal
        momentum_component = np.clip(momentum.get("strength", 0) * 5, -30, 30)

        # 24h price change component
        change_component = np.clip(change_24h * 2, -20, 20)

        raw_score = fg_component + momentum_component + change_component
        final_score = float(np.clip(raw_score, -100, 100))

        # Confidence based on signal agreement
        signals = [
            1 if fg_component > 0 else -1,
            1 if momentum_component > 0 else -1,
            1 if change_component > 0 else -1,
        ]
        agreement = abs(sum(signals)) / len(signals)
        confidence = round(0.4 + (agreement * 0.4), 2)  # Range: 0.4 to 0.8

        if final_score > 20:
            direction = "bullish"
        elif final_score < -20:
            direction = "bearish"
        else:
            direction = "neutral"

        return {
            "score": round(final_score, 2),
            "direction": direction,
            "confidence": confidence,
            "components": {
                "fear_greed_contrarian": round(float(fg_component), 2),
                "momentum": round(float(momentum_component), 2),
                "price_change_24h": round(float(change_component), 2),
            },
        }

    def _predict_market(self, market: dict, composite: dict, sentiment: str) -> dict:
        """Generate a prediction for a specific Polymarket market."""
        question = market.get("question", "").lower()
        outcomes = market.get("outcomes", [])
        prices = market.get("prices", [])

        # Determine if this is a "will BTC reach X" or "will BTC drop below X" market
        is_upside_market = any(
            kw in question for kw in ["above", "reach", "hit", "over", "exceed", "surpass"]
        )
        is_downside_market = any(
            kw in question for kw in ["below", "drop", "fall", "under", "crash"]
        )

        # Map our composite signal to a Yes/No prediction
        if is_upside_market:
            # "Will BTC reach $X?" -> bullish composite = lean Yes
            lean_yes = composite["direction"] == "bullish"
        elif is_downside_market:
            # "Will BTC drop below $X?" -> bearish composite = lean Yes
            lean_yes = composite["direction"] == "bearish"
        else:
            # Generic market — bullish composite = lean on first outcome
            lean_yes = composite["direction"] == "bullish"

        # Current market-implied probability
        market_yes_price = prices[0] if prices else 0.5

        predicted_direction = "Yes" if lean_yes else "No"
        model_probability = self._estimate_probability(composite, lean_yes)

        # Edge = our estimated probability vs market price
        if lean_yes:
            edge = model_probability - market_yes_price
        else:
            edge = (1 - model_probability) - (1 - market_yes_price)

        return {
            "market_id": market["id"],
            "question": market.get("question", ""),
            "outcomes": outcomes,
            "current_prices": prices,
            "market_implied_prob": round(market_yes_price, 4),
            "predicted_direction": predicted_direction,
            "model_probability": round(model_probability, 4),
            "edge": round(edge, 4),
            "confidence": composite["confidence"],
            "signal_strength": abs(composite["score"]),
        }

    def _estimate_probability(self, composite: dict, lean_yes: bool) -> float:
        """Estimate probability based on composite score strength."""
        strength = abs(composite["score"]) / 100  # 0 to 1
        confidence = composite["confidence"]

        # Base probability is 0.5, adjusted by strength and confidence
        adjustment = strength * confidence * 0.3  # Max adjustment: ~0.24

        if lean_yes:
            return min(0.5 + adjustment, 0.85)
        else:
            return max(0.5 - adjustment, 0.15)

    def _generate_summary(
        self,
        fg_score: float,
        sentiment: str,
        composite: dict,
        btc_price: dict,
        market_predictions: list[dict],
    ) -> str:
        """Generate a human-readable summary of the prediction."""
        price = btc_price.get("price_usd", 0)
        change = btc_price.get("change_24h_pct", 0)

        lines = [
            f"=== BTC Sentiment Prediction Report ===",
            f"Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
            f"",
            f"CNN Fear & Greed Index: {fg_score}/100 ({sentiment})",
            f"BTC Price: ${price:,.2f} ({change:+.2f}% 24h)",
            f"",
            f"Composite Signal: {composite['direction'].upper()} "
            f"(score: {composite['score']:+.1f}, confidence: {composite['confidence']:.0%})",
            f"  - Fear/Greed contrarian: {composite['components']['fear_greed_contrarian']:+.1f}",
            f"  - Price momentum: {composite['components']['momentum']:+.1f}",
            f"  - 24h change: {composite['components']['price_change_24h']:+.1f}",
            f"",
        ]

        if market_predictions:
            lines.append(f"--- Polymarket Predictions ({len(market_predictions)} markets) ---")
            for pred in market_predictions:
                edge_str = f"{pred['edge']:+.2%}"
                lines.append(f"")
                lines.append(f"  Q: {pred['question']}")
                lines.append(f"  Prediction: {pred['predicted_direction']} "
                             f"(model: {pred['model_probability']:.1%} vs market: {pred['market_implied_prob']:.1%})")
                lines.append(f"  Edge: {edge_str} | Confidence: {pred['confidence']:.0%}")
        else:
            lines.append("No active BTC markets found on Polymarket.")

        lines.append("")
        lines.append("=" * 42)
        return "\n".join(lines)
