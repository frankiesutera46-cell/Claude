"""Scrapes the CNN Fear & Greed Index for real-time market sentiment."""

import logging
import requests

logger = logging.getLogger(__name__)

FEAR_GREED_API_URL = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata"

# CNN Fear & Greed score ranges
SENTIMENT_LABELS = {
    (0, 25): "Extreme Fear",
    (25, 45): "Fear",
    (45, 55): "Neutral",
    (55, 75): "Greed",
    (75, 100): "Extreme Greed",
}


def get_fear_greed_index() -> dict:
    """Fetch the current CNN Fear & Greed Index.

    Returns:
        dict with keys: score (0-100), label, timestamp
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
    }

    try:
        resp = requests.get(FEAR_GREED_API_URL, headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        # The API returns fear_and_greed.score and fear_and_greed.rating
        fg_data = data.get("fear_and_greed", {})
        score = round(fg_data.get("score", 50), 2)
        timestamp = fg_data.get("timestamp", "")
        rating = fg_data.get("rating", "")

        label = rating if rating else _score_to_label(score)

        logger.info("CNN Fear & Greed Index: %.2f (%s)", score, label)

        return {
            "score": score,
            "label": label,
            "timestamp": timestamp,
            "previous_close": fg_data.get("previous_close", None),
            "previous_1_week": fg_data.get("previous_1_week", None),
            "previous_1_month": fg_data.get("previous_1_month", None),
            "previous_1_year": fg_data.get("previous_1_year", None),
        }

    except requests.RequestException as e:
        logger.error("Failed to fetch Fear & Greed Index: %s", e)
        return {"score": 50, "label": "Neutral", "timestamp": "", "error": str(e)}


def _score_to_label(score: float) -> str:
    """Convert a numeric score to a sentiment label."""
    for (low, high), label in SENTIMENT_LABELS.items():
        if low <= score < high:
            return label
    return "Extreme Greed" if score >= 75 else "Neutral"


def get_sentiment_signal(score: float) -> str:
    """Convert Fear & Greed score to a trading signal direction.

    CNN Fear & Greed is a contrarian indicator:
    - Extreme Fear -> potential buying opportunity (bullish for BTC)
    - Extreme Greed -> potential selling signal (bearish for BTC)

    Returns: 'bullish', 'bearish', or 'neutral'
    """
    if score <= 25:
        return "bullish"
    elif score <= 40:
        return "slightly_bullish"
    elif score <= 60:
        return "neutral"
    elif score <= 75:
        return "slightly_bearish"
    else:
        return "bearish"
