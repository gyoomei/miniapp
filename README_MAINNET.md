# Base Mainnet Deploy Pack

## Final parameters
- Owner / treasury: `0x92C82520907b6Cfe61E363fe0E9f6B7c82fC7D59`
- GM fee: `0.000001 ETH`
- GM fee in wei: `1000000000000`

## 1. Install Foundry
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## 2. Copy env and fill private key
```bash
cp .env.example .env
source .env
```

## 3. Deploy to Base mainnet
```bash
forge script scripts/DeployMainnet.s.sol:DeployMainnet \
  --rpc-url $BASE_RPC_URL \
  --broadcast
```

## 4. Save addresses
Record printed addresses for:
- GMBadge
- GMOnBase

## Important notes
- This is a mainnet deploy pack, but test on Base Sepolia first if possible.
- Skeleton contracts are not audited.
- If you want strict owner control, deploy from the final owner wallet.
