"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useEnhancedWalletConnection } from "@/app/hooks/useEnhancedWalletConnection";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { motion } from "framer-motion";
import { 
  Search, 
  Copy, 
  LogOut, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Wallet as WalletIconDefault
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import { useRouter } from "next/navigation";

// Inspect injected provider to brand the "Injected" connector correctly
const detectInjectedBrand = () => {
  if (typeof window === 'undefined') return null;
  const ethereum: any = (window as any).ethereum;
  if (!ethereum) return null;
  const provider = Array.isArray(ethereum?.providers)
    ? ethereum.providers.find((p: any) => p.isMetaMask || p.isCoinbaseWallet || p.okxwallet || p.isOkxWallet) || ethereum.providers[0]
    : ethereum;
  if (provider?.isMetaMask) return { key: 'metamask', label: 'MetaMask' };
  if (provider?.isCoinbaseWallet) return { key: 'coinbase', label: 'Coinbase Wallet' };
  if (provider?.okxwallet || provider?.isOkxWallet) return { key: 'okx', label: 'OKX Wallet' };
  return { key: 'injected', label: 'Injected' };
};

// Logo mapping for popular wallets (served from /public)
const getWalletLogo = (walletName: string) => {
  const name = walletName.toLowerCase();
  if (name.includes("metamask")) return { src: "/metamask.svg", alt: "MetaMask" };
  if (name.includes("coinbase")) return { src: "/coinbase.svg", alt: "Coinbase Wallet" };
  if (name.includes("walletconnect")) return { src: "/walletconnect.svg", alt: "WalletConnect" };
  if (name.includes("okx") || name.includes("okx wallet") || name.includes("okxweb3")) return { src: "/okx.svg", alt: "OKX Wallet" };
  if (name === 'injected') {
    const detected = detectInjectedBrand();
    if (detected?.key === 'metamask') return { src: "/metamask.svg", alt: "MetaMask" };
    if (detected?.key === 'coinbase') return { src: "/coinbase.svg", alt: "Coinbase Wallet" };
    if (detected?.key === 'okx') return { src: "/okx.svg", alt: "OKX Wallet" };
  }
  return { src: "/walletconnect.svg", alt: "Wallet" }; // fallback generic
};

export function EnhancedWalletConnect() {
  const {
    walletInfo,
    connectors,
    isConnecting,
    isDisconnecting, // Add isDisconnecting
    isSwitchingChain,
    chainSwitchError,
    isConnected,
    error,
    connectWallet,
    disconnectWallet,
    copyAddress,
    formatAddress,
    switchToSepoliaChain,
    refetchEthBalance,
  } = useEnhancedWalletConnection();
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const injectedBrand = detectInjectedBrand();

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error("Wallet connection error:", error);
    }
  }, [error]);

  // Handle copy feedback
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // Handle wallet connection
  const handleConnect = (connector: any) => {
    // Check if MetaMask is installed for MetaMask connector
    if (connector.name.includes('MetaMask') && typeof window !== 'undefined') {
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        alert('MetaMask not detected. Please install MetaMask extension and refresh the page.');
        return;
      }
    }
    
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
        // Close the dropdown immediately after initiating disconnect
        setDropdownOpen(false);
      } catch (err) {
        console.error("Disconnect error:", err);
        // Additional cleanup
        if (typeof window !== 'undefined') {
          localStorage.removeItem('wagmi.connected');
          localStorage.removeItem('wagmi.store');
          localStorage.removeItem('wagmi.wallet');
          sessionStorage.removeItem('wagmi.connected');
          sessionStorage.removeItem('wagmi.store');
          sessionStorage.removeItem('wagmi.wallet');
        }
        // Force reload as fallback
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
    // Refetch balance when opening dropdown
    if (isConnected && refetchEthBalance) {
      console.log('Refetching balance...');
      refetchEthBalance().then((result) => {
        console.log('Balance refetch result:', result);
      }).catch((error) => {
        console.error('Balance refetch error:', error);
      });
    }
    setDropdownOpen(!dropdownOpen);
  };

  // Handle copy address
  const handleCopyAddress = () => {
    copyAddress();
    setCopied(true);
  };

  // Handle switch wallet
  const handleSwitchWallet = () => {
    setDropdownOpen(false);
    setTimeout(() => {
      setIsOpen(true);
    }, 100);
  };

  // Filter connectors based on search term
  const filteredConnectors = connectors.filter(connector => 
    connector.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show connection status
  const getConnectionStatus = () => {
    if (isConnecting) return "Connecting...";
    if (isDisconnecting) return "Disconnecting..."; // Add disconnecting state
    if (isSwitchingChain) return "Switching chain...";
    return "Connect Wallet";
  };

  // Get wallet logo element
  const renderWalletLogo = useCallback((walletName: string) => {
    const { src, alt } = getWalletLogo(walletName);
    return (
      <Image
        src={src}
        alt={alt}
        width={32}
        height={32}
        className="rounded-md"
        priority
      />
    );
  }, []);

  // Pixel/retro style helpers
  const pixelButtonClass =
    "px-5 py-3 border-2 border-purple-400 bg-purple-700 text-white " +
    "hover:bg-purple-800 active:translate-y-[2px] transition-transform " +
    "rounded-none shadow-[4px_4px_0_0_rgba(0,0,0,0.6)] font-mono uppercase tracking-wider text-sm";

  const pixelDangerButtonClass =
    "w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-red-300 " +
    "border-2 border-red-500 bg-red-800/30 hover:bg-red-800/50 rounded-none " +
    "shadow-[3px_3px_0_0_rgba(0,0,0,0.6)]";

  const pixelMenuButtonClass =
    "w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-white " +
    "border-2 border-gray-600 bg-gray-800 hover:bg-gray-700 rounded-none " +
    "shadow-[3px_3px_0_0_rgba(0,0,0,0.6)]";

  const pixelCardClass =
    "border-2 border-gray-700 bg-gray-900/95 rounded-none p-3 " +
    "shadow-[6px_6px_0_0_rgba(0,0,0,0.7)]";

  const pixelBadgeClass =
    "text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 border-2 border-yellow-700 rounded-none";

  return (
    <ConnectButton.Custom>
      {({ openConnectModal }) => (
        <>
          {isConnected && walletInfo ? (
            <div className="relative" ref={dropdownRef}>
              <button
                className={pixelButtonClass}
                disabled={isSwitchingChain || isDisconnecting}
                onClick={toggleDropdown}
              >
                {isSwitchingChain || isDisconnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white flex items-center justify-center border-2 border-purple-400 shadow-[3px_3px_0_0_rgba(0,0,0,0.6)]">
                      <WalletIconDefault className="w-4 h-4 text-purple-700" />
                    </div>
                    <span className="font-medium">{formatAddress(walletInfo.address)}</span>
                    <span className={pixelBadgeClass}>TESTNET</span>
                  </div>
                )}
              </button>

              {dropdownOpen && (
                <div
                  className={`absolute right-0 mt-2 w-64 ${pixelCardClass} z-50`}
                  style={{
                    imageRendering: "pixelated",
                    backgroundImage:
                      "repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 4px)",
                  }}
                >
                  <div className="px-3 py-2 text-sm font-bold text-white border-b-2 border-gray-700 tracking-widest">
                    WALLET MENU
                  </div>
                  <button 
                    onClick={() => { setDropdownOpen(false); router.push('/profile'); }} 
                    onMouseEnter={() => (window as any).prefetchRoute?.('/profile')}
                    className={pixelMenuButtonClass}
                  >
                    <img src="/images/pf.gif" alt="Profile" width={20} height={20} loading="lazy" decoding="async" className="w-5 h-5 border-2 border-gray-600 bg-black object-cover" style={{ imageRendering: 'pixelated' }} />
                    <span>Profile</span>
                  </button>
                  <button 
                    onClick={() => { setDropdownOpen(false); router.push('/deposit'); }} 
                    onMouseEnter={() => (window as any).prefetchRoute?.('/deposit')}
                    className={pixelMenuButtonClass}
                  >
                    <img src="/images/deposit.gif" alt="Deposit" width={20} height={20} loading="lazy" decoding="async" className="w-5 h-5 border-2 border-gray-600 bg-black object-cover" style={{ imageRendering: 'pixelated' }} />
                    <span>Deposit</span>
                  </button>
                  <button 
                    onClick={() => { setDropdownOpen(false); router.push('/withdraw'); }} 
                    onMouseEnter={() => (window as any).prefetchRoute?.('/withdraw')}
                    className={pixelMenuButtonClass}
                  >
                    <img src="/images/withdraw.gif" alt="Withdraw" width={20} height={20} loading="lazy" decoding="async" className="w-5 h-5 border-2 border-gray-600 bg-black object-cover" style={{ imageRendering: 'pixelated' }} />
                    <span>Withdraw</span>
                  </button>
                  <button 
                    onClick={handleDisconnect} 
                    className={pixelDangerButtonClass}
                  >
                    <LogOut size={18} />
                    <span>Disconnect</span>
                  </button>
      </div>
              )}
      </div>
          ) : (
            <button
              className={pixelButtonClass}
              disabled={isConnecting || isDisconnecting || isSwitchingChain}
              onClick={openConnectModal}
            >
              {isConnecting || isDisconnecting || isSwitchingChain ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {getConnectionStatus()}
                </>
              ) : (
                "Connect Wallet"
              )}
            </button>
          )}
        </>
      )}
    </ConnectButton.Custom>
  );
}

// Fallback component for when RainbowKit is disabled (kept for provider switching)
export function CustomWalletConnect() {
  const {
    walletInfo,
    connectors,
    isConnecting,
    isDisconnecting,
    isSwitchingChain,
    chainSwitchError,
    isConnected,
    error,
    connectWallet,
    disconnectWallet,
    copyAddress,
    formatAddress,
    switchToSepoliaChain,
    refetchEthBalance,
  } = useEnhancedWalletConnection();
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const injectedBrand = detectInjectedBrand();

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error("Wallet connection error:", error);
    }
  }, [error]);

  // Handle copy feedback
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // Handle wallet connection
  const handleConnect = (connector: any) => {
    if (connector.name.includes('MetaMask') && typeof window !== 'undefined') {
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        alert('MetaMask not detected. Please install MetaMask extension and refresh the page.');
        return;
      }
    }
    
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
        setDropdownOpen(false);
      } catch (err) {
        console.error("Disconnect error:", err);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('wagmi.connected');
          localStorage.removeItem('wagmi.store');
          localStorage.removeItem('wagmi.wallet');
          sessionStorage.removeItem('wagmi.connected');
          sessionStorage.removeItem('wagmi.store');
          sessionStorage.removeItem('wagmi.wallet');
        }
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
    if (isConnected && refetchEthBalance) {
      console.log('Refetching balance...');
      refetchEthBalance().then((result) => {
        console.log('Balance refetch result:', result);
      }).catch((error) => {
        console.error('Balance refetch error:', error);
      });
    }
    setDropdownOpen(!dropdownOpen);
  };

  // Handle copy address
  const handleCopyAddress = () => {
    copyAddress();
    setCopied(true);
  };

  // Handle switch wallet
  const handleSwitchWallet = () => {
    setDropdownOpen(false);
    setTimeout(() => {
      setIsOpen(true);
    }, 100);
  };

  // Filter connectors based on search term
  const filteredConnectors = connectors.filter(connector => 
    connector.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show connection status
  const getConnectionStatus = () => {
    if (isConnecting) return "Connecting...";
    if (isDisconnecting) return "Disconnecting...";
    if (isSwitchingChain) return "Switching chain...";
    return "Connect Wallet";
  };

  // Get wallet logo element
  const renderWalletLogo = useCallback((walletName: string) => {
    const { src, alt } = getWalletLogo(walletName);
    return (
      <Image
        src={src}
        alt={alt}
        width={32}
        height={32}
        className="rounded-md"
        priority
      />
    );
  }, []);

  return (
    <>
      {isConnected && walletInfo ? (
        <div className="relative" ref={dropdownRef}>
          <Button 
            variant="default" 
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg"
            disabled={isSwitchingChain || isDisconnecting}
            onClick={toggleDropdown}
          >
            {isSwitchingChain || isDisconnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow">
                  <WalletIconDefault className="w-5 h-5 text-purple-600" />
                </div>
                <span className="font-medium">{formatAddress(walletInfo.address)}</span>
                <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">Testnet</span>
              </div>
            )}
          </Button>
          
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-gray-900/90 backdrop-blur-lg border border-gray-700 rounded-xl shadow-2xl z-50 p-3">
              <div className="px-3 py-2 text-lg font-bold text-white border-b border-gray-700">
                Wallet Connected
              </div>
              <div className="px-3 py-2 text-sm font-medium text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                  <WalletIconDefault className="w-5 h-5 text-white" />
                </div>
                {formatAddress(walletInfo.address)}
              </div>
              <div className="px-3 py-1.5 text-xs text-gray-400">
                Connected with {walletInfo.connector}
              </div>
              <div className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-700 pb-3">
                Deposit Balance: {walletInfo?.balance?.eth !== undefined ? `${walletInfo.balance.eth.toFixed(4)} ETH` : '0.0000 ETH'}
              </div>
              {chainSwitchError && (
                <div className="px-3 py-2 text-xs text-yellow-400 flex items-center gap-2 bg-yellow-900/20 rounded-lg my-2">
                  <AlertCircle size={16} />
                  <span>{chainSwitchError}</span>
                </div>
              )}
              <button 
                onClick={() => { setDropdownOpen(false); window.location.href = '/profile'; }} 
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-white hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
              >
                <span className="text-lg">👤</span>
                <span>Profile</span>
              </button>
              <button 
                onClick={() => { setDropdownOpen(false); window.location.href = '/deposit'; }} 
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-white hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
              >
                <span className="text-lg">💰</span>
                <span>Deposit</span>
              </button>
              <button 
                onClick={() => { setDropdownOpen(false); window.location.href = '/withdraw'; }} 
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-white hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
              >
                <span className="text-lg">💸</span>
                <span>Withdraw</span>
              </button>
              <button 
                onClick={handleCopyAddress} 
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-white hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle size={18} className="text-green-400" />
                    <span>Copied to clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    <span>Copy Address</span>
                  </>
                )}
              </button>
              <button 
                onClick={handleSwitchWallet} 
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-white hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
              >
                <Search size={18} />
                <span>Switch Wallet</span>
              </button>
              <button 
                onClick={handleDisconnect} 
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-900/20 rounded-lg cursor-pointer transition-colors"
              >
                <LogOut size={18} />
                <span>Disconnect</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="default" 
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-4 py-2 rounded-lg shadow-lg"
              disabled={isConnecting || isDisconnecting || isSwitchingChain}
            >
              {isConnecting || isDisconnecting || isSwitchingChain ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {getConnectionStatus()}
                </>
              ) : (
                "Connect Wallet"
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-gray-900/90 backdrop-blur-lg border border-gray-700 p-0 rounded-2xl shadow-2xl">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-white text-center text-2xl font-bold">Connect Wallet</DialogTitle>
              <p className="text-gray-400 text-center text-sm mt-1">Choose your preferred wallet to connect</p>
            </DialogHeader>
            <div className="p-6">
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search wallets..."
                  className="w-full bg-gray-800/50 text-white rounded-xl pl-12 pr-4 py-3 border border-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {filteredConnectors.map((connector) => (
                  <motion.div
                    key={connector.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-4 h-16 border-gray-700 hover:bg-gray-800/50 transition-all duration-200 rounded-xl bg-gray-800/30 backdrop-blur-sm"
                      onClick={() => handleConnect(connector)}
                      disabled={isConnecting || isDisconnecting || isSwitchingChain}
                    >
                      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-lg overflow-hidden">
                        {renderWalletLogo(connector.id === 'injected' ? (injectedBrand?.label || 'Injected') : connector.name)}
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-white font-semibold text-base">{connector.id === 'injected' ? (injectedBrand?.label || 'Injected') : connector.name}</span>
                        <span className="text-gray-400 text-sm">Connect to {connector.id === 'injected' ? (injectedBrand?.label || 'Injected') : connector.name}</span>
                      </div>
                    </Button>
                  </motion.div>
                ))}
                
                {filteredConnectors.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <div className="flex justify-center mb-2">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    No wallets found
                  </div>
                )}
              </div>
              
              {(error || chainSwitchError) && (
                <div className="mt-4 p-4 bg-red-900/20 border border-red-800 rounded-xl text-red-300 text-sm flex items-start gap-2">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                  <span>{error?.message || chainSwitchError || "Failed to connect wallet"}</span>
                </div>
              )}
              
              <div className="mt-6 text-center text-xs text-gray-500">
                By connecting, you agree to the Terms of Service and Privacy Policy
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}