/**
 * Demo / seed bounty data was historically inserted with made-up transaction hashes.
 * None of these exist on Bohr and they must never be shown as deposit or settlement evidence.
 * They are purged from SQLite and Supabase on startup (see purgeFabricatedSeedEvidence).
 */
export const FABRICATED_SEED_TX = [
  '0x9281a8b7c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a01b2c3d4e5f6a7b8c9d0e01',
  '0x7192a8b7c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a02b1c2d3e4f5a6b7c8d9e02',
  '0x6182a8b7c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a03b1c2d3e4f5a6b7c8d9e03',
  '0x5182a8b7c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a04b1c2d3e4f5a6b7c8d9e04',
  '0x4182a8b7c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a05b1c2d3e4f5a6b7c8d9e05',
  '0xdep09098f5a77b4e7feaa689f826b6aca4a',
  '0xdep24065623fc9887fa04d8e0c075893446',
  '0x1a0c40614615b1e7a309adca37da91823a8b7c4d5e6f7a8b9c0d1e2f3a4b5c03',
  '0x91823a8b7c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a04b1c2d3e4f5a6b7c8d9e04',
  '0x1a0c3af6b2a5f7019c628920ceba91823a8b7c4d5e6f7a8b9c0d1e2f3a4b5c05'
].map((h) => h.toLowerCase());

/** Ids of the built-in demo bounties (not backed by any on-chain escrow). */
export const DEMO_BOUNTY_IDS = [
  'bounty-bot-001',
  'bounty-bot-002',
  'bounty-bot-003',
  'bounty-bot-004',
  'bounty-bot-005',
  'bounty-bot-3356',
  'bounty-bot-4237',
  'bounty-arc-001',
  'bounty-arc-002',
  'bounty-arc-003',
  'bounty-arc-004',
  'bounty-arc-005',
  'bounty-arc-0974',
  'bounty-arc-3356',
  'bounty-arc-4237'
];
