# Frontend Contract Integration Notes

`src/app.js` now contains a `CONTRACT_CONFIG` object.

Fill these after deployment:
- `gmContractAddress`
- `badgeContractAddress`

Current behavior:
- If no contract address is set, the GM tab stays in local preview mode.
- If contract address is set, the UI prepares for Base network switching and onchain `gm()` integration.

Next implementation step:
- add ABI
- use `eth_sendTransaction` or viem/wagmi
- call `getStatus()` for real onchain streak data
