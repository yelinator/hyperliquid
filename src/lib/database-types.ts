// TypeScript types for the database schema
// These types correspond to the SQL schema in database-schema.sql

export interface Player {
  id: number;
  address: string; // Ethereum address
  created_at: Date;
  updated_at: Date;
  total_deposits: number; // Total ETH deposited
  total_withdrawals: number; // Total ETH withdrawn
  current_balance: number; // Current deposit balance
  games_played: number;
  games_won: number;
  total_wagered: number;
  total_payout: number;
  last_active: Date;
}

export interface Round {
  id: number; // Round ID from smart contract
  start_time: Date;
  end_time: Date;
  timeframe_seconds: number;
  total_bets: number;
  up_bets: number;
  down_bets: number;
  resolved: boolean;
  winning_prediction: boolean | null; // true = UP, false = DOWN
  total_payout: number;
  commission_amount: number;
  winner_address: string | null; // Address of the winner
  created_at: Date;
  updated_at: Date;
}

export interface Bet {
  id: number;
  round_id: number;
  player_address: string;
  prediction: boolean; // true = UP, false = DOWN
  amount: number;
  paid: boolean;
  transaction_hash: string | null; // Ethereum transaction hash
  created_at: Date;
}

export interface Deposit {
  id: number;
  player_address: string;
  amount: number;
  transaction_hash: string;
  block_number: number | null;
  created_at: Date;
}

export interface Withdrawal {
  id: number;
  player_address: string;
  amount: number;
  transaction_hash: string;
  block_number: number | null;
  created_at: Date;
}

export interface GameStatistics {
  id: number;
  date: Date;
  total_rounds: number;
  total_bets: number;
  total_volume: number;
  total_commission: number;
  unique_players: number;
  created_at: Date;
}

export interface PriceData {
  id: number;
  symbol: string; // e.g., 'ETHUSDT', 'HYPEUSDT'
  price: number;
  timestamp: Date;
  source: string; // e.g., 'hyperliquid', 'binance'
  created_at: Date;
}

// View types
export interface PlayerStats {
  address: string;
  games_played: number;
  games_won: number;
  win_rate: number;
  total_wagered: number;
  total_payout: number;
  current_balance: number;
  last_active: Date;
}

export interface RoundSummary {
  id: number;
  start_time: Date;
  end_time: Date;
  total_bets: number;
  up_bets: number;
  down_bets: number;
  resolved: boolean;
  winning_prediction: boolean | null;
  total_payout: number;
  commission_amount: number;
  total_bettors: number;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

// Database query types
export interface CreatePlayerData {
  address: string;
  current_balance?: number;
}

export interface UpdatePlayerData {
  total_deposits?: number;
  total_withdrawals?: number;
  current_balance?: number;
  games_played?: number;
  games_won?: number;
  total_wagered?: number;
  total_payout?: number;
  last_active?: Date;
}

export interface CreateRoundData {
  id: number;
  start_time: Date;
  end_time: Date;
  timeframe_seconds: number;
  total_bets?: number;
  up_bets?: number;
  down_bets?: number;
  resolved?: boolean;
  winning_prediction?: boolean;
  total_payout?: number;
  commission_amount?: number;
  winner_address?: string;
}

export interface CreateBetData {
  round_id: number;
  player_address: string;
  prediction: boolean;
  amount: number;
  transaction_hash?: string;
}

export interface CreateDepositData {
  player_address: string;
  amount: number;
  transaction_hash: string;
  block_number?: number;
}

export interface CreateWithdrawalData {
  player_address: string;
  amount: number;
  transaction_hash: string;
  block_number?: number;
}

export interface CreatePriceDataData {
  symbol: string;
  price: number;
  timestamp: Date;
  source: string;
}

// Filter and sort types
export interface PlayerFilters {
  address?: string;
  min_balance?: number;
  max_balance?: number;
  min_games_played?: number;
  min_win_rate?: number;
}

export interface RoundFilters {
  resolved?: boolean;
  start_date?: Date;
  end_date?: Date;
  min_total_bets?: number;
}

export interface BetFilters {
  player_address?: string;
  round_id?: number;
  prediction?: boolean;
  paid?: boolean;
  start_date?: Date;
  end_date?: Date;
}

export interface SortOptions {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

// Analytics types
export interface GameAnalytics {
  total_players: number;
  active_players: number; // Players active in last 24 hours
  total_rounds: number;
  total_bets: number;
  total_volume: number;
  total_commission: number;
  average_bet_size: number;
  win_rate: number;
  top_players: PlayerStats[];
  recent_rounds: RoundSummary[];
}

export interface PlayerAnalytics {
  player: PlayerStats;
  recent_bets: Bet[];
  recent_deposits: Deposit[];
  recent_withdrawals: Withdrawal[];
  betting_history: {
    date: Date;
    bets: number;
    volume: number;
    wins: number;
  }[];
}
