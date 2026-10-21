import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '4050', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // BOT Chain Testnet (Bohr) & Mainnet Configuration
  botRpcUrl: process.env.BOT_RPC_URL || 'https://rpc.bohr.life',
  botChainId: parseInt(process.env.BOT_CHAIN_ID || '968', 10),
  botMainnetRpcUrl: process.env.BOT_MAINNET_RPC_URL || 'https://rpc.botchain.ai',
  botMainnetChainId: 677,

  // Circle Arc Fallback (Preserved for cross-chain compatibility)
  arcRpcUrl: process.env.ARC_RPC_URL || 'https://rpc.mainnet.arc.io',
  arcChainId: parseInt(process.env.ARC_CHAIN_ID || '5042', 10),

  // Token Contracts
  usdtAddress: process.env.USDT_ADDRESS || '0x75edC9335175Fc0552D51D48439F229c10420fe3',
  usdtMainnetAddress: '0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C',
  usdtDecimals: 6,
  usdcAddress: '0x3600000000000000000000000000000000000000',
  usdcDecimals: 6,

  // Escrow Contract
  escrowContractAddress: process.env.ESCROW_CONTRACT_ADDRESS || '0xB128F2f442554B6517D779788F28F2EB2612164A',

  // This release is native-BOT-only. ERC20 (USDT) funding stays disabled until it has live Bohr test evidence.
  enableErc20: process.env.ENABLE_ERC20 === 'true',
};

