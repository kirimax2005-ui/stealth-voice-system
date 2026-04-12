// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TokenSystem {

    struct Token {
        bool used;
        uint256 expiry;
    }

    mapping(bytes32 => Token) public tokens;

    // 🔐 Store token hash with expiry
    function storeToken(bytes32 hash, uint256 expiry) public {
        require(tokens[hash].expiry == 0, "Token already exists");
        tokens[hash] = Token(false, expiry);
    }

    // ✅ Verify token
    function verifyToken(string memory token) public returns (bool) {
        bytes32 hash = keccak256(abi.encodePacked(token));

        require(tokens[hash].expiry != 0, "Token does not exist");
        require(!tokens[hash].used, "Token already used");
        require(block.timestamp <= tokens[hash].expiry, "Token expired");

        tokens[hash].used = true;
        return true;
    }
}