# Base GM Contracts

Contracts added:
- `contracts/GMOnBase.sol`
- `contracts/GMBadge.sol`

## Intended flow
1. Deploy `GMBadge`
2. Deploy `GMOnBase` with low fee, e.g. `0.000001 ETH`
3. Call `setGMContract()` on badge contract
4. Call `setBadgeContract()` on GM contract
5. Frontend calls `gm()` and `getStatus()`
6. Badge milestones:
   - `GM7`
   - `GM30`
   - `GM100`

## Notes
- This is a lightweight MVP skeleton, not audited.
- Test on Base Sepolia before any mainnet deployment.
