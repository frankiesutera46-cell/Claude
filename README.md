# BTC Sentiment Prediction Bot

Predicts BTC price outcomes on **Polymarket** using real-time fear sentiment from the **CNN Fear & Greed Index**.

## How It Works

1. **Scrapes CNN Fear & Greed Index** — real-time traditional market sentiment (0-100 scale)
2. **Fetches BTC price data** — current price, 24h change, and 7-day history from CoinGecko
3. **Queries Polymarket** — finds active BTC prediction markets via the Gamma API
4. **Generates predictions** — combines sentiment (contrarian) + price momentum into a composite signal

### Strategy

The CNN Fear & Greed Index is used as a **contrarian indicator**:

| F&G Score | Sentiment | BTC Signal | Rationale |
|-----------|-----------|------------|-----------|
| 0–25 | Extreme Fear | Bullish | Panic selling creates buying opportunities |
| 25–40 | Fear | Slightly Bullish | Market pessimism is often overdone |
| 40–60 | Neutral | Neutral | No clear edge |
| 60–75 | Greed | Slightly Bearish | Euphoria precedes corrections |
| 75–100 | Extreme Greed | Bearish | Market tops often coincide with greed |

The composite score also factors in **7-day price momentum** and **24h price change** to confirm or dampen the sentiment signal.

## Setup

```bash
# Clone and install
pip install -r requirements.txt

# Copy env template
cp .env.example .env
```

## Usage

```bash
# Run once and exit
python -m btc_sentiment_bot --once

# Run on a loop (default: every 15 minutes)
python -m btc_sentiment_bot

# Custom interval
python -m btc_sentiment_bot --interval 5
```

## Example Output

```
=== BTC Sentiment Prediction Report ===
Time: 2026-03-24 15:30 UTC

CNN Fear & Greed Index: 22.00/100 (Extreme Fear)
BTC Price: $67,432.00 (+1.25% 24h)

Composite Signal: BULLISH (score: +38.5, confidence: 80%)
  - Fear/Greed contrarian: +28.0
  - Price momentum: +8.0
  - 24h change: +2.5

--- Polymarket Predictions (2 markets) ---

  Q: Will Bitcoin reach $70,000 by March 31?
  Prediction: Yes (model: 62.3% vs market: 55.0%)
  Edge: +7.30% | Confidence: 80%

==========================================
```

## Project Structure

```
btc_sentiment_bot/
├── __init__.py       # Package init
├── __main__.py       # Entry point for python -m
├── bot.py            # Main loop and scheduling
├── fear_greed.py     # CNN Fear & Greed Index scraper
├── btc_price.py      # BTC price data from CoinGecko
├── polymarket.py     # Polymarket API client
└── predictor.py      # Prediction engine (composite scoring)
```

## Disclaimer

This bot is for **educational and informational purposes only**. It does not constitute financial advice. Prediction markets involve risk — never trade more than you can afford to lose.
