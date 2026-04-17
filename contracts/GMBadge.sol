// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract GMBadge {
    string public name = "GM on Base Badge";
    string public symbol = "GMB";
    address public owner;
    address public gmContract;
    uint256 public nextTokenId = 1;

    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256) public balanceOf;
    mapping(uint256 => string) public tokenTier;
    mapping(uint256 => string) private _tokenURIs;
    mapping(address => mapping(bytes32 => bool)) public hasTier;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event BadgeMinted(address indexed to, uint256 indexed tokenId, string tier);
    event GMContractUpdated(address indexed gmContract);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyGMContract() {
        require(msg.sender == gmContract, "not gm contract");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setGMContract(address _gmContract) external onlyOwner {
        gmContract = _gmContract;
        emit GMContractUpdated(_gmContract);
    }

    function mintBadge(address to, string calldata tier, string calldata uri) external onlyGMContract returns (uint256 tokenId) {
        bytes32 tierKey = keccak256(bytes(tier));
        require(!hasTier[to][tierKey], "badge already minted");

        tokenId = nextTokenId++;
        ownerOf[tokenId] = to;
        balanceOf[to] += 1;
        tokenTier[tokenId] = tier;
        _tokenURIs[tokenId] = uri;
        hasTier[to][tierKey] = true;

        emit Transfer(address(0), to, tokenId);
        emit BadgeMinted(to, tokenId, tier);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(ownerOf[tokenId] != address(0), "token does not exist");
        return _tokenURIs[tokenId];
    }
}
