// BOT Chain & Multi-Chain Network Configurations for BotBounty

export const BOT_MAINNET = {
  id: 677,
  chainIdHex: '0x2a5',
  name: 'BOT Chain',
  displayName: 'BOT Chain (Mainnet)',
  rpcUrl: 'https://rpc.botchain.ai',
  explorerUrl: 'https://scan.botchain.ai',
  websiteUrl: 'https://botchain.ai',
  nativeGasToken: 'BOT',
  nativeSymbol: 'BOT',
  usdtAddress: '0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C',
  escrowAddress: '0x909661b453bBe13Ee247551754b35370557A9aA2',
  bridgeUrl: 'https://bridge.botchain.ai',
  isTestnet: false
};

export const BOT_TESTNET = {
  id: 968,
  chainIdHex: '0x3c8',
  name: 'Bohr Testnet',
  displayName: 'BOT Bohr (Testnet)',
  rpcUrl: 'https://rpc.bohr.life',
  explorerUrl: 'https://scan.bohr.life',
  websiteUrl: 'https://botchain.ai',
  nativeGasToken: 'BOT',
  nativeSymbol: 'tBOT',
  usdtAddress: '0x75edC9335175Fc0552D51D48439F229c10420fe3',
  escrowAddress: '0xB128F2f442554B6517D779788F28F2EB2612164A',
  faucetUrl: 'https://faucet.botchain.ai',
  isTestnet: true
};

// Circle Arc Networks (Preserved for cross-chain compatibility)
export const ARC_MAINNET = {
  id: 5042,
  name: 'Arc Mainnet',
  displayName: 'Arc Mainnet',
  rpcUrl: 'https://rpc.mainnet.arc.io',
  explorerUrl: 'https://explorer.arc.io',
  nativeGasToken: 'USDC',
  nativeSymbol: 'USDC',
  canonicalUsdc: '0x3600000000000000000000000000000000000000',
  isTestnet: false
};

export const ARC_TESTNET = {
  id: 5042002,
  name: 'Arc Testnet',
  displayName: 'Arc Testnet',
  rpcUrl: 'https://rpc.testnet.arc.io',
  explorerUrl: 'https://testnet.arcscan.io',
  nativeGasToken: 'USDC',
  nativeSymbol: 'USDC',
  canonicalUsdc: '0x3600000000000000000000000000000000000000',
  isTestnet: true
};

export const SUPPORTED_NETWORKS = [
  BOT_MAINNET,
  BOT_TESTNET,
  ARC_MAINNET,
  ARC_TESTNET
];

export const DEFAULT_NETWORK = BOT_MAINNET;

export function getEscrowAddressForChain(chainId) {
  if (Number(chainId) === 968) return BOT_TESTNET.escrowAddress;
  return BOT_MAINNET.escrowAddress;
}

export function getExplorerUrlForChain(chainId) {
  if (Number(chainId) === 968) return BOT_TESTNET.explorerUrl;
  return BOT_MAINNET.explorerUrl;
}

export function formatTokenAmount(amount, symbol = 'BOT') {
  if (symbol === 'BOT' || symbol === 'tBOT') {
    return `${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 4 })} ${symbol}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function truncateAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
