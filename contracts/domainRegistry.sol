// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DomainRegistry {
    struct Domain {
        address owner;
        uint256 deposit;
        bool isRegistered;
    }

    mapping(string => Domain) public domains;

    event DomainRegistered(string domainName, address indexed owner, uint256 deposit);
    event DomainReleased(string domainName, address indexed owner, uint256 deposit);

    modifier domainNotRegistered(string memory domainName) {
        require(!domains[domainName].isRegistered, "Domain is already registered");
        _;
    }

    modifier domainRegistered(string memory domainName) {
        require(domains[domainName].isRegistered, "Domain is not registered");
        _;
    }

    function registerDomain(string memory domainName) external payable domainNotRegistered(domainName) {
        require(msg.value > 0, "Deposit must be greater than 0 ETH");
        domains[domainName] = Domain({
            owner: msg.sender,
            deposit: msg.value,
            isRegistered: true
        });
        emit DomainRegistered(domainName, msg.sender, msg.value);
    }

    function releaseDomain(string memory domainName) external domainRegistered(domainName) {
        require(msg.sender == domains[domainName].owner, "Only the owner can release the domain");
        uint256 deposit = domains[domainName].deposit;
        payable(msg.sender).transfer(deposit);
        delete domains[domainName];
        emit DomainReleased(domainName, msg.sender, deposit);
    }
}