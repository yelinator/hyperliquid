// Simple test to verify contract interaction from browser
export async function testContract() {
  try {
    console.log("=== BROWSER CONTRACT TEST ===");
    
    // Check if Ethereum provider is available
    if (typeof window === 'undefined' || !window.ethereum) {
      console.log("❌ No Ethereum provider found");
      return;
    }
    
    console.log("✅ Ethereum provider found");
    
    // Create provider and signer
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();
    
    console.log("Signer address:", signerAddress);
    
    // Contract details
    const contractAddress = "0xbcE06b5E24aed4b99082810C69Cd5995ae179eC2";
    const contractABI = [
      "function placeBet(uint256 roundId, bool prediction, uint256 timeframe) payable public",
      "function resolveRound(uint256 roundId, address winner, bool winningPrediction) public",
      "function getRound(uint256 roundId) public view returns (tuple(uint256 id, uint256 startTime, uint256 endTime, uint256 totalBets, uint256 upBets, uint256 downBets, bool resolved, bool winningPrediction, uint256 totalPayout, uint256 commissionAmount))",
      "function getBet(uint256 roundId, address player) public view returns (tuple(address player, uint256 roundId, bool prediction, uint256 amount, bool paid))",
      "function getRoundPlayers(uint256 roundId) public view returns (address[])",
      "function getHouseWalletBalance() external view returns (uint256)",
      "function owner() public view returns (address)",
      "function houseWallet() public view returns (address)"
    ];
    
    console.log("Contract address:", contractAddress);
    
    // Create contract instance
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    
    // Test reading from contract
    console.log("\n1. Testing contract read functions...");
    const owner = await contract.owner();
    console.log("Owner:", owner);
    
    const houseWallet = await contract.houseWallet();
    console.log("House wallet:", houseWallet);
    
    const balance = await contract.getHouseWalletBalance();
    console.log("Contract balance:", ethers.formatEther(balance), "ETH");
    
    // Test placing a small bet
    console.log("\n2. Testing bet placement...");
    const roundId = BigInt(Math.floor(Date.now() / 60000));
    const prediction = true; // UP
    const timeframe = 60; // 1 minute
    const betAmount = ethers.parseEther("0.001"); // 0.001 ETH
    
    console.log("Round ID:", roundId.toString());
    console.log("Prediction: UP");
    console.log("Timeframe:", timeframe, "seconds");
    console.log("Bet amount:", ethers.formatEther(betAmount), "ETH");
    
    // Place bet
    console.log("Placing bet...");
    const tx = await contract.placeBet(
      roundId,
      prediction,
      timeframe,
      { value: betAmount }
    );
    
    console.log("Transaction hash:", tx.hash);
    
    // Wait for confirmation
    console.log("Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    
    // Check results
    console.log("\n3. Checking results...");
    const balanceAfter = await contract.getHouseWalletBalance();
    console.log("Contract balance after bet:", ethers.formatEther(balanceAfter), "ETH");
    
    const roundInfo = await contract.getRound(roundId);
    console.log("Round info:", {
      id: roundInfo.id.toString(),
      totalBets: ethers.formatEther(roundInfo.totalBets),
      upBets: ethers.formatEther(roundInfo.upBets),
      downBets: ethers.formatEther(roundInfo.downBets),
      resolved: roundInfo.resolved
    });
    
    const betInfo = await contract.getBet(roundId, signerAddress);
    console.log("Bet info:", {
      player: betInfo.player,
      prediction: betInfo.prediction ? "UP" : "DOWN",
      amount: ethers.formatEther(betInfo.amount),
      paid: betInfo.paid
    });
    
    console.log("\n✅ BROWSER CONTRACT TEST PASSED!");
    console.log("The contract is working correctly from the browser.");
    
  } catch (error) {
    console.error("❌ ERROR in browser contract test:", error);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
  }
}