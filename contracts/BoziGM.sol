// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

contract BoziGM {
    address public immutable feeRecipient;
    IERC20 public immutable feeToken;
    uint256 public feeAmount;
    address public owner;
    mapping(address => uint256) public lastCheckinDay;

    event GMCheckedIn(address indexed user, uint256 indexed day, uint256 feeAmount);
    event FeeAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _feeRecipient, address _feeToken, uint256 _feeAmount) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_feeToken != address(0), "Invalid fee token");
        require(_feeAmount > 0, "Invalid fee amount");
        feeRecipient = _feeRecipient;
        feeToken = IERC20(_feeToken);
        feeAmount = _feeAmount;
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function gm() external {
        uint256 day = block.timestamp / 1 days;
        require(lastCheckinDay[msg.sender] != day, "Already checked in today");
        require(feeToken.transferFrom(msg.sender, feeRecipient, feeAmount), "Fee transfer failed");
        lastCheckinDay[msg.sender] = day;
        emit GMCheckedIn(msg.sender, day, feeAmount);
    }

    function setFeeAmount(uint256 newAmount) external onlyOwner {
        require(newAmount > 0, "Invalid fee amount");
        emit FeeAmountUpdated(feeAmount, newAmount);
        feeAmount = newAmount;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
