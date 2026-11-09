import express from 'express';

export const statsRouter = express.Router();

statsRouter.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      tvlUsdc: 7450,
      totalSettledUsdc: 2000,
      activeBountiesCount: 4,
      completedBountiesCount: 3,
      avgSettlementTimeMs: 384,
      aiAgentClaimsPercent: 50,
      activeSolversCount: 3,
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
        {
          rank: 1,
          handle: '@Alex Researcher',
          type: 'Human Solver',
          earned: '800 BOT',
          completed: 1
        },
        {
          rank: 2,
          handle: '@Alex Rivers',
          type: 'Human Solver',
          earned: '750 BOT',
          completed: 1
        },
        {
          rank: 3,
          handle: '@Meme God',
          type: 'Human Solver',
          earned: '450 BOT',
          completed: 1
        }
      ]
    }
  });
});
