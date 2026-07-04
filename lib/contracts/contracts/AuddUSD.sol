// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Audd USD (aUSD)
/// @notice Mock USD-pegged test token for the Audd Flow demo on BOT Chain testnet.
///         Not a real stablecoin — testnet only.
contract AuddUSD is ERC20, Ownable {
    uint256 public constant FAUCET_AMOUNT = 10_000 ether; // 10,000 aUSD
    uint256 public constant FAUCET_COOLDOWN = 1 hours;

    mapping(address => uint256) public lastFaucet;

    constructor(address initialOwner) ERC20("Audd USD", "aUSD") Ownable(initialOwner) {
        _mint(initialOwner, 1_000_000 ether);
    }

    /// @notice Owner mint, used to fund the treasury during deployment/seeding.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Public testnet faucet so anyone can grab demo aUSD.
    function faucet() external {
        require(block.timestamp - lastFaucet[msg.sender] >= FAUCET_COOLDOWN, "aUSD: cooldown");
        lastFaucet[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
