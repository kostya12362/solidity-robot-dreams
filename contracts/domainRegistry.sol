// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./domainsSetLibrary.sol";

contract DomainRegistry {
    uint256 public collateral = 0.001 ether;
    using domainSet for domainSet.Set;
    using domainSet for domainSet.Domain;

    domainSet.Set internal domains;

    event DomainRegistered(
        string domainName,
        address indexed owner,
        uint256 deposit
    );

    function registerDomain(string memory domainName) external payable {
        require(msg.value == collateral, "Deposit must equal to collateral");
        domains.add(
            domainSet.Domain({
                owner: msg.sender,
                deposit: msg.value,
                name: domainName
            })
        );
        emit DomainRegistered(domainName, msg.sender, msg.value);
    }

    function registerDomainAssambly(string memory domainName) external payable {
        require(msg.value == collateral, "Deposit must equal to collateral");
        domains.addAssably(
            domainSet.Domain({
                owner: msg.sender,
                deposit: msg.value,
                name: domainName
            })
        );
        emit DomainRegistered(domainName, msg.sender, msg.value);
    }

    function removeDomain(string memory domainName) external payable {
        require(
            msg.sender == domains.get(domainName).owner,
            "Only the owner can release the domain"
        );
        uint256 deposit = domains.get(domainName).deposit;
        domains.remove(domainName);
        payable(msg.sender).transfer(deposit);

        emit DomainRegistered(domainName, msg.sender, deposit);
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
