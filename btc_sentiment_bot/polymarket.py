"""Client for the Polymarket API to fetch BTC prediction markets."""

import logging
import os
import requests

logger = logging.getLogger(__name__)

POLYMARKET_API_URL = os.getenv("POLYMARKET_API_URL", "https://gamma-api.polymarket.com")


def search_btc_markets(limit: int = 10) -> list[dict]:
    """Search Polymarket for active BTC/Bitcoin prediction markets.

    Returns:
        List of market dicts with: id, question, outcomes, prices, volume, end_date
    """
    url = f"{POLYMARKET_API_URL}/markets"
    params = {
        "tag": "crypto",
        "limit": limit,
        "active": "true",
        "closed": "false",
    }

    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        raw_markets = resp.json()

        # Filter for BTC-related markets
        btc_markets = []
        for market in raw_markets:
            question = (market.get("question") or "").lower()
            description = (market.get("description") or "").lower()
            if any(kw in question or kw in description for kw in ["btc", "bitcoin"]):
                btc_markets.append(_parse_market(market))

        logger.info("Found %d active BTC markets on Polymarket", len(btc_markets))
        return btc_markets

    except requests.RequestException as e:
        logger.error("Failed to fetch Polymarket markets: %s", e)
        return []


def get_market_by_id(market_id: str) -> dict | None:
    """Fetch a specific Polymarket market by its ID/slug."""
    url = f"{POLYMARKET_API_URL}/markets/{market_id}"

    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        return _parse_market(resp.json())

    except requests.RequestException as e:
        logger.error("Failed to fetch market %s: %s", market_id, e)
        return None


def _parse_market(market: dict) -> dict:
    """Parse raw Polymarket API response into a clean market dict."""
    outcomes_raw = market.get("outcomes", "")
    prices_raw = market.get("outcomePrices", "")

    # outcomes and prices can be JSON strings or lists
    if isinstance(outcomes_raw, str):
        try:
            import json
            outcomes = json.loads(outcomes_raw)
        except (json.JSONDecodeError, TypeError):
            outcomes = [o.strip() for o in outcomes_raw.split(",") if o.strip()]
    else:
        outcomes = outcomes_raw or []

    if isinstance(prices_raw, str):
        try:
            import json
            prices = [float(p) for p in json.loads(prices_raw)]
        except (json.JSONDecodeError, TypeError, ValueError):
            prices = []
    else:
        prices = [float(p) for p in (prices_raw or [])]

    return {
        "id": market.get("id", ""),
        "condition_id": market.get("conditionId", ""),
        "question": market.get("question", ""),
        "description": market.get("description", ""),
        "outcomes": outcomes,
        "prices": prices,
        "volume": float(market.get("volume", 0) or 0),
        "liquidity": float(market.get("liquidity", 0) or 0),
        "end_date": market.get("endDate", ""),
        "active": market.get("active", False),
        "closed": market.get("closed", False),
        "market_slug": market.get("slug", ""),
    }
