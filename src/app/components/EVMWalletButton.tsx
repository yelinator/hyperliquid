"use client";

import { useEffect, useState } from "react";
import { usePredictionGameContract } from "../utils/evmContract";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function EVMWalletButton({ onConnect, onDisconnect }: { onConnect?: (account: string) => void; onDisconnect?: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [depositBalance, setDepositBalance] = useState<number>(0);
  
  const { getPlayerProfile, formatEther, isConnected } = usePredictionGameContract();

  useEffect(() => {
    setMounted(true);
    
    // Check if wallet is already connected
    const checkConnection = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ 
            method: "eth_accounts" 
          });
          
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            if (onConnect) {
              console.log('Calling onConnect callback for initial connection');
              onConnect(accounts[0]);
            }
          }
        } catch (error) {
          console.error("Error checking wallet connection:", error);
        }
      }
    };
    
    checkConnection();
    
    // Listen for account changes
    const handleAccountsChanged = (accounts: string[]) => {
      console.log('Accounts changed in wallet button:', accounts);
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        if (onConnect) {
          console.log('Calling onConnect callback for account change');
          onConnect(accounts[0]);
        }
        setDepositBalance(0);
      } else {
        setAccount(null);
        setDepositBalance(0);
        if (onDisconnect) {
          console.log('Calling onDisconnect callback for account change');
          onDisconnect();
        }
      }
    };
    
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      }
    };
  }, []);

  // Fetch deposit balance when connected
  useEffect(() => {
    const fetchDepositBalance = async () => {
      if (account && isConnected) {
        try {
          const profile = await getPlayerProfile();
          if (profile && formatEther) {
            const balance = parseFloat(formatEther(profile.balance));
            setDepositBalance(balance);
          }
        } catch (error) {
          console.error("Failed to fetch deposit balance:", error);
          setDepositBalance(0);
        }
      }
    };

    fetchDepositBalance();
  }, [account, isConnected, getPlayerProfile, formatEther]);

  const connectWallet = async () => {
    console.log('Connecting wallet...');
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ 
          method: "eth_requestAccounts" 
        });
        console.log('Wallet connected:', accounts[0]);
        setAccount(accounts[0]);
        if (onConnect) {
          console.log('Calling onConnect callback');
          onConnect(accounts[0]);
        }
      } catch (error: any) {
        console.error("Failed to connect wallet:", error);
        // Handle specific WalletConnect errors
        if (error.message && error.message.includes("Origin not found on Allowlist")) {
          alert("WalletConnect configuration error. Please contact the site administrator.");
        } else {
          alert("Failed to connect wallet. Please try again.");
        }
      }
    } else {
      alert("Please install MetaMask or another EVM wallet extension");
    }
  };

  const disconnectWallet = () => {
    console.log('Disconnecting wallet');
    setAccount(null);
    setDepositBalance(0);
    if (onDisconnect) {
      console.log('Calling onDisconnect callback');
      onDisconnect();
    }
  };

  if (!mounted) {
    return (
      <button className="glass-button px-4 py-2 rounded-lg font-medium">
        Connect Wallet
      </button>
    );
  }

  // Show connected wallet address and deposit balance when connected, otherwise show "Connect Wallet"
  let buttonText = "Connect Wallet";
  if (account) {
    const address = `${account.substring(0, 6)}...${account.substring(account.length - 4)}`;
    buttonText = `${address} (${depositBalance.toFixed(4)} ETH)`;
  }

  return (
    <button 
      className="glass-button px-4 py-2 rounded-lg font-medium"
      onClick={account ? disconnectWallet : connectWallet}
      style={{ minWidth: "150px" }}
    >
      {buttonText}
    </button>
  );
}