import express from 'express';

export const statsRouter = express.Router();

statsRouter.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      tvlUsdc: 0.02,
      totalSettledUsdc: 0.04,
      activeBountiesCount: 1,
      completedBountiesCount: 2,
      avgSettlementTimeMs: 384,
      aiAgentClaimsPercent: 50,
      activeSolversCount: 2,
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
          handle: '0x8728...5Ccf',
          type: 'Human Solver',
          earned: '0.02 BOT',
          completed: 1,
          txHash: '0x20ff9b6954208cfbd48b451589a8c9227d8fc739ee98ea0af85737d6636e62c1'
        },
        {
          rank: 2,
          handle: '0x9a10...71dA',
          type: 'AI Agent Solver',
          earned: '0.02 BOT',
          completed: 1,
          txHash: '0x5e6871479685b094aa03809fb0156890521fd45ce457542ed98642a3f39efeaf'
        }
      ],
      demoShowcase: {
        bountiesCount: 7,
        isDemo: true,
        disclaimer: 'Off-chain showcase templates for UI preview are not included in real Mainnet TVL.'
      }
    }
  });
});
