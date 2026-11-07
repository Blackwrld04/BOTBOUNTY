import 'dotenv/config';

const MAINNET_ESCROW_ADDRESS = '0x909661b453bBe13Ee247551754b35370557A9aA2';
const TESTNET_ESCROW_ADDRESS = '0xB128F2f442554B6517D779788F28F2EB2612164A';
const MAINNET_RPC_URL = process.env.BOT_MAINNET_RPC_URL || 'https://rpc.botchain.ai';

const resolvedEscrowAddress = process.env.ESCROW_CONTRACT_ADDRESS || MAINNET_ESCROW_ADDRESS;
const isMainnetEscrowActive =
  resolvedEscrowAddress.trim().toLowerCase() === MAINNET_ESCROW_ADDRESS.toLowerCase() &&
  process.env.FORCE_TESTNET !== 'true';

export const config = {
  port: parseInt(process.env.PORT || '4050', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // BOT Chain Mainnet (Chain ID 677) is strictly enforced whenever the Mainnet escrow contract is active,
  // preventing stale environment variables (e.g. BOT_CHAIN_ID=968) from misreporting the active chain.
  botRpcUrl: isMainnetEscrowActive
    ? MAINNET_RPC_URL
    : (process.env.BOT_RPC_URL || MAINNET_RPC_URL),
  botChainId: isMainnetEscrowActive
    ? 677
    : parseInt(process.env.BOT_CHAIN_ID || '677', 10),
  botMainnetRpcUrl: MAINNET_RPC_URL,
  botMainnetChainId: 677,
  botTestnetRpcUrl: process.env.BOT_TESTNET_RPC_URL || 'https://rpc.bohr.life',
  botTestnetChainId: 968,

  // Circle Arc Fallback (Preserved for legacy cross-chain compatibility)
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
  escrowContractAddress: resolvedEscrowAddress,
  mainnetEscrowContractAddress: MAINNET_ESCROW_ADDRESS,
  testnetEscrowContractAddress: TESTNET_ESCROW_ADDRESS,

  // This release is native-BOT-only. ERC20 (USDT) funding stays disabled until enabled explicitly.
  enableErc20: process.env.ENABLE_ERC20 === 'true',
};
