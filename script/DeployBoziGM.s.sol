// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {BoziGM} from "../contracts/BoziGM.sol";

contract DeployBoziGM is Script {
    function run() external returns (BoziGM deployed) {
        address feeRecipient = vm.envAddress("BOZI_FEE_RECIPIENT");
        address feeToken = vm.envAddress("BOZI_FEE_TOKEN");
        uint256 feeAmount = vm.envUint("BOZI_FEE_AMOUNT");

        vm.startBroadcast();
        deployed = new BoziGM(feeRecipient, feeToken, feeAmount);
        vm.stopBroadcast();
    }
}
