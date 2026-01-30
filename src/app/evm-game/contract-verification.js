// Comprehensive test to verify contract interaction and payout system
export async function verifyContractPayouts() {
  try {
    console.log("=== CONTRACT PAYOUT VERIFICATION ===");
    
    // Check if Ethereum provider is available
    if (typeof window === 'undefined' || !window.ethereum) {
      console.log("❌ No Ethereum provider found");
      alert("No Ethereum provider found. Please install MetaMask or another wallet.");
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
    
    // Test 1: Check contract state
    console.log("\n1. Checking contract state...");
    const owner = await contract.owner();
    const houseWallet = await contract.houseWallet();
    const balance = await contract.getHouseWalletBalance();
    
    console.log("Owner:", owner);
    console.log("House wallet:", houseWallet);
    console.log("Contract balance:", ethers.formatEther(balance), "ETH");
    
    // Test 2: Place a small test bet
    console.log("\n2. Placing test bet...");
    const roundId = BigInt(Math.floor(Date.now() / 60000) + 10); // Future round ID
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
    
    // Check results after bet
    console.log("\n3. Checking results after bet...");
    const balanceAfterBet = await contract.getHouseWalletBalance();
    console.log("Contract balance after bet:", ethers.formatEther(balanceAfterBet), "ETH");
    
    const roundInfoAfterBet = await contract.getRound(roundId);
    console.log("Round info after bet:", {
      id: roundInfoAfterBet.id.toString(),
      totalBets: ethers.formatEther(roundInfoAfterBet.totalBets),
      upBets: ethers.formatEther(roundInfoAfterBet.upBets),
      downBets: ethers.formatEther(roundInfoAfterBet.downBets),
      resolved: roundInfoAfterBet.resolved
    });
    
    const betInfoAfterBet = await contract.getBet(roundId, signerAddress);
    console.log("Bet info after bet:", {
      player: betInfoAfterBet.player,
      prediction: betInfoAfterBet.prediction ? "UP" : "DOWN",
      amount: ethers.formatEther(betInfoAfterBet.amount),
      paid: betInfoAfterBet.paid
    });
    
    // Test 3: Simulate round resolution with player as winner
    console.log("\n4. Simulating round resolution...");
    
    // Wait a few seconds to simulate time passing
    console.log("Waiting for round to 'end'...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Resolve round with current player as winner
    console.log("Resolving round with player as winner...");
    const resolveTx = await contract.resolveRound(
      roundId,
      signerAddress, // Winner is current player
      prediction // Winning prediction matches player's bet
    );
    
    console.log("Resolution transaction hash:", resolveTx.hash);
    
    // Wait for confirmation
    console.log("Waiting for resolution confirmation...");
    const resolveReceipt = await resolveTx.wait();
    console.log("Resolution confirmed in block:", resolveReceipt.blockNumber);
    
    // Check final results
    console.log("\n5. Checking final results...");
    const balanceAfterResolution = await contract.getHouseWalletBalance();
    console.log("Contract balance after resolution:", ethers.formatEther(balanceAfterResolution), "ETH");
    
    const finalRoundInfo = await contract.getRound(roundId);
    console.log("Final round info:", {
      resolved: finalRoundInfo.resolved,
      winningPrediction: finalRoundInfo.winningPrediction,
      totalPayout: ethers.formatEther(finalRoundInfo.totalPayout),
      commissionAmount: ethers.formatEther(finalRoundInfo.commissionAmount)
    });
    
    const finalBetInfo = await contract.getBet(roundId, signerAddress);
    console.log("Final bet info:", {
      paid: finalBetInfo.paid
    });
    
    // Calculate expected payout
    const expectedPayout = parseFloat(ethers.formatEther(betAmount)) * 0.95; // 95% after 5% commission
    const actualPayout = parseFloat(ethers.formatEther(finalRoundInfo.totalPayout));
    
    console.log("\n6. Payout verification:");
    console.log("Expected payout:", expectedPayout, "ETH");
    console.log("Actual payout:", actualPayout, "ETH");
    console.log("Difference:", Math.abs(expectedPayout - actualPayout), "ETH");
    
    if (Math.abs(expectedPayout - actualPayout) < 0.0001) {
      console.log("✅ PAYOUT VERIFICATION PASSED!");
      console.log("✅ Players will receive correct payouts when they win!");
      alert("SUCCESS: Contract payout system is working correctly! Players will receive payouts when they win.");
    } else {
      console.log("❌ PAYOUT VERIFICATION FAILED!");
      console.log("❌ There may be an issue with the payout calculation.");
      alert("WARNING: Payout verification failed. There may be an issue with the payout calculation.");
    }
    
    console.log("\n=== VERIFICATION COMPLETE ===");
    
  } catch (error) {
    console.error("❌ ERROR in contract verification:", error);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    alert(`ERROR: ${error.message || "Unknown error occurred during verification"}`);
  }
}