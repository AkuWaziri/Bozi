// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title BoziCampaignEscrow
/// @notice USDC escrow for creator campaigns on Base.
/// @dev Campaign budget and creator rewards are denominated in USDC's smallest units (6 decimals).
///      Funding and the 5% platform fee are collected atomically when a campaign is created.
interface IERC20Bozi {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract BoziCampaignEscrow {
    uint256 public constant PLATFORM_FEE_BPS = 500;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    address public immutable feeRecipient;
    IERC20Bozi public immutable usdc;
    uint256 public nextCampaignId = 1;
    uint256 private unlocked = 1;

    enum ParticipationStatus { None, Joined, Submitted, Paid, Rejected }

    struct Campaign {
        address creator;
        uint256 budget;
        uint256 remainingBudget;
        uint256 rewardPerParticipant;
        uint256 slots;
        uint256 joinedCount;
        uint256 finalizedCount;
        uint64 deadline;
        bool refundClaimed;
    }

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => ParticipationStatus)) public participationStatus;
    mapping(uint256 => mapping(address => string)) public submissionUrl;

    event CampaignCreated(uint256 indexed campaignId, address indexed creator, uint256 budget, uint256 platformFee, uint256 rewardPerParticipant, uint256 slots, uint64 deadline);
    event ParticipantJoined(uint256 indexed campaignId, address indexed participant);
    event SubmissionRecorded(uint256 indexed campaignId, address indexed participant, string url);
    event ParticipantPaid(uint256 indexed campaignId, address indexed participant, uint256 amount);
    event SubmissionRejected(uint256 indexed campaignId, address indexed participant);
    event CampaignRefunded(uint256 indexed campaignId, address indexed creator, uint256 amount);

    error ZeroAddress();
    error InvalidCampaign();
    error InvalidAmount();
    error InvalidDeadline();
    error InvalidSlots();
    error InsufficientAllowanceOrBalance();
    error NotCampaignCreator();
    error CampaignClosed();
    error CampaignFull();
    error CreatorCannotJoin();
    error AlreadyParticipated();
    error InvalidParticipationState();
    error EmptySubmission();
    error DeadlineNotPassed();
    error ParticipantsNotFinalized();
    error RefundAlreadyClaimed();
    error TransferFailed();
    error ReentrantCall();

    constructor(address usdc_, address feeRecipient_) {
        if (usdc_ == address(0) || feeRecipient_ == address(0)) revert ZeroAddress();
        usdc = IERC20Bozi(usdc_);
        feeRecipient = feeRecipient_;
    }

    modifier nonReentrant() {
        if (unlocked != 1) revert ReentrantCall();
        unlocked = 2;
        _;
        unlocked = 1;
    }

    function createCampaign(uint256 budget, uint256 rewardPerParticipant, uint256 slots, uint64 deadline)
        external nonReentrant returns (uint256 campaignId)
    {
        if (budget == 0 || rewardPerParticipant == 0) revert InvalidAmount();
        if (slots == 0) revert InvalidSlots();
        if (rewardPerParticipant > budget / slots) revert InvalidAmount();
        if (deadline <= block.timestamp) revert InvalidDeadline();

        uint256 fee = budget * PLATFORM_FEE_BPS / BPS_DENOMINATOR;
        uint256 totalFunding = budget + fee;
        if (!usdc.transferFrom(msg.sender, address(this), budget)) revert InsufficientAllowanceOrBalance();
        if (fee > 0 && !usdc.transferFrom(msg.sender, feeRecipient, fee)) revert InsufficientAllowanceOrBalance();

        campaignId = nextCampaignId++;
        campaigns[campaignId] = Campaign({
            creator: msg.sender,
            budget: budget,
            remainingBudget: budget,
            rewardPerParticipant: rewardPerParticipant,
            slots: slots,
            joinedCount: 0,
            finalizedCount: 0,
            deadline: deadline,
            refundClaimed: false
        });
        emit CampaignCreated(campaignId, msg.sender, budget, fee, rewardPerParticipant, slots, deadline);
        totalFunding; // Documents that budget + fee is the required user allowance/funding amount.
    }

    function joinCampaign(uint256 campaignId) external {
        Campaign storage c = campaigns[campaignId];
        if (c.creator == address(0)) revert InvalidCampaign();
        if (block.timestamp >= c.deadline || c.refundClaimed) revert CampaignClosed();
        if (msg.sender == c.creator) revert CreatorCannotJoin();
        if (c.joinedCount >= c.slots) revert CampaignFull();
        if (participationStatus[campaignId][msg.sender] != ParticipationStatus.None) revert AlreadyParticipated();
        participationStatus[campaignId][msg.sender] = ParticipationStatus.Joined;
        c.joinedCount += 1;
        emit ParticipantJoined(campaignId, msg.sender);
    }

    function submitWork(uint256 campaignId, string calldata url) external {
        Campaign storage c = campaigns[campaignId];
        if (c.creator == address(0)) revert InvalidCampaign();
        if (block.timestamp >= c.deadline || c.refundClaimed) revert CampaignClosed();
        if (bytes(url).length == 0) revert EmptySubmission();
        if (participationStatus[campaignId][msg.sender] != ParticipationStatus.Joined) revert InvalidParticipationState();
        participationStatus[campaignId][msg.sender] = ParticipationStatus.Submitted;
        submissionUrl[campaignId][msg.sender] = url;
        emit SubmissionRecorded(campaignId, msg.sender, url);
    }

    /// @notice Approval pays the participant directly in USDC from the escrow.
    function approveSubmission(uint256 campaignId, address participant) external nonReentrant {
        Campaign storage c = campaigns[campaignId];
        if (c.creator == address(0)) revert InvalidCampaign();
        if (msg.sender != c.creator) revert NotCampaignCreator();
        if (participationStatus[campaignId][participant] != ParticipationStatus.Submitted) revert InvalidParticipationState();
        if (c.remainingBudget < c.rewardPerParticipant) revert InvalidAmount();

        participationStatus[campaignId][participant] = ParticipationStatus.Paid;
        c.remainingBudget -= c.rewardPerParticipant;
        c.finalizedCount += 1;
        if (!usdc.transfer(participant, c.rewardPerParticipant)) revert TransferFailed();
        emit ParticipantPaid(campaignId, participant, c.rewardPerParticipant);
    }

    /// @notice A creator can reject submitted work at any time, or finalize a non-submission after deadline.
    function rejectSubmission(uint256 campaignId, address participant) external {
        Campaign storage c = campaigns[campaignId];
        if (c.creator == address(0)) revert InvalidCampaign();
        if (msg.sender != c.creator) revert NotCampaignCreator();
        ParticipationStatus status = participationStatus[campaignId][participant];
        if (status == ParticipationStatus.Submitted) {
            participationStatus[campaignId][participant] = ParticipationStatus.Rejected;
        } else if (status == ParticipationStatus.Joined && block.timestamp >= c.deadline) {
            participationStatus[campaignId][participant] = ParticipationStatus.Rejected;
        } else {
            revert InvalidParticipationState();
        }
        c.finalizedCount += 1;
        emit SubmissionRejected(campaignId, participant);
    }

    /// @notice Unused USDC can be refunded only after the deadline and all joined participants are finalized.
    function refundRemaining(uint256 campaignId) external nonReentrant {
        Campaign storage c = campaigns[campaignId];
        if (c.creator == address(0)) revert InvalidCampaign();
        if (msg.sender != c.creator) revert NotCampaignCreator();
        if (block.timestamp < c.deadline) revert DeadlineNotPassed();
        if (c.refundClaimed) revert RefundAlreadyClaimed();
        if (c.finalizedCount != c.joinedCount) revert ParticipantsNotFinalized();

        uint256 amount = c.remainingBudget;
        c.remainingBudget = 0;
        c.refundClaimed = true;
        if (amount > 0 && !usdc.transfer(c.creator, amount)) revert TransferFailed();
        emit CampaignRefunded(campaignId, c.creator, amount);
    }
}
