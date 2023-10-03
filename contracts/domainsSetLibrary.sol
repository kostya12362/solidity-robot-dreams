// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
// import "hardhat/console.sol";

library domainSet {
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

    function _get(
        Set storage set,
        string memory value
    ) private view _checkSpecialCharacters(value) returns (Domain storage) {
        return set._positions[value];
    }

    function _length(Set storage set) private view returns (uint256) {
        return set._values.length;
    }

    function _compareStrings(
        string memory a,
        string memory b
    ) public pure returns (bool) {
        return
            keccak256(abi.encodePacked(a)) ==
            keccak256(abi.encodePacked(toLower(b)));
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

    function _items(
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

    function containsSpecialChars(
        string memory input
    ) internal pure returns (bool) {
        bytes memory inputBytes = bytes(input);
        bool usingDash = false;
        bool usingDot = false;

        
        if (inputBytes.length == 0)
            return true;
        // Проверяем, что строка не начинается и не заканчивается "." или "-"
        if (
            inputBytes.length > 0 &&
            (inputBytes[0] == bytes1("-") || inputBytes[0] == bytes1("."))
        ) return true;
        if (
            inputBytes.length > 0 &&
            (inputBytes[inputBytes.length - 1] == bytes1("-") ||
                inputBytes[inputBytes.length - 1] == bytes1("."))
        ) return true;

        for (uint i = 0; i < inputBytes.length; i++) {
            bytes1 charByte = inputBytes[i];
            if (
                (charByte < bytes1("a") || charByte > bytes1("z")) &&
                charByte != bytes1("-") &&
                charByte != bytes1(".")
            ) {
                return true; // Нашли символ, который не буква [a-z], точка "." или дефис "-"
            }
            if (charByte == bytes1("-")) {
                usingDash = true;
            }
            if (charByte == bytes1(".")) {
                usingDot = true;
            }
        }

        if (usingDash && !usingDot) {
            return true;
        }

        return false; // Все символы допустимы
    }

    function removePrefix(
        string memory input,
        string memory prefix
    ) internal pure returns (string memory) {
        bytes memory inputBytes = bytes(input);
        bytes memory prefixBytes = bytes(prefix);

        if (inputBytes.length >= prefixBytes.length) {
            bool isMatch = true;
            for (uint256 i = 0; i < prefixBytes.length; i++) {
                if (inputBytes[i] != prefixBytes[i]) {
                    isMatch = false;
                    break;
                }
            }

            if (isMatch) {
                string memory result = new string(
                    inputBytes.length - prefixBytes.length
                );
                bytes memory resultBytes = bytes(result);

                for (
                    uint256 i = prefixBytes.length;
                    i < inputBytes.length;
                    i++
                ) {
                    resultBytes[i - prefixBytes.length] = inputBytes[i];
                }

                return result;
            }
        }

        // If it doesn't match the prefix, return the original string
        return input;
    }

    function _substring(
        string memory str,
        uint256 startIndex,
        uint256 endIndex
    ) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        require(
            startIndex <= endIndex && endIndex <= strBytes.length,
            "Invalid indices"
        );
        bytes memory result = new bytes(endIndex - startIndex);
        for (uint256 i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = strBytes[i];
        }

        return string(result);
    }

    function _append(
        string[] memory arr,
        string memory element
    ) internal pure returns (string[] memory) {
        string[] memory newArr = new string[](arr.length + 1);
        for (uint256 i = 0; i < arr.length; i++) {
            newArr[i] = arr[i];
        }
        newArr[arr.length] = element;
        return newArr;
    }

    function _splitDomain(
        Set storage set,
        string memory input
    ) internal view returns (string[] memory) {
        string[] memory parts = new string[](0);
        bytes memory delimiter = bytes(".");
        bytes memory inputBytes = bytes(input);
        bytes memory concatenatedBytes = new bytes(0);

        int256 end = int256(inputBytes.length) - 1;

        for (int256 i = int256(inputBytes.length) - 1; i >= 0; i--) {
            if (inputBytes[uint256(i)] == delimiter[0]) {
                string memory part = _substring(
                    input,
                    uint256(i) + 1,
                    uint256(end) + 1
                );
                parts = _append(parts, part);
                end = i - 1;
                get(set, string(concatenatedBytes));
            }
            concatenatedBytes = abi.encodePacked(
                inputBytes[uint256(i)],
                concatenatedBytes
            );
        }

        if (end > 0) {
            string memory part = input;
            if (parts.length != 0) {
                part = _substring(input, 0, uint256(end) + 1);
            }
            parts = _append(parts, part);
        }
        return parts;
    }

    function clearHttpOrHttpsPrefix(string memory input) internal pure returns (string memory) {
        string memory result = removePrefix(input, "https://");
        return removePrefix(result, "http://");
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
            _compareStrings(value, toLower(value)),
            "Domain name must be in lower case"
        );
        _;
    }

    modifier _checkSpecialCharacters(string memory value) {
        require(
            containsSpecialChars(clearHttpOrHttpsPrefix(value)) == false,
            "It is prohibited to use special characters"
        );
        _;
    }

    modifier _domainNotRegistered(Set storage set, string memory value) {
        require(
            _get(set, clearHttpOrHttpsPrefix(value)).owner == address(0),
            "Domain is already registered"
        );
        _;
    }

    modifier _domainRegistered(Set storage set, string memory value) {
        require(
            _get(set, clearHttpOrHttpsPrefix(value)).owner != address(0),
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
        value  = clearHttpOrHttpsPrefix(value);
        _splitDomain(set, value);
        return _add(set, value, domain);
    }

    function remove(
        Set storage set,
        string memory value
    )
        internal
        _checkDomainNameToLowerCase(value)
        _domainRegistered(set, value)
        returns (bool)
    {
        
        return _remove(set, clearHttpOrHttpsPrefix(value));
    }

    function get(
        Set storage set,
        string memory value
    )
        internal
        view 
        _checkDomainNameToLowerCase(value)
        _domainRegistered(set, value)
        returns (Domain storage)
    {
        return _get(set, clearHttpOrHttpsPrefix(value));
    }

    function items(
        Set storage set
    ) internal view returns (string[] memory, Domain[] memory) {
        return _items(set);
    }
}
