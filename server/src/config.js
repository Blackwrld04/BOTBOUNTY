import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '4050', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // BOT Chain Mainnet (677) & Bohr Testnet (968) Configuration
  botRpcUrl: process.env.BOT_RPC_URL || 'https://rpc.botchain.ai',
  botChainId: parseInt(process.env.BOT_CHAIN_ID || '677', 10),
  botMainnetRpcUrl: process.env.BOT_MAINNET_RPC_URL || 'https://rpc.botchain.ai',
  botMainnetChainId: 677,
  botTestnetRpcUrl: process.env.BOT_TESTNET_RPC_URL || 'https://rpc.bohr.life',
  botTestnetChainId: 968,

  // Circle Arc Fallback (Preserved for cross-chain compatibility)
  arcRpcUrl: process.env.ARC_RPC_URL || 'https://rpc.mainnet.arc.io',
  arcChainId: parseInt(process.env.ARC_CHAIN_ID || '5042', 10),

  // Token Contracts
  usdtAddress: process.env.USDT_ADDRESS || '0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C',
  usdtMainnetAddress: '0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C',
  usdtTestnetAddress: '0x75edC9335175Fc0552D51D48439F229c10420fe3',
  usdtDecimals: 6,
  usdcAddress: '0x3600000000000000000000000000000000000000',
  usdcDecimals: 6,

  // Escrow Contract: Active BOT Chain Mainnet (677) escrow is 0x909661b453bBe13Ee247551754b35370557A9aA2
  // Active Bohr Testnet (968) escrow is 0xB128F2f442554B6517D779788F28F2EB2612164A
  escrowContractAddress: process.env.ESCROW_CONTRACT_ADDRESS || '0x909661b453bBe13Ee247551754b35370557A9aA2',
  testnetEscrowContractAddress: '0xB128F2f442554B6517D779788F28F2EB2612164A',

  // This release is native-BOT-only. ERC20 (USDT) funding stays disabled until it has live Bohr test evidence.
  enableErc20: process.env.ENABLE_ERC20 === 'true',
};

