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

  // Token Contracts on BOT Chain
  usdtAddress: process.env.USDT_ADDRESS || '0x75edC9335175Fc0552D51D48439F229c10420fe3',
  usdtMainnetAddress: '0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C',
  usdtDecimals: 6,

  // Facilitator & Escrow Contracts
  facilitatorPrivateKey: process.env.FACILITATOR_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001',
  escrowContractAddress: process.env.ESCROW_CONTRACT_ADDRESS || '0x909661b453bBe13Ee247551754b35370557A9aA2',
};
