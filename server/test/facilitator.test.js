import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getEip712Domain, relayGaslessSettlement } from '../src/facilitator.js';

describe('ArcBounty Facilitator & Settlement Tests', () => {
  it('generates correct EIP-712 domain for Circle Arc Mainnet', () => {
    const domain = getEip712Domain(5042);
    assert.equal(domain.name, 'USD Coin');
    assert.equal(domain.version, '2');
    assert.equal(domain.chainId, 5042n);
    assert.equal(domain.verifyingContract, '0x3600000000000000000000000000000000000000');
  });

  it('generates correct EIP-712 domain for Circle Arc Testnet', () => {
    const domain = getEip712Domain(5042002);
    assert.equal(domain.chainId, 5042002n);
  });

  it('relays simulated gasless EIP-3009 settlement with sub-second finality receipt', async () => {
    const mockParams = {
      from: '0x461cd48D95993242bB04774cc68042795586BbAd',
      to: '0x71C568ba74d3B107292995bB791e317614399A45',
      value: 500_000_000n, // $500 USDC
      validAfter: 0n,
      validBefore: 1800000000n,
      nonce: '0x0000000000000000000000000000000000000000000000000000000000000001',
      signature: '0x3045022100e478c9497e2f1704c7c8c6a0868f00dbf20c90c765042a326aeee966fd9012a50220268a7f9247c1dfa65320f40d97b0e6b201cb6613476687cb2f0681b472e241e61b'
    };

    const result = await relayGaslessSettlement(mockParams);
    assert.equal(result.status, 'confirmed');
    assert.ok(result.txHash.startsWith('0x'));
    assert.ok(result.settlementTimeMs <= 500, 'Settlement must be sub-second (<500ms)');
    assert.ok(result.network.includes('BOT'));
  });
});
