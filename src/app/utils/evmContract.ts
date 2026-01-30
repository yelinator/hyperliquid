import { ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import { useCallback, useEffect } from 'react';

// EscrowPredictionGame ABI (Sepolia)
const PREDICTION_GAME_ABI = [
	"function deposit() payable",
	"function withdraw(uint256 amount)",
	"function placeBet(uint256 roundId, bool prediction, uint256 timeframe) payable",
	"function placeBetFromBalance(uint256 roundId, bool prediction, uint256 timeframe, uint256 amountWei)",
	"function resolveRound(uint256 roundId, address winner, bool winningPrediction) external",
	"function resolveRoundOpen(uint256 roundId, bool winningPrediction) external",
	"event Deposited(address indexed player, uint256 amount, uint256 newBalance)",
	"event Withdrawn(address indexed player, uint256 amount, uint256 newBalance)",
	"event BalanceUpdated(address indexed player, int256 delta, uint256 newBalance)",
	"event PlayerStatsUpdated(address indexed player, uint256 gamesPlayed, uint256 gamesWon, uint256 totalWagered, uint256 totalPayout)",
	"event RoundResolved(uint256 indexed roundId, bool winner, uint256 totalPayout, uint256 commissionAmount)",
	"event BetPlaced(address indexed player, uint256 indexed roundId, bool prediction, uint256 amount)",
	"event WinningsClaimed(address indexed player, uint256 indexed roundId, uint256 amount)",
	"event CommissionPaid(address indexed houseWallet, uint256 amount)",
	"event WinnerSelected(address indexed winner, uint256 indexed roundId, bool winningPrediction)",
	"event Payout(address indexed player, uint256 indexed roundId, uint256 amount)",
	"function getRound(uint256 roundId) view returns (tuple(uint256 id, uint256 startTime, uint256 endTime, uint256 totalBets, uint256 upBets, uint256 downBets, bool resolved, bool winningPrediction, uint256 totalPayout, uint256 commissionAmount))",
	"function getBet(uint256 roundId, address player) view returns (tuple(address player, uint256 roundId, bool prediction, uint256 amount, bool paid))",
	"function getRoundPlayers(uint256 roundId) view returns (address[])",
	"function getPlayerProfile(address player) view returns (tuple(uint256 balance, uint256 gamesPlayed, uint256 gamesWon, uint256 totalWagered, uint256 totalPayout))",
	"function getPlayerRounds(address player, uint256 offset, uint256 limit) view returns (uint256[])",
	"function getHouseWalletBalance() external view returns (uint256)",
	"function houseWallet() view returns (address)",
	"function owner() view returns (address)"
];

// Deployed contract address (prefer env override)
const PREDICTION_GAME_CONTRACT_ADDRESS = (
	typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_CONTRACT_ADDRESS
) || "0x0F78Ac5c6Ce0973810e0A66a87bbb116Cb88eF59"; // Fixed payout contract address - Sepolia

export function usePredictionGameContract() {
	const { address, isConnected, chain } = useAccount();
	const { data: walletClient } = useWalletClient();

	// Debug logging for wallet connection state
	useEffect(() => {
		console.log('Wallet connection state updated:', { 
			isConnected, 
			address, 
			chainId: chain?.id, 
			chainName: chain?.name,
			hasWalletClient: !!walletClient,
			walletClientType: walletClient?.constructor?.name || typeof walletClient
		});
	}, [isConnected, address, chain, walletClient]);

	const getContract = useCallback(() => {
		console.log('Getting contract with state:', { 
			isConnected, 
			hasWalletClient: !!walletClient, 
			hasAddress: !!address,
			address,
			chainId: chain?.id,
			chainName: chain?.name
		});
		
		// Validate that we're on the correct network (Sepolia testnet)
		if (chain?.id !== 11155111) {
			console.error('Incorrect network. Expected chain ID 11155111 (Sepolia testnet), got:', chain?.id);
			throw new Error('Please switch to Sepolia testnet (chain ID: 11155111)');
		}
		
		if (!isConnected || !walletClient || !address) {
			console.error('Wallet not connected - missing required data:', { 
				isConnected, 
				hasWalletClient: !!walletClient,
				hasAddress: !!address,
				address,
				chainId: chain?.id
			});
			throw new Error('Wallet not connected');
		}

		// Create a provider from the wallet client
		const provider = new ethers.BrowserProvider(walletClient);
		
		// Create contract instance with provider only (for read operations and event subscriptions)
		const contract = new ethers.Contract(
			PREDICTION_GAME_CONTRACT_ADDRESS,
			PREDICTION_GAME_ABI,
			provider
		);
		
		return contract;
	}, [isConnected, walletClient, address, chain]);

	// Subscribe to WinningsClaimed and RoundResolved events (read-only provider; no prompts)
	const onWinningsClaimed = useCallback((handler: (player: string, roundId: bigint, amount: bigint) => void) => {
		try {
			const contract = getContract();
			contract.on('WinningsClaimed', (player: string, roundId: bigint, amount: bigint) => {
				try { handler(player, roundId, amount); } catch {}
			});
			return () => {
				try { contract.removeAllListeners('WinningsClaimed'); } catch {}
			};
		} catch {
			return () => {};
		}
	}, [getContract]);

	const onRoundResolved = useCallback((handler: (roundId: bigint, winnerUp: boolean, totalPayout: bigint, commissionAmount: bigint) => void) => {
		try {
			const contract = getContract();
			contract.on('RoundResolved', (roundId: bigint, winnerUp: boolean, totalPayout: bigint, commissionAmount: bigint) => {
				try { handler(roundId, winnerUp, totalPayout, commissionAmount); } catch {}
			});
			return () => {
				try { contract.removeAllListeners('RoundResolved'); } catch {}
			};
		} catch {
			return () => {};
		}
	}, [getContract]);

	const onHouseWalletDeposit = useCallback((handler: (player: string, amount: bigint) => void) => {
		try {
			const contract = getContract();
			contract.on('HouseWalletDeposit', (player: string, amount: bigint) => {
				try { handler(player, amount); } catch {}
			});
			return () => {
				try { contract.removeAllListeners('HouseWalletDeposit'); } catch {}
			};
		} catch {
			return () => {};
		}
	}, [getContract]);

	const onHouseWalletPayout = useCallback((handler: (player: string, amount: bigint) => void) => {
		try {
			const contract = getContract();
			contract.on('HouseWalletPayout', (player: string, amount: bigint) => {
				try { handler(player, amount); } catch {}
			});
			return () => {
				try { contract.removeAllListeners('HouseWalletPayout'); } catch {}
			};
		} catch {
			return () => {};
		}
	}, [getContract]);

	const onCommissionPaid = useCallback((handler: (houseWallet: string, amount: bigint) => void) => {
		try {
			const contract = getContract();
			contract.on('CommissionPaid', (houseWallet: string, amount: bigint) => {
				try { handler(houseWallet, amount); } catch {}
			});
			return () => {
				try { contract.removeAllListeners('CommissionPaid'); } catch {}
			};
		} catch {
			return () => {};
		}
	}, [getContract]);

	const placeBet = useCallback(async (roundId: number, prediction: boolean, amount: string, timeframe: number = 60) => {
		try {
			console.log('Attempting to place bet with parameters:', { 
				roundId, 
				prediction, 
				amount, 
				timeframe,
				walletState: { 
					isConnected, 
					hasWalletClient: !!walletClient,
					walletClientType: walletClient?.constructor?.name || typeof walletClient,
					hasAddress: !!address,
					address,
					chainId: chain?.id,
					chainName: chain?.name
				}
			});
			
			// Validate that we're on the correct network (Sepolia testnet)
			if (chain?.id !== 11155111) {
				console.error('Incorrect network. Expected chain ID 11155111 (Sepolia testnet), got:', chain?.id);
				throw new Error('Please switch to Sepolia testnet (chain ID: 11155111)');
			}
			
			// Check wallet connection before proceeding
			if (!isConnected || !walletClient || !address) {
				console.error('Wallet not connected when placing bet:', { 
					isConnected, 
					hasWalletClient: !!walletClient,
					walletClientType: walletClient?.constructor?.name || typeof walletClient,
					hasAddress: !!address,
					address,
					chainId: chain?.id
				});
				throw new Error('Wallet not connected');
			}

			// Validate amount
			if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
				throw new Error('Invalid bet amount');
			}

			// Create a provider and get signer for write operations
			const provider = new ethers.BrowserProvider(walletClient);
			console.log('Created provider:', provider);
			
			const signer = await provider.getSigner();
			console.log('Got signer:', signer);
			
			// Create contract instance with signer
			const contract = new ethers.Contract(
				PREDICTION_GAME_CONTRACT_ADDRESS,
				PREDICTION_GAME_ABI,
				signer
			);
			console.log('Created contract instance:', contract);
			
			// Validate that the contract address is correct
			console.log('Contract address:', contract.target);
			console.log('Expected contract address:', PREDICTION_GAME_CONTRACT_ADDRESS);
			
			// For ETH, we need to send it as value in the transaction
			const betAmount = ethers.parseEther(amount);
			console.log('Bet amount in wei:', betAmount.toString());
			
			const tx = await contract.placeBet(roundId, prediction, timeframe, {
				value: betAmount
			});
			
			console.log('Transaction sent:', tx.hash);
			await tx.wait();
			console.log('Transaction confirmed:', tx.hash);
			return tx.hash;
		} catch (error: any) {
			console.error('Error placing bet:', error);
			console.error('Error details:', {
				message: error.message,
				code: error.code,
				reason: error.reason,
				transaction: error.transaction,
				stack: error.stack
			});
			throw error;
		}
	}, [isConnected, walletClient, address, chain]);

	// Resolve round (owner only). Requires explicit winner and winning prediction.
	const resolveRound = useCallback(async (roundId: number, winner: string, winningPrediction: boolean) => {
		try {
			if (!isConnected || !walletClient || !address) {
				throw new Error('Wallet not connected');
			}
			const provider = new ethers.BrowserProvider(walletClient);
			const signer = await provider.getSigner();
			const contract = new ethers.Contract(
				PREDICTION_GAME_CONTRACT_ADDRESS,
				PREDICTION_GAME_ABI,
				signer
			);
			const tx = await contract.resolveRound(roundId, winner, winningPrediction);
			await tx.wait();
			return tx.hash;
		} catch (error) {
			console.error('Error resolving round:', error);
			throw error;
		}
	}, [isConnected, walletClient, address]);

	// Resolve round (permissionless). Auto-detects winner from bets.
	const resolveRoundOpen = useCallback(async (roundId: number, winningPrediction: boolean) => {
		try {
			if (!isConnected || !walletClient || !address) {
				throw new Error('Wallet not connected');
			}
			const provider = new ethers.BrowserProvider(walletClient);
			const signer = await provider.getSigner();
			const contract = new ethers.Contract(
				PREDICTION_GAME_CONTRACT_ADDRESS,
				PREDICTION_GAME_ABI,
				signer
			);
			const tx = await contract.resolveRoundOpen(roundId, winningPrediction);
			await tx.wait();
			return tx.hash;
		} catch (error) {
			console.error('Error resolving round open:', error);
			throw error;
		}
	}, [isConnected, walletClient, address]);

	const getRoundInfo = useCallback(async (roundId: number) => {
		try {
			const contract = getContract();
			const roundInfo = await contract.getRound(roundId);
			return roundInfo;
		} catch (error) {
			console.error('Error getting round info:', error);
			throw error;
		}
	}, [getContract]);

	const getUserBet = useCallback(async (roundId: number) => {
		try {
			if (!address) throw new Error('No address provided');
			const contract = getContract();
			const userBet = await contract.getBet(roundId, address);
			return userBet;
		} catch (error) {
			console.error('Error getting user bet:', error);
			throw error;
		}
	}, [getContract, address]);

	// Get any player's bet for a round (owner or resolver use)
	const getPlayerBet = useCallback(async (roundId: number, playerAddress: string) => {
		try {
			const contract = getContract();
			const bet = await contract.getBet(roundId, playerAddress);
			return bet;
		} catch (error) {
			console.error('Error getting player bet:', error);
			throw error;
		}
	}, [getContract]);

	// Deposit ETH into internal balance
	const deposit = useCallback(async (amount: string) => {
		try {
			if (!isConnected || !walletClient || !address) {
				throw new Error('Wallet not connected');
			}
			
			if (chain?.id !== 11155111) {
				throw new Error('Please switch to Sepolia testnet');
			}

			const provider = new ethers.BrowserProvider(walletClient);
			const signer = await provider.getSigner();
			const contract = new ethers.Contract(
				PREDICTION_GAME_CONTRACT_ADDRESS,
				PREDICTION_GAME_ABI,
				signer
			);

			const depositAmount = ethers.parseEther(amount);
			const tx = await contract.deposit({ value: depositAmount });
			await tx.wait();
			return tx.hash;
		} catch (error) {
			console.error('Error depositing:', error);
			throw error;
		}
	}, [isConnected, walletClient, address, chain]);

	// Withdraw ETH from internal balance
	const withdraw = useCallback(async (amount: string) => {
		try {
			if (!isConnected || !walletClient || !address) {
				throw new Error('Wallet not connected');
			}
			
			if (chain?.id !== 11155111) {
				throw new Error('Please switch to Sepolia testnet');
			}

			const provider = new ethers.BrowserProvider(walletClient);
			const signer = await provider.getSigner();
			const contract = new ethers.Contract(
				PREDICTION_GAME_CONTRACT_ADDRESS,
				PREDICTION_GAME_ABI,
				signer
			);

			const withdrawAmount = ethers.parseEther(amount);
			const tx = await contract.withdraw(withdrawAmount);
			await tx.wait();
			return tx.hash;
		} catch (error) {
			console.error('Error withdrawing:', error);
			throw error;
		}
	}, [isConnected, walletClient, address, chain]);

	// Place bet using internal balance (NO ETH sent from wallet, only gas fees)
	const placeBetFromBalance = useCallback(async (roundId: number, prediction: boolean, amount: string, timeframe: number = 60) => {
		try {
			console.log('🎯 PLACING BET FROM DEPOSIT BALANCE (no ETH sent from wallet)');
			console.log('Parameters:', { roundId, prediction, amount, timeframe });
			
			if (!isConnected || !walletClient || !address) {
				throw new Error('Wallet not connected');
			}
			
			if (chain?.id !== 11155111) {
				throw new Error('Please switch to Sepolia testnet');
			}

			const provider = new ethers.BrowserProvider(walletClient);
			const signer = await provider.getSigner();
			const contract = new ethers.Contract(
				PREDICTION_GAME_CONTRACT_ADDRESS,
				PREDICTION_GAME_ABI,
				signer
			);

			const betAmount = ethers.parseEther(amount);
			console.log('Bet amount in wei:', betAmount.toString());
			console.log('⚠️ IMPORTANT: This transaction sends 0 ETH. Only gas fees will be deducted from your wallet.');
			console.log('The bet amount will be deducted from your deposit balance inside the contract.');
			
			const tx = await contract.placeBetFromBalance(roundId, prediction, timeframe, betAmount);
			console.log('✅ Transaction sent (no ETH value):', tx.hash);
			await tx.wait();
			console.log('✅ Transaction confirmed:', tx.hash);
			return tx.hash;
		} catch (error) {
			console.error('Error placing bet from balance:', error);
			throw error;
		}
	}, [isConnected, walletClient, address, chain]);

	// Get House Wallet balance
	const getHouseWalletBalance = useCallback(async () => {
		try {
			const contract = getContract();
			const balance = await contract.getHouseWalletBalance();
			return balance;
		} catch (error) {
			console.error('Error getting house wallet balance:', error);
			throw error;
		}
	}, [getContract]);

	// Get player profile (balance and stats)
	const getPlayerProfile = useCallback(async () => {
		try {
			if (!address) {
				return {
					balance: BigInt(0),
					gamesPlayed: BigInt(0),
					gamesWon: BigInt(0),
					totalWagered: BigInt(0),
					totalPayout: BigInt(0)
				};
			}
			// Prefer read-only RPC provider to avoid wallet popups when just viewing
			const publicRpc = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_SEPOLIA_RPC_URL) || 'https://ethereum-sepolia-rpc.publicnode.com';
			const provider = walletClient && isConnected
				? new ethers.BrowserProvider(walletClient)
				: new ethers.JsonRpcProvider(publicRpc);
			const contract = new ethers.Contract(PREDICTION_GAME_CONTRACT_ADDRESS, PREDICTION_GAME_ABI, provider);
			const code = await provider.getCode(PREDICTION_GAME_CONTRACT_ADDRESS);
			if (!code || code === '0x') {
				return {
					balance: BigInt(0),
					gamesPlayed: BigInt(0),
					gamesWon: BigInt(0),
					totalWagered: BigInt(0),
					totalPayout: BigInt(0)
				};
			}
			const profile = await contract.getPlayerProfile(address);
			return profile;
		} catch (error) {
			console.error('Error getting player profile:', error);
			return {
				balance: BigInt(0),
				gamesPlayed: BigInt(0),
				gamesWon: BigInt(0),
				totalWagered: BigInt(0),
				totalPayout: BigInt(0)
			};
		}
	}, [address, isConnected, walletClient]);

	// Get player's round history
	const getPlayerRounds = useCallback(async (offset: number = 0, limit: number = 10) => {
		try {
			if (!address) throw new Error('No address provided');
			const contract = getContract();
			const rounds = await contract.getPlayerRounds(address, offset, limit);
			return rounds;
		} catch (error) {
			console.error('Error getting player rounds:', error);
			throw error;
		}
	}, [getContract, address]);

	// Get all players in a round
	const getRoundPlayers = useCallback(async (roundId: number) => {
		try {
			const contract = getContract();
			const players = await contract.getRoundPlayers(roundId);
			return players;
		} catch (error) {
			console.error('Error getting round players:', error);
			throw error;
		}
	}, [getContract]);

	// Get house wallet address
	const getHouseWallet = useCallback(async () => {
		try {
			const contract = getContract();
			const houseWallet = await contract.houseWallet();
			return houseWallet;
		} catch (error) {
			console.error('Error getting house wallet:', error);
			throw error;
		}
	}, [getContract]);

	// Resolve round on-chain (permissionless - uses resolveRoundOpen which auto-detects winner)
	const resolveRoundOnChain = useCallback(async (roundId: number, winningPrediction: boolean) => {
		try {
			if (!isConnected || !walletClient || !address) {
				throw new Error('Wallet not connected');
			}
			
			if (chain?.id !== 11155111) {
				throw new Error('Please switch to Sepolia testnet');
			}

			const provider = new ethers.BrowserProvider(walletClient);
			const signer = await provider.getSigner();
			const contract = new ethers.Contract(
				PREDICTION_GAME_CONTRACT_ADDRESS,
				PREDICTION_GAME_ABI,
				signer
			);

			// Use resolveRoundOpen which auto-detects winner
			const tx = await contract.resolveRoundOpen(roundId, winningPrediction);
			await tx.wait();
			return tx.hash;
		} catch (error) {
			console.error('Error resolving round:', error);
			throw error;
		}
	}, [isConnected, walletClient, address, chain]);

	// Helper function to parse ether values
	const parseEther = (amount: string) => {
		return ethers.parseEther(amount);
	};

	// Helper function to format ether values
	const formatEther = (amount: bigint) => {
		return ethers.formatEther(amount);
	};

	return {
		// Deposit/Withdraw functions
		deposit,
		withdraw,
		placeBetFromBalance,
		getPlayerProfile,
		getPlayerRounds,
		getHouseWalletBalance,
		getHouseWallet,
		// Round resolution functions
		resolveRound,
		resolveRoundOpen,
		resolveRoundOnChain,
		getRoundPlayers,
		onWinningsClaimed,
		onRoundResolved,
		onHouseWalletDeposit,
		onHouseWalletPayout,
		onCommissionPaid,
		// Existing functions
		placeBet,
		getRoundInfo,
		getUserBet,
		getPlayerBet,
		getContract,
		parseEther,
		formatEther,
		isConnected,
		address
	};
}