// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract DomainRegistry {
    uint256 public collateral = 0.001 ether;

    struct Domain {
        address owner;
        uint256 deposit;
    }
    mapping(string => Domain) public domains;

    event DomainRegistered(
        string domainName,
        address indexed owner,
        uint256 deposit
    );
    event DomainReleased(
        string domainName,
        address indexed owner,
        uint256 deposit
    );

    function toLower(string memory _str) internal pure returns (string memory) {
        // convert sting to lover case
        bytes memory bStr = bytes(_str);
        bytes memory bLower = new bytes(bStr.length);
        for (uint i = 0; i < bStr.length; i++) {
            // Uppercase character
            if ((uint8(bStr[i]) >= 65) && (uint8(bStr[i]) <= 90)) {
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
        }
        return string(bLower);
    }

    function containsSpecialChars(
        string memory input
    ) internal pure returns (bool) {
        bytes memory inputBytes = bytes(input);
        for (uint i = 0; i < inputBytes.length; i++) {
            uint8 charCode = uint8(inputBytes[i]);
            if ((charCode < 97 || charCode > 122)) {
                return true; // A character has been found that does not have a letter [a-z] or a dot
            }
        }
        return false; // All symbols are letters [a-z] or specks
    }

    modifier checkDomainNameToLowerCase(string memory domainName) {
        require(
            keccak256(abi.encodePacked(domainName)) ==
                keccak256(abi.encodePacked(toLower(domainName))),
            "Domain name must be in lower case"
        );
        require(
            containsSpecialChars(domainName) == false,
            "It is prohibited to use special characters"
        );
        _;
    }

    modifier domainNotRegistered(string memory domainName) {
        require(
            domains[domainName].owner == address(0),
            "Domain is already registered"
        );
        _;
    }

    modifier domainRegistered(string memory domainName) {
        require(
            domains[domainName].owner != address(0),
            "Domain is not registered"
        );
        _;
    }

    function registerDomain(
        string memory domainName
    )
        external
        payable
        domainNotRegistered(domainName)
        checkDomainNameToLowerCase(domainName)
    {
        require(msg.value == collateral, "Deposit must equal to collateral");
        domains[domainName] = Domain({owner: msg.sender, deposit: msg.value});
        emit DomainRegistered(domainName, msg.sender, msg.value);
    }

    function releaseDomain(
        string memory domainName
    )
        external
        domainRegistered(domainName)
        checkDomainNameToLowerCase(domainName)
    {
        require(
            msg.sender == domains[domainName].owner,
            "Only the owner can release the domain"
        );
        uint256 deposit = domains[domainName].deposit;
        payable(msg.sender).transfer(deposit);
        delete domains[domainName];
        emit DomainReleased(domainName, msg.sender, deposit);
    }
}
