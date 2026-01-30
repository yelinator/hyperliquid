const { ethers } = require("ethers");

// Contract ABI
const KAIROS_CONTRACT_ABI = [
  "function placeBet(uint256 roundId, bool prediction, uint256 timeframe) payable public",
  "function resolveRound(uint256 roundId, uint256 timeframe) public",
  "function getRound(uint256 roundId) public view returns (tuple(uint256 id, uint256 startTime, uint256 endTime, uint256 totalBets, uint256 upBets, uint256 downBets, bool resolved, bool suspended, bool startRecorded, bool winningPrediction, int256 startPriceRaw, int256 startExpo, uint256 startTimestamp, int256 endPriceRaw, int256 endExpo, uint256 endTimestamp, uint256 totalPayout, uint256 commissionAmount))",
  "function getBet(uint256 roundId, address player) public view returns (tuple(address player, uint256 roundId, bool prediction, uint256 amount, bool claimed))",
  "function getRoundPlayers(uint256 roundId) public view returns (address[])",
  "function getHouseWalletBalance() public view returns (uint256)",
  "function owner() public view returns (address)",
  "function comparePrices(int256 startPrice, int256 startExpo, int256 endPrice, int256 endExpo) external pure returns (bool)"
];

// Contract address
const KAIROS_CONTRACT_ADDRESS = "0xbcE06b5E24aed4b99082810C69Cd5995ae179eC2";

async function testContract() {
  // Connect to Sepolia testnet
  const provider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID");
  
  // Use a private key for testing (NEVER USE THIS PRIVATE KEY IN PRODUCTION)
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // This is the default Hardhat private key
  const wallet = new ethers.Wallet(privateKey, provider);
  
  // Create contract instance
  const contract = new ethers.Contract(KAIROS_CONTRACT_ADDRESS, KAIROS_CONTRACT_ABI, wallet);
  
  console.log("Testing contract interaction...");
  
  try {
    // Check initial contract balance
    const initialBalance = await contract.getContractBalance();
    console.log("Initial contract balance:", ethers.formatEther(initialBalance), "ETH");
    
    // Place a bet
    console.log("Placing bet...");
    const tx = await contract.placeBet(
      1, // roundId
      true, // prediction (UP)
      60, // timeframe (1 minute)
      { value: ethers.parseEther("0.1") } // 0.1 ETH bet
    );
    
    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    console.log("Bet placed successfully!");
    
    // Check house wallet balance after bet
    const balanceAfterBet = await contract.getHouseWalletBalance();
    console.log("House wallet balance after bet:", ethers.formatEther(balanceAfterBet), "ETH");
    
    // Wait for round to end (simulate time passing)
    console.log("Waiting for round to end...");
    await new Promise(resolve => setTimeout(resolve, 65000)); // Wait 65 seconds
    
    // Resolve the round
    console.log("Resolving round...");
    const resolveTx = await contract.resolveRound(1, 60); // roundId, timeframe
    console.log("Resolution transaction hash:", resolveTx.hash);
    await resolveTx.wait();
    console.log("Round resolved successfully!");
    
    // Check final contract balance
    const finalBalance = await contract.getHouseWalletBalance();
    console.log("Final contract balance:", ethers.formatEther(finalBalance), "ETH");
    
    // Get round info
    const roundInfo = await contract.getRound(1);
    console.log("Round info:", {
      resolved: roundInfo.resolved,
      winningPrediction: roundInfo.winningPrediction,
      totalPayout: ethers.formatEther(roundInfo.totalPayout),
      commissionAmount: ethers.formatEther(roundInfo.commissionAmount)
    });
    
    // Get bet info
    const betInfo = await contract.getBet(1, wallet.address);
    console.log("Bet info:", {
      player: betInfo.player,
      prediction: betInfo.prediction,
      amount: ethers.formatEther(betInfo.amount),
      paid: betInfo.paid
    });
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testContract();