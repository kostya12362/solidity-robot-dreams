// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./domainsSetLibrary.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract DomainRegistry is Ownable {
    using domainSet for domainSet.Set;
    using domainSet for domainSet.Domain;
    receive() external payable {}
    
    domainSet.Set internal domains;

    event DomainRegistered(
        string domainName,
        address indexed owner,
        uint256 deposit
    );

    constructor() Ownable(msg.sender) {}

    function registerDomain(string memory domainName) external payable {
        domainSet.Domain memory domain = domains.get(domainName);
        require(domain.owner == address(0), "The domain already has an owner");
        require(msg.value == domain.price, "Deposit must equal to collateral");
        domains.update(
            domainSet.Domain({
                owner: msg.sender,
                deposit: msg.value,
                name: domainName,
                price: domain.price
            })
        );
        emit DomainRegistered(domainName, msg.sender, msg.value);
    }

    function withdrawAllFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Contract has no balance to withdraw");
        payable(owner()).transfer(balance);
    }

    function registerPriceDomain(
        string memory domainName,
        uint256 price
    ) external onlyOwner {
        require(price != 0, "Price must be greater than 0");
        domains.add(
            domainSet.Domain({
                owner: address(0),
                deposit: 0,
                name: domainName,
                price: price
            })
        );
    }
    

    function removeDomain(string memory domainName) external onlyOwner payable {
        domainSet.Domain memory domain = domains.get(domainName);
        require(
            domain.owner == address(0) || domain.owner == owner(),
            "Cannot delete a domain if it has an owner"
        );
        domains.remove(domainName);
        // return ether to owner
        payable(msg.sender).transfer(domain.deposit);
        emit DomainRegistered(domainName, msg.sender, domain.deposit);
    }

    function getDomain(
        string memory domainName
    ) external view returns (domainSet.Domain memory) {
        return domains.get(domainName);
    }

    function countDomains() external view returns (uint256) {
        return domains.length();
    }

    function getAllDomains() external view returns (domainSet.Domain[] memory) {
        return domains.items();
    }
}
