// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IGMBadge {
    function mintBadge(address to, string calldata tier, string calldata uri) external returns (uint256 tokenId);
}

contract GMOnBase {
    struct UserStatus {
        uint256 lastGM;
        uint256 streak;
        uint256 totalGM;
    }

    address public owner;
    uint256 public gmFee;
    IGMBadge public badgeContract;

    uint256 public constant DAY = 1 days;
    uint256 public constant STREAK_RESET_WINDOW = 2 days;

    mapping(address => UserStatus) public users;
    mapping(address => mapping(bytes32 => bool)) public badgeClaimed;

    event GMRecorded(address indexed user, uint256 streak, uint256 totalGM, uint256 paid);
    event BadgeClaimed(address indexed user, string tier, uint256 tokenId);
    event FeeUpdated(uint256 newFee);
    event BadgeContractUpdated(address indexed badgeContract);
    event Withdrawal(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(uint256 _gmFee) {
        owner = msg.sender;
        gmFee = _gmFee;
    }

    function setBadgeContract(address _badgeContract) external onlyOwner {
        badgeContract = IGMBadge(_badgeContract);
        emit BadgeContractUpdated(_badgeContract);
    }

    function setGMFee(uint256 _gmFee) external onlyOwner {
        gmFee = _gmFee;
        emit FeeUpdated(_gmFee);
    }

    function gm() external payable {
        require(msg.value >= gmFee, "insufficient fee");

        UserStatus storage user = users[msg.sender];
        require(block.timestamp >= user.lastGM + DAY, "already GM today");

        if (user.lastGM == 0) {
            user.streak = 1;
        } else if (block.timestamp <= user.lastGM + STREAK_RESET_WINDOW) {
            user.streak += 1;
        } else {
            user.streak = 1;
        }

        user.lastGM = block.timestamp;
        user.totalGM += 1;

        emit GMRecorded(msg.sender, user.streak, user.totalGM, msg.value);
    }

    function getStatus(address userAddr) external view returns (uint256 lastGM, uint256 streak, uint256 totalGM, bool canGMNow) {
        UserStatus memory user = users[userAddr];
        lastGM = user.lastGM;
        streak = user.streak;
        totalGM = user.totalGM;
        canGMNow = block.timestamp >= user.lastGM + DAY;
    }

    function canClaimBadge(address userAddr, string calldata tier) public view returns (bool) {
        bytes32 tierKey = keccak256(bytes(tier));
        if (badgeClaimed[userAddr][tierKey]) return false;

        UserStatus memory user = users[userAddr];

        if (tierKey == keccak256(bytes("GM7"))) return user.streak >= 7;
        if (tierKey == keccak256(bytes("GM30"))) return user.streak >= 30;
        if (tierKey == keccak256(bytes("GM100"))) return user.totalGM >= 100;

        return false;
    }

    function claimBadge(string calldata tier, string calldata uri) external returns (uint256 tokenId) {
        require(address(badgeContract) != address(0), "badge contract not set");
        require(canClaimBadge(msg.sender, tier), "badge not claimable");

        bytes32 tierKey = keccak256(bytes(tier));
        badgeClaimed[msg.sender][tierKey] = true;
        tokenId = badgeContract.mintBadge(msg.sender, tier, uri);

        emit BadgeClaimed(msg.sender, tier, tokenId);
    }

    function withdraw(address payable to) external onlyOwner {
        uint256 amount = address(this).balance;
        require(amount > 0, "nothing to withdraw");
        to.transfer(amount);
        emit Withdrawal(to, amount);
    }
}
