"""Fetches real-time BTC price data from CoinGecko (free, no API key needed)."""

import logging
import os
import requests

logger = logging.getLogger(__name__)

COINGECKO_BASE = os.getenv("COINGECKO_API_URL", "https://api.coingecko.com/api/v3")


def get_btc_price() -> dict:
    """Fetch current BTC price and 24h change from CoinGecko.

    Returns:
        dict with keys: price_usd, change_24h_pct, market_cap, volume_24h
    """
    url = f"{COINGECKO_BASE}/simple/price"
    params = {
        "ids": "bitcoin",
        "vs_currencies": "usd",
        "include_24hr_change": "true",
        "include_market_cap": "true",
        "include_24hr_vol": "true",
    }

    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json().get("bitcoin", {})

        result = {
            "price_usd": data.get("usd", 0),
            "change_24h_pct": round(data.get("usd_24h_change", 0), 2),
            "market_cap": data.get("usd_market_cap", 0),
            "volume_24h": data.get("usd_24h_vol", 0),
        }

        logger.info("BTC Price: $%,.2f (24h: %+.2f%%)", result["price_usd"], result["change_24h_pct"])
        return result

    except requests.RequestException as e:
        logger.error("Failed to fetch BTC price: %s", e)
        return {"price_usd": 0, "change_24h_pct": 0, "error": str(e)}


def get_btc_price_history(days: int = 7) -> list[dict]:
    """Fetch BTC price history from CoinGecko.

    Args:
        days: Number of days of history to fetch.

    Returns:
        List of dicts with keys: timestamp, price
    """
    url = f"{COINGECKO_BASE}/coins/bitcoin/market_chart"
    params = {"vs_currency": "usd", "days": days}

    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        prices = resp.json().get("prices", [])

        return [{"timestamp": p[0], "price": p[1]} for p in prices]

    except requests.RequestException as e:
        logger.error("Failed to fetch BTC price history: %s", e)
        return []
