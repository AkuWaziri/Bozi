// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../contracts/BoziCampaignEscrow.sol";

interface VmBozi {
    function warp(uint256 timestamp) external;
    function prank(address sender) external;
}

contract MockUSDCBozi {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    function mint(address to, uint256 amount) external { balanceOf[to] += amount; }
    function approve(address spender, uint256 amount) external returns (bool) { allowance[msg.sender][spender] = amount; return true; }
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount; balanceOf[to] += amount; return true;
    }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount && allowance[from][msg.sender] >= amount, "allowance");
        allowance[from][msg.sender] -= amount; balanceOf[from] -= amount; balanceOf[to] += amount; return true;
    }
}

contract BoziCampaignEscrowTest {
    VmBozi constant vm = VmBozi(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant BRAND = address(0xB001);
    address constant CREATOR = address(0xC001);
    address constant FEE = address(0xFEE);
    MockUSDCBozi token;
    BoziCampaignEscrow escrow;

    function setUp() public {
        token = new MockUSDCBozi();
        escrow = new BoziCampaignEscrow(address(token), FEE);
        token.mint(BRAND, 10_000_000_000);
        vm.prank(BRAND);
        token.approve(address(escrow), type(uint256).max);
    }

    function testCreateCampaignCollectsFivePercentFeeAtomically() public {
        vm.prank(BRAND);
        uint256 id = escrow.createCampaign(1_000_000, 100_000, 10, uint64(block.timestamp + 1 days));
        require(id == 1, "campaign id");
        require(token.balanceOf(address(escrow)) == 1_000_000, "budget escrowed");
        require(token.balanceOf(FEE) == 50_000, "fee paid");
    }

    function testApprovalPaysCreatorAndReducesEscrow() public {
        vm.prank(BRAND);
        uint256 id = escrow.createCampaign(1_000_000, 100_000, 10, uint64(block.timestamp + 1 days));
        vm.prank(CREATOR);
        escrow.joinCampaign(id);
        vm.prank(CREATOR);
        escrow.submitWork(id, "https://example.com/work");
        vm.prank(BRAND);
        escrow.approveSubmission(id, CREATOR);
        require(token.balanceOf(CREATOR) == 100_000, "creator paid");
        (,,,,,,,,) = escrow.campaigns(id);
    }

    function testRefundRequiresDeadlineAndFinalizedParticipants() public {
        vm.prank(BRAND);
        uint256 id = escrow.createCampaign(1_000_000, 100_000, 10, uint64(block.timestamp + 1 days));
        vm.warp(block.timestamp + 2 days);
        vm.prank(BRAND);
        escrow.refundRemaining(id);
        require(token.balanceOf(BRAND) == 9_950_000_000, "remaining returned after fee");
    }
}
