// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

library domainSet {
    struct Domain {
        string name;
        address owner;
        uint256 deposit;
    }

    struct Set {
        Domain[] _values;
        mapping(string => uint256) _positions;
    }

    function _get(
        Set storage set,
        string memory value
    ) private view returns (Domain storage) {
        return set._values[set._positions[value] - 1];
    }

    function _content(
        Set storage set,
        string memory value
    ) private view returns (bool) {
        if (
            set._positions[value] != 0 &&
            _get(set, value).owner != address(0) &&
            set._values.length > 0
        ) {
            return true;
        }
        return false;
    }

    function toLowerCaseIfNeeded(
        bytes1 charByte
    ) internal pure returns (bytes1) {
        if (bytes1("A") <= charByte && charByte <= bytes1("Z")) {
            charByte = bytes1(uint8(charByte) + 32);
        }
        return charByte;
    }

    function removePrefix(
        bytes memory input,
        bytes memory prefix
    ) internal pure returns (bytes memory) {
        require(prefix.length > 0, "Prefix cannot be empty");

        if (input.length < prefix.length) {
            return input;
        }

        for (uint256 i = 0; i < prefix.length; i++) {
            require(input[i] == prefix[i], "Domain start http:// or https://");
        }

        // Создаем новый байтовый массив без префикса
        bytes memory result = new bytes(input.length - prefix.length);
        uint256 resultIndex = 0;

        for (uint256 i = prefix.length; i < input.length; i++) {
            result[resultIndex] = input[i];
            resultIndex++;
        }

        return result;
    }

    function _validateDomain(
        Set storage set,
        string memory input
    ) internal view returns (string memory) {
        bytes1 delimiter = bytes1(".");
        bytes memory inputBytes = bytes(input);
        bytes memory concatenatedBytes = new bytes(0);
        uint256 _lastIndex = inputBytes.length - 1;

        if (inputBytes.length > 7 && inputBytes[7] == "/") {
            inputBytes = removePrefix(inputBytes, "https://");
        } else if (inputBytes.length > 6 && inputBytes[6] == "/") {
            inputBytes = removePrefix(inputBytes, "http://");
        }
        // console.log(string(inputBytes));
        for (int256 i = int256(inputBytes.length) - 1; i >= 0; i--) {
            // convert to lower case
            uint256 _index = uint256(i);
            inputBytes[_index] = toLowerCaseIfNeeded(inputBytes[_index]);

            if (
                inputBytes[_index] == delimiter &&
                _index != 0 &&
                _index != _lastIndex
            ) {
                _domainNotRegistered(set, string(concatenatedBytes));
            } else {
                require(
                    ((
                        (inputBytes[_index] >= bytes1("a") &&
                            inputBytes[_index] <= bytes1("z"))
                    ) ||
                        (inputBytes[_index] == bytes1("-") &&
                            (_index != 0 && _index != _lastIndex)) ||
                        (inputBytes[_index] >= bytes1("0") &&
                            inputBytes[_index] <= bytes1("9"))),
                    "It is prohibited to use special characters"
                );
            }

            concatenatedBytes = abi.encodePacked(
                inputBytes[_index],
                concatenatedBytes
            );
        }
        return string(concatenatedBytes);
    }

    function _domainRegistered(
        Set storage set,
        string memory value
    ) private view returns (string memory) {
        require(!_content(set, value), "Domain is already registered");
        return value;
    }

    function _domainNotRegistered(
        Set storage set,
        string memory value
    ) private view returns (string memory) {
        require(_content(set, value), "Domain is not registered");
        return value;
    }

    function add(Set storage set, string memory value) internal returns (bool) {
        value = _domainRegistered(set, _validateDomain(set, value));
        set._values.push(Domain(value, msg.sender, msg.value));
        set._positions[value] = set._values.length;
        return true;
    }

    function remove(
        Set storage set,
        string memory value
    ) internal returns (bool) {
        value = _domainNotRegistered(set, _validateDomain(set, value));
        uint256 position = set._positions[value];
        if (position != 0) {
            uint256 valueIndex = position - 1;
            uint256 lastIndex = set._values.length - 1;

            if (valueIndex != lastIndex) {
                Domain memory lastValue = set._values[lastIndex];
                set._values[valueIndex] = lastValue;
                set._positions[lastValue.name] = position;
            }
            set._values.pop();
            delete set._positions[value];
            return true;
        } else {
            return false;
        }
    }

    function get(
        Set storage set,
        string memory value
    ) internal view returns (Domain storage) {
        value = _domainNotRegistered(set, _validateDomain(set, value));
        return _get(set, value);
    }

    function length(Set storage set) internal view returns (uint256) {
        return set._values.length;
    }
}
