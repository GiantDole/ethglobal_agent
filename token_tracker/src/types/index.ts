export interface Token {
    id: number;
    address: string;
    chain_id: number;
    is_active: boolean;
    symbol: string;
    decimals: number;
  }
  
  export interface PriceData {
    token_id: number;
    price: number;
    timestamp: number;
  }