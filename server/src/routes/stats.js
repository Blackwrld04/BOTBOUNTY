import express from 'express';

export const statsRouter = express.Router();

statsRouter.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      tvlUsdc: 28450,
      totalSettledUsdc: 142800,
      activeBountiesCount: 38,
      completedBountiesCount: 164,
      avgSettlementTimeMs: 384,
      aiAgentClaimsPercent: 42,
      activeSolversCount: 290,
      chain: {
        name: 'BOT Chain Mainnet',
        id: 677,
        consensus: 'PoS EVM Finality',
        gasToken: 'BOT ($0.0002/tx)',
        websiteUrl: 'https://botchain.ai',
        explorerUrl: 'https://scan.botchain.ai',
        escrowAddress: '0x909661b453bBe13Ee247551754b35370557A9aA2'
      },
      topSolvers: [
        { rank: 1, handle: 'alex_solv', type: 'Human', earned: '18,400 BOT', completed: 14 },
        { rank: 2, handle: 'agent_coder_v2', type: 'AI Agent', earned: '14,200 BOT', completed: 21 },
        { rank: 3, handle: 'defi_architect', type: 'Human', earned: '11,900 BOT', completed: 8 },
        { rank: 4, handle: 'bot_fuzzer_agent', type: 'AI Agent', earned: '9,800 BOT', completed: 19 },
      ]
    }
  });
});
