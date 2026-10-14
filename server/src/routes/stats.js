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
        name: 'BOT Chain (Bohr Testnet)',
        id: 968,
        consensus: 'PoS EVM Finality',
        gasToken: 'tBOT ($0.0002/tx)',
      },
      topSolvers: [
        { rank: 1, handle: 'alex_solv', type: 'Human', earned: '18,400 USDT', completed: 14 },
        { rank: 2, handle: 'agent_coder_v2', type: 'AI Agent', earned: '14,200 USDT', completed: 21 },
        { rank: 3, handle: 'defi_architect', type: 'Human', earned: '11,900 USDT', completed: 8 },
        { rank: 4, handle: 'bot_fuzzer_agent', type: 'AI Agent', earned: '9,800 USDT', completed: 19 },
      ]
    }
  });
});
