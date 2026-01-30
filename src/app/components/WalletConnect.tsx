"use client";

import { useState, useEffect, useRef } from "react";
import { useWalletConnection } from "@/app/hooks/useWalletConnection";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { motion } from "framer-motion";

export function WalletConnect() {
  const {
    walletInfo,
    connectors,
    isConnecting,
    isConnected,
    error,
    connectWallet,
    disconnectWallet,
    copyAddress,
  } = useWalletConnection();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error("Wallet connection error:", error);
    }
  }, [error]);

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Handle wallet connection
  const handleConnect = (connector: any) => {
    connectWallet(connector);
    setIsOpen(false);
    setDropdownOpen(false);
  };

  // Handle wallet disconnection
  const handleDisconnect = () => {
    setDropdownOpen(false);
    setTimeout(() => {
      try {
        disconnectWallet();
      } catch (err) {
        console.error("Disconnect error:", err);
        window.location.reload();
      }
    }, 100);
  };

  // Handle outside clicks for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      // Add a small delay before enabling outside click detection
      // This prevents the dropdown from closing immediately when opened
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [dropdownOpen]);

  // Toggle dropdown visibility
  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <>
      {isConnected && walletInfo ? (
        <div className="relative" ref={dropdownRef}>
          <Button 
            variant="default" 
            className="bg-purple-600 hover:bg-purple-700"
            onClick={toggleDropdown}
          >
            {formatAddress(walletInfo.address)}
          </Button>
          
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-800 rounded-md shadow-lg z-50">
              <div className="px-4 py-2 text-sm text-white">
                {formatAddress(walletInfo.address)}
              </div>
              <div className="px-4 py-2 text-xs text-gray-400">
                {walletInfo.connector}
              </div>
              <button 
                onClick={copyAddress} 
                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 cursor-pointer"
              >
                Copy Address
              </button>
              <button 
                onClick={() => {
                  setDropdownOpen(false);
                  setTimeout(() => setIsOpen(true), 100);
                }} 
                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 cursor-pointer"
              >
                Switch Wallet
              </button>
              <button 
                onClick={handleDisconnect} 
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      ) : (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="default" className="bg-purple-600 hover:bg-purple-700">
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-white">Connect Wallet</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {connectors.map((connector) => (
                <motion.div
                  key={connector.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-14 border-gray-700 hover:bg-gray-800"
                    onClick={() => handleConnect(connector)}
                    disabled={isConnecting}
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                      {connector.name.includes('MetaMask') ? '🦊' : 
                       connector.name.includes('WalletConnect') ? '📱' : '💼'}
                    </div>
                    <span className="text-white">{connector.name}</span>
                  </Button>
                </motion.div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}