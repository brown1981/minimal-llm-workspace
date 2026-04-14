import { ToolDefinition } from "./index";

/**
 * 📈 Cryptocurrency Price Tool
 * リアルタイムの仮想通貨価格を取得する「手足」
 */
export const get_crypto_price: ToolDefinition = {
  name: "get_crypto_price",
  description: "現在の仮想通貨の価格を表示通貨（JPY, USDなど）で取得します。例: BTC, ETH, SOL",
  parameters: {
    type: "object",
    properties: {
      symbol: {
        type: "string",
        description: "通貨シンボル（例: BTC, ETH, JPY）",
      },
      currency: {
        type: "string",
        description: "表示通貨（例: JPY, USD）",
        default: "JPY",
      },
    },
    required: ["symbol"],
  },
  execute: async ({ symbol, currency = "JPY" }) => {
    try {
      const sym = symbol.toUpperCase();
      const curr = currency.toUpperCase();
      
      // Binance Public API を使用（キー不要）
      const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${sym}USDT`);
      
      if (!response.ok) {
        throw new Error(`Symbol ${sym} not found or API error.`);
      }

      const data = await response.json();
      const priceInUsd = parseFloat(data.price);
      
      // JPY の場合は簡易換算（1ドル=150円、本来は為替APIを叩くべきだがまずはシンプルに）
      const finalPrice = curr === "JPY" ? priceInUsd * 150 : priceInUsd;

      return {
        symbol: sym,
        price: finalPrice.toLocaleString(),
        currency: curr,
        source: "Binance Public API",
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return { error: error.message || "Failed to fetch crypto price" };
    }
  },
};
