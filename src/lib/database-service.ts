// Database service for HypePredict
// This service provides methods to interact with the off-chain database
// Currently uses localStorage as a fallback, but can be extended to use a real database

import { 
  Player, 
  Round, 
  Bet, 
  Deposit, 
  Withdrawal, 
  GameStatistics, 
  PriceData,
  PlayerStats,
  RoundSummary,
  CreatePlayerData,
  UpdatePlayerData,
  CreateRoundData,
  CreateBetData,
  CreateDepositData,
  CreateWithdrawalData,
  CreatePriceDataData,
  PlayerFilters,
  RoundFilters,
  BetFilters,
  SortOptions,
  PaginationOptions,
  GameAnalytics,
  PlayerAnalytics,
  ApiResponse,
  PaginatedResponse
} from './database-types';

class DatabaseService {
  private storageKey = 'hypepredict_database';

  // Initialize database (create tables if using real database)
  async initialize(): Promise<void> {
    // In a real implementation, this would create database tables
    // For now, we'll just ensure localStorage is available
    if (typeof window === 'undefined') {
      throw new Error('Database service can only be used in browser environment');
    }
  }

  // Player methods
  async createPlayer(data: CreatePlayerData): Promise<Player> {
    const player: Player = {
      id: Date.now(), // Simple ID generation
      address: data.address,
      created_at: new Date(),
      updated_at: new Date(),
      total_deposits: 0,
      total_withdrawals: 0,
      current_balance: data.current_balance || 0,
      games_played: 0,
      games_won: 0,
      total_wagered: 0,
      total_payout: 0,
      last_active: new Date()
    };

    const players = this.getPlayers();
    players.push(player);
    this.savePlayers(players);
    
    return player;
  }

  async getPlayer(address: string): Promise<Player | null> {
    const players = this.getPlayers();
    return players.find(p => p.address.toLowerCase() === address.toLowerCase()) || null;
  }

  async updatePlayer(address: string, data: UpdatePlayerData): Promise<Player | null> {
    const players = this.getPlayers();
    const playerIndex = players.findIndex(p => p.address.toLowerCase() === address.toLowerCase());
    
    if (playerIndex === -1) return null;

    players[playerIndex] = {
      ...players[playerIndex],
      ...data,
      updated_at: new Date()
    };

    this.savePlayers(players);
    return players[playerIndex];
  }

  async getPlayers(filters?: PlayerFilters, sort?: SortOptions, pagination?: PaginationOptions): Promise<PaginatedResponse<Player>> {
    let players = this.getPlayers();

    // Apply filters
    if (filters) {
      players = players.filter(player => {
        if (filters.address && !player.address.toLowerCase().includes(filters.address.toLowerCase())) return false;
        if (filters.min_balance && player.current_balance < filters.min_balance) return false;
        if (filters.max_balance && player.current_balance > filters.max_balance) return false;
        if (filters.min_games_played && player.games_played < filters.min_games_played) return false;
        if (filters.min_win_rate && player.games_played > 0) {
          const winRate = (player.games_won / player.games_played) * 100;
          if (winRate < filters.min_win_rate) return false;
        }
        return true;
      });
    }

    // Apply sorting
    if (sort) {
      players.sort((a, b) => {
        const aValue = (a as any)[sort.field];
        const bValue = (b as any)[sort.field];
        const direction = sort.direction === 'ASC' ? 1 : -1;
        return aValue > bValue ? direction : aValue < bValue ? -direction : 0;
      });
    }

    // Apply pagination
    const total = players.length;
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPlayers = players.slice(startIndex, endIndex);

    return {
      success: true,
      data: paginatedPlayers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Round methods
  async createRound(data: CreateRoundData): Promise<Round> {
    const round: Round = {
      id: data.id,
      start_time: data.start_time,
      end_time: data.end_time,
      timeframe_seconds: data.timeframe_seconds,
      total_bets: data.total_bets || 0,
      up_bets: data.up_bets || 0,
      down_bets: data.down_bets || 0,
      resolved: data.resolved || false,
      winning_prediction: data.winning_prediction || null,
      total_payout: data.total_payout || 0,
      commission_amount: data.commission_amount || 0,
      winner_address: data.winner_address || null,
      created_at: new Date(),
      updated_at: new Date()
    };

    const rounds = this.getRounds();
    rounds.push(round);
    this.saveRounds(rounds);
    
    return round;
  }

  async getRound(id: number): Promise<Round | null> {
    const rounds = this.getRounds();
    return rounds.find(r => r.id === id) || null;
  }

  async updateRound(id: number, data: Partial<Round>): Promise<Round | null> {
    const rounds = this.getRounds();
    const roundIndex = rounds.findIndex(r => r.id === id);
    
    if (roundIndex === -1) return null;

    rounds[roundIndex] = {
      ...rounds[roundIndex],
      ...data,
      updated_at: new Date()
    };

    this.saveRounds(rounds);
    return rounds[roundIndex];
  }

  // Bet methods
  async createBet(data: CreateBetData): Promise<Bet> {
    const bet: Bet = {
      id: Date.now(),
      round_id: data.round_id,
      player_address: data.player_address,
      prediction: data.prediction,
      amount: data.amount,
      paid: false,
      transaction_hash: data.transaction_hash || null,
      created_at: new Date()
    };

    const bets = this.getBets();
    bets.push(bet);
    this.saveBets(bets);
    
    return bet;
  }

  async getBets(filters?: BetFilters, sort?: SortOptions, pagination?: PaginationOptions): Promise<PaginatedResponse<Bet>> {
    let bets = this.getBets();

    // Apply filters
    if (filters) {
      bets = bets.filter(bet => {
        if (filters.player_address && bet.player_address.toLowerCase() !== filters.player_address.toLowerCase()) return false;
        if (filters.round_id && bet.round_id !== filters.round_id) return false;
        if (filters.prediction !== undefined && bet.prediction !== filters.prediction) return false;
        if (filters.paid !== undefined && bet.paid !== filters.paid) return false;
        if (filters.start_date && bet.created_at < filters.start_date) return false;
        if (filters.end_date && bet.created_at > filters.end_date) return false;
        return true;
      });
    }

    // Apply sorting
    if (sort) {
      bets.sort((a, b) => {
        const aValue = (a as any)[sort.field];
        const bValue = (b as any)[sort.field];
        const direction = sort.direction === 'ASC' ? 1 : -1;
        return aValue > bValue ? direction : aValue < bValue ? -direction : 0;
      });
    }

    // Apply pagination
    const total = bets.length;
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedBets = bets.slice(startIndex, endIndex);

    return {
      success: true,
      data: paginatedBets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Deposit methods
  async createDeposit(data: CreateDepositData): Promise<Deposit> {
    const deposit: Deposit = {
      id: Date.now(),
      player_address: data.player_address,
      amount: data.amount,
      transaction_hash: data.transaction_hash,
      block_number: data.block_number || null,
      created_at: new Date()
    };

    const deposits = this.getDeposits();
    deposits.push(deposit);
    this.saveDeposits(deposits);
    
    return deposit;
  }

  // Withdrawal methods
  async createWithdrawal(data: CreateWithdrawalData): Promise<Withdrawal> {
    const withdrawal: Withdrawal = {
      id: Date.now(),
      player_address: data.player_address,
      amount: data.amount,
      transaction_hash: data.transaction_hash,
      block_number: data.block_number || null,
      created_at: new Date()
    };

    const withdrawals = this.getWithdrawals();
    withdrawals.push(withdrawal);
    this.saveWithdrawals(withdrawals);
    
    return withdrawal;
  }

  // Analytics methods
  async getGameAnalytics(): Promise<GameAnalytics> {
    const players = this.getPlayers();
    const rounds = this.getRounds();
    const bets = this.getBets();

    const totalPlayers = players.length;
    const activePlayers = players.filter(p => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return p.last_active > oneDayAgo;
    }).length;

    const totalRounds = rounds.length;
    const totalBets = bets.length;
    const totalVolume = bets.reduce((sum, bet) => sum + bet.amount, 0);
    const totalCommission = rounds.reduce((sum, round) => sum + round.commission_amount, 0);
    const averageBetSize = totalBets > 0 ? totalVolume / totalBets : 0;

    const totalWins = players.reduce((sum, player) => sum + player.games_won, 0);
    const totalGames = players.reduce((sum, player) => sum + player.games_played, 0);
    const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

    // Top players by win rate
    const topPlayers: PlayerStats[] = players
      .filter(p => p.games_played > 0)
      .map(p => ({
        address: p.address,
        games_played: p.games_played,
        games_won: p.games_won,
        win_rate: (p.games_won / p.games_played) * 100,
        total_wagered: p.total_wagered,
        total_payout: p.total_payout,
        current_balance: p.current_balance,
        last_active: p.last_active
      }))
      .sort((a, b) => b.win_rate - a.win_rate)
      .slice(0, 10);

    // Recent rounds
    const recentRounds: RoundSummary[] = rounds
      .sort((a, b) => b.start_time.getTime() - a.start_time.getTime())
      .slice(0, 10)
      .map(round => ({
        id: round.id,
        start_time: round.start_time,
        end_time: round.end_time,
        total_bets: round.total_bets,
        up_bets: round.up_bets,
        down_bets: round.down_bets,
        resolved: round.resolved,
        winning_prediction: round.winning_prediction,
        total_payout: round.total_payout,
        commission_amount: round.commission_amount,
        total_bettors: bets.filter(b => b.round_id === round.id).length
      }));

    return {
      total_players: totalPlayers,
      active_players: activePlayers,
      total_rounds: totalRounds,
      total_bets: totalBets,
      total_volume: totalVolume,
      total_commission: totalCommission,
      average_bet_size: averageBetSize,
      win_rate: winRate,
      top_players: topPlayers,
      recent_rounds: recentRounds
    };
  }

  // Local storage helper methods
  private getPlayers(): Player[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(`${this.storageKey}_players`);
    return data ? JSON.parse(data) : [];
  }

  private savePlayers(players: Player[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${this.storageKey}_players`, JSON.stringify(players));
  }

  private getRounds(): Round[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(`${this.storageKey}_rounds`);
    return data ? JSON.parse(data) : [];
  }

  private saveRounds(rounds: Round[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${this.storageKey}_rounds`, JSON.stringify(rounds));
  }

  private getBets(): Bet[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(`${this.storageKey}_bets`);
    return data ? JSON.parse(data) : [];
  }

  private saveBets(bets: Bet[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${this.storageKey}_bets`, JSON.stringify(bets));
  }

  private getDeposits(): Deposit[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(`${this.storageKey}_deposits`);
    return data ? JSON.parse(data) : [];
  }

  private saveDeposits(deposits: Deposit[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${this.storageKey}_deposits`, JSON.stringify(deposits));
  }

  private getWithdrawals(): Withdrawal[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(`${this.storageKey}_withdrawals`);
    return data ? JSON.parse(data) : [];
  }

  private saveWithdrawals(withdrawals: Withdrawal[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${this.storageKey}_withdrawals`, JSON.stringify(withdrawals));
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
export default databaseService;
