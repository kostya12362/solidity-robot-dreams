// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

library DomainsSet {
    struct Domain {
        address owner;
        uint256 deposit;
    }

    struct Set {
        string[] _values;
        mapping(string => Domain) _positions;
    }

    function _add(
        Set storage set,
        string memory value,
        Domain memory domain
    ) private returns (bool) {
        set._values.push(value);
        set._positions[value] = domain;
        return true;
    }

    function _length(Set storage set) private view returns (uint256) {
        return set._values.length;
    }

    function _compareStrings(
        string memory a,
        string memory b
    ) public pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }

    function _remove(
        Set storage set,
        string memory value
    ) private returns (bool) {
        for (uint256 i; i < _length(set); i++) {
            if (_compareStrings(set._values[i], value)) {
                if (i != _length(set) - 1) {
                    set._values[i] = set._values[i + 1];
                }
                set._values.pop();
                delete set._positions[value];
                return true;
            }
        }
        return false;
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

    modifier _checkDomainNameToLowerCase(string memory value) {
        require(
            keccak256(abi.encodePacked(value)) ==
                keccak256(abi.encodePacked(toLower(value))),
            "Domain name must be in lower case"
        );
        require(
            containsSpecialChars(value) == false,
            "It is prohibited to use special characters"
        );
        _;
    }

    modifier _domainNotRegistered(Set storage set, string memory value) {
        require(
            set._positions[value].owner == address(0),
            "Domain is already registered"
        );
        _;
    }

    modifier _domainRegistered(Set storage set, string memory value) {
        require(
            set._positions[value].owner != address(0),
            "Domain is not registered"
        );
        _;
    }

    function add(
        Set storage set,
        string memory value,
        Domain memory domain
    )
        internal
        _checkDomainNameToLowerCase(value)
        _domainNotRegistered(set, value)
        returns (bool)
    {
        bool result = _add(set, value, domain);
        return result;
    }

    function remove(
        Set storage set,
        string memory value
    ) internal _domainRegistered(set, value) returns (bool) {
        return _remove(set, value);
    }

    function get(
        Set storage set,
        string memory value
    ) internal view _domainRegistered(set, value) returns (Domain storage) {
        return set._positions[value];
    }

    function items(
        Set storage set
    ) internal view returns (string[] memory, Domain[] memory) {
        uint256 length = _length(set);
        string[] memory keys = new string[](length);
        Domain[] memory values = new Domain[](length);

        for (uint256 i = 0; i < length; i++) {
            keys[i] = set._values[i];
            values[i] = set._positions[set._values[i]];
        }

        return (keys, values);
    }
}
