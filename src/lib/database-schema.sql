-- Database schema for HypePredict off-chain game tracking
-- This schema can be used with PostgreSQL, MySQL, or SQLite

-- Players table
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    address VARCHAR(42) UNIQUE NOT NULL, -- Ethereum address
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_deposits DECIMAL(20, 8) DEFAULT 0, -- Total ETH deposited
    total_withdrawals DECIMAL(20, 8) DEFAULT 0, -- Total ETH withdrawn
    current_balance DECIMAL(20, 8) DEFAULT 0, -- Current deposit balance
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    total_wagered DECIMAL(20, 8) DEFAULT 0,
    total_payout DECIMAL(20, 8) DEFAULT 0,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rounds table
CREATE TABLE rounds (
    id BIGINT PRIMARY KEY, -- Round ID from smart contract
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    timeframe_seconds INTEGER NOT NULL,
    total_bets DECIMAL(20, 8) DEFAULT 0,
    up_bets DECIMAL(20, 8) DEFAULT 0,
    down_bets DECIMAL(20, 8) DEFAULT 0,
    resolved BOOLEAN DEFAULT FALSE,
    winning_prediction BOOLEAN, -- true = UP, false = DOWN
    total_payout DECIMAL(20, 8) DEFAULT 0,
    commission_amount DECIMAL(20, 8) DEFAULT 0,
    winner_address VARCHAR(42), -- Address of the winner
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bets table
CREATE TABLE bets (
    id SERIAL PRIMARY KEY,
    round_id BIGINT NOT NULL,
    player_address VARCHAR(42) NOT NULL,
    prediction BOOLEAN NOT NULL, -- true = UP, false = DOWN
    amount DECIMAL(20, 8) NOT NULL,
    paid BOOLEAN DEFAULT FALSE,
    transaction_hash VARCHAR(66), -- Ethereum transaction hash
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (round_id) REFERENCES rounds(id),
    FOREIGN KEY (player_address) REFERENCES players(address),
    UNIQUE(round_id, player_address) -- One bet per player per round
);

-- Deposits table
CREATE TABLE deposits (
    id SERIAL PRIMARY KEY,
    player_address VARCHAR(42) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_address) REFERENCES players(address)
);

-- Withdrawals table
CREATE TABLE withdrawals (
    id SERIAL PRIMARY KEY,
    player_address VARCHAR(42) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_address) REFERENCES players(address)
);

-- Game statistics table (for analytics)
CREATE TABLE game_statistics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    total_rounds INTEGER DEFAULT 0,
    total_bets INTEGER DEFAULT 0,
    total_volume DECIMAL(20, 8) DEFAULT 0,
    total_commission DECIMAL(20, 8) DEFAULT 0,
    unique_players INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date)
);

-- Price data table (for historical price tracking)
CREATE TABLE price_data (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL, -- e.g., 'ETHUSDT', 'HYPEUSDT'
    price DECIMAL(20, 8) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    source VARCHAR(50) NOT NULL, -- e.g., 'hyperliquid', 'binance'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_symbol_timestamp (symbol, timestamp)
);

-- Indexes for better performance
CREATE INDEX idx_players_address ON players(address);
CREATE INDEX idx_rounds_start_time ON rounds(start_time);
CREATE INDEX idx_rounds_resolved ON rounds(resolved);
CREATE INDEX idx_bets_player ON bets(player_address);
CREATE INDEX idx_bets_round ON bets(round_id);
CREATE INDEX idx_deposits_player ON deposits(player_address);
CREATE INDEX idx_withdrawals_player ON withdrawals(player_address);
CREATE INDEX idx_game_stats_date ON game_statistics(date);

-- Views for common queries
CREATE VIEW player_stats AS
SELECT 
    p.address,
    p.games_played,
    p.games_won,
    CASE 
        WHEN p.games_played > 0 THEN (p.games_won::DECIMAL / p.games_played::DECIMAL) * 100
        ELSE 0
    END as win_rate,
    p.total_wagered,
    p.total_payout,
    p.current_balance,
    p.last_active
FROM players p;

CREATE VIEW round_summary AS
SELECT 
    r.id,
    r.start_time,
    r.end_time,
    r.total_bets,
    r.up_bets,
    r.down_bets,
    r.resolved,
    r.winning_prediction,
    r.total_payout,
    r.commission_amount,
    COUNT(b.id) as total_bettors
FROM rounds r
LEFT JOIN bets b ON r.id = b.round_id
GROUP BY r.id, r.start_time, r.end_time, r.total_bets, r.up_bets, r.down_bets, 
         r.resolved, r.winning_prediction, r.total_payout, r.commission_amount;

-- Sample data insertion queries (for testing)
-- INSERT INTO players (address, current_balance) VALUES ('0x1234567890123456789012345678901234567890', 1.5);
-- INSERT INTO rounds (id, start_time, end_time, timeframe_seconds) VALUES (1, NOW(), NOW() + INTERVAL '1 minute', 60);
-- INSERT INTO bets (round_id, player_address, prediction, amount) VALUES (1, '0x1234567890123456789012345678901234567890', true, 0.1);
