"""Polymarket CLOB (Central Limit Order Book) API client for placing trades.

Polymarket uses an on-chain order book. To trade programmatically you need:
1. An API key (from https://polymarket.com/settings/api)
2. Your wallet private key (for signing orders)

Orders are signed off-chain and submitted to the CLOB API, which matches them.
"""

import hashlib
import hmac
import json
import logging
import time
from enum import Enum

import requests

logger = logging.getLogger(__name__)

CLOB_BASE_URL = "https://clob.polymarket.com"


class Side(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


class OrderType(str, Enum):
    LIMIT = "GTC"       # Good til cancelled
    FOK = "FOK"         # Fill or kill
    GTD = "GTD"         # Good til date


class ClobClient:
    """Client for the Polymarket CLOB API."""

    def __init__(self, api_key: str, api_secret: str, api_passphrase: str):
        self.api_key = api_key
        self.api_secret = api_secret
        self.api_passphrase = api_passphrase
        self.base_url = CLOB_BASE_URL
        self.session = requests.Session()

    def _headers(self, method: str, path: str, body: str = "") -> dict:
        """Generate authenticated headers for the CLOB API."""
        timestamp = str(int(time.time()))
        message = timestamp + method.upper() + path + body
        signature = hmac.new(
            self.api_secret.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        return {
            "POLY_API_KEY": self.api_key,
            "POLY_SIGNATURE": signature,
            "POLY_TIMESTAMP": timestamp,
            "POLY_PASSPHRASE": self.api_passphrase,
            "Content-Type": "application/json",
        }

    def _get(self, path: str) -> dict:
        headers = self._headers("GET", path)
        resp = self.session.get(f"{self.base_url}{path}", headers=headers, timeout=15)
        resp.raise_for_status()
        return resp.json()

    def _post(self, path: str, payload: dict) -> dict:
        body = json.dumps(payload)
        headers = self._headers("POST", path, body)
        resp = self.session.post(
            f"{self.base_url}{path}", headers=headers, data=body, timeout=15
        )
        resp.raise_for_status()
        return resp.json()

    def _delete(self, path: str) -> dict:
        headers = self._headers("DELETE", path)
        resp = self.session.delete(f"{self.base_url}{path}", headers=headers, timeout=15)
        resp.raise_for_status()
        return resp.json()

    # ── Account ──────────────────────────────────────────────

    def get_balance(self) -> float:
        """Get USDC balance available for trading."""
        try:
            data = self._get("/balance")
            return float(data.get("balance", 0))
        except requests.RequestException as e:
            logger.error("Failed to get balance: %s", e)
            return 0.0

    def get_positions(self) -> list[dict]:
        """Get all open positions."""
        try:
            return self._get("/positions")
        except requests.RequestException as e:
            logger.error("Failed to get positions: %s", e)
            return []

    # ── Orders ───────────────────────────────────────────────

    def get_order_book(self, token_id: str) -> dict:
        """Get the order book for a specific outcome token."""
        try:
            return self._get(f"/book?token_id={token_id}")
        except requests.RequestException as e:
            logger.error("Failed to get order book: %s", e)
            return {}

    def place_order(
        self,
        token_id: str,
        side: Side,
        price: float,
        size: float,
        order_type: OrderType = OrderType.LIMIT,
    ) -> dict | None:
        """Place a limit order on the CLOB.

        Args:
            token_id: The outcome token ID to trade.
            side: BUY or SELL.
            price: Price per share (0.01 to 0.99 for prediction markets).
            size: Number of shares.
            order_type: GTC (default), FOK, or GTD.

        Returns:
            Order response dict or None on failure.
        """
        # Validate inputs
        if not (0.01 <= price <= 0.99):
            logger.error("Price must be between 0.01 and 0.99, got %.4f", price)
            return None
        if size <= 0:
            logger.error("Size must be positive, got %.4f", size)
            return None

        payload = {
            "tokenID": token_id,
            "side": side.value,
            "price": str(round(price, 2)),
            "size": str(round(size, 2)),
            "type": order_type.value,
        }

        try:
            result = self._post("/order", payload)
            logger.info(
                "Order placed: %s %s %.2f shares @ $%.2f (token: %s) -> %s",
                side.value, order_type.value, size, price, token_id[:12],
                result.get("orderID", "unknown"),
            )
            return result
        except requests.RequestException as e:
            logger.error("Failed to place order: %s", e)
            return None

    def cancel_order(self, order_id: str) -> bool:
        """Cancel an open order."""
        try:
            self._delete(f"/order/{order_id}")
            logger.info("Order cancelled: %s", order_id)
            return True
        except requests.RequestException as e:
            logger.error("Failed to cancel order %s: %s", order_id, e)
            return False

    def cancel_all_orders(self) -> bool:
        """Cancel all open orders."""
        try:
            self._delete("/orders")
            logger.info("All orders cancelled")
            return True
        except requests.RequestException as e:
            logger.error("Failed to cancel all orders: %s", e)
            return False

    def get_open_orders(self) -> list[dict]:
        """Get all open orders."""
        try:
            return self._get("/orders")
        except requests.RequestException as e:
            logger.error("Failed to get open orders: %s", e)
            return []

    # ── Market info ──────────────────────────────────────────

    def get_market(self, condition_id: str) -> dict:
        """Get market info by condition ID."""
        try:
            return self._get(f"/markets/{condition_id}")
        except requests.RequestException as e:
            logger.error("Failed to get market %s: %s", condition_id, e)
            return {}
