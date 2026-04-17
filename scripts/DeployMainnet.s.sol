// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/GMBadge.sol";
import "../contracts/GMOnBase.sol";

contract DeployMainnet is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        uint256 gmFee = vm.envUint("GM_FEE_WEI");
        address ownerAddress = vm.envAddress("OWNER_ADDRESS");

        vm.startBroadcast(deployerKey);

        GMBadge badge = new GMBadge();
        GMOnBase gm = new GMOnBase(gmFee);

        badge.setGMContract(address(gm));
        gm.setBadgeContract(address(badge));

        vm.stopBroadcast();

        console2.log("GMBadge:", address(badge));
        console2.log("GMOnBase:", address(gm));
        console2.log("Owner target:", ownerAddress);
        console2.log("GM Fee (wei):", gmFee);
    }
}
