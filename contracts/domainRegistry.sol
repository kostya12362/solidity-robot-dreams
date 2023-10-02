// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./domainsSetLibrary.sol";

contract DomainRegistry {
    uint256 public collateral = 0.001 ether;
    using DomainsSet for DomainsSet.Set;
    using DomainsSet for DomainsSet.Domain;

    DomainsSet.Set internal domains;

    event DomainRegistered(
        string domainName,
        address indexed owner,
        uint256 deposit
    );

    function registerDomain(string memory domainName) external payable {
        require(msg.value == collateral, "Deposit must equal to collateral");
        domains.add(
            domainName,
            DomainsSet.Domain({owner: msg.sender, deposit: msg.value})
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
    ) external view returns (DomainsSet.Domain memory) {
        return domains.get(domainName);
    }

    function getAllDomains()
        external
        view
        returns (string[] memory, DomainsSet.Domain[] memory)
    {
        return domains.items();
    }
}
