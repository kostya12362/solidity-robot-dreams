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

    function removeNullBytes(
        bytes memory data
    ) public pure returns (bytes memory) {
        uint256 newSize = 0;
        for (uint256 i = 0; i < data.length; i++) {
            if (data[i] != bytes1(0)) {
                newSize++;
            }
        }

        bytes memory result = new bytes(newSize);
        uint256 newIndex = 0;

        for (uint256 i = 0; i < data.length; i++) {
            if (data[i] != bytes1(0)) {
                result[newIndex] = data[i];
                newIndex++;
            }
        }

        return result;
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
    ) private view returns (string memory) {
        bytes memory inputData = bytes(input);
        bytes memory outputData = new bytes(inputData.length);
        bool isDot;
        bool specialSymbol;

        if (inputData.length > 7 && inputData[7] == "/") {
            inputData = removePrefix(inputData, "https://");
        } else if (inputData.length > 6 && inputData[6] == "/") {
            inputData = removePrefix(inputData, "http://");
        }
        uint256 inputLength = inputData.length - 1;
        for (int256 i = int256(inputLength); i >= 0; i--) {
            uint256 _index = uint256(i);

            assembly {
                let outputPtr := add(outputData, 0x20)
                let inputPtr := add(inputData, 0x20)
                let char := byte(0, mload(add(inputPtr, _index)))
                if eq(isDot, true) {
                    isDot := false
                    mstore8(add(outputPtr, add(_index, 1)), 46)
                }
                // to lowercase
                if and(lt(64, char), lt(char, 91)) {
                    char := add(char, 32)
                }
                // check is dot
                if and(
                    and(
                        eq(char, 46),
                        and(not(eq(_index, 0)), not(eq(_index, inputLength)))
                    ),
                    not(eq(_index, inputLength))
                ) {
                    isDot := true
                }
                if eq(isDot, false) {
                    let isHyphen := and(
                        eq(char, 45),
                        and(not(eq(_index, 0)), not(eq(_index, inputLength)))
                    ) // char == '-' && _index != 0 && _index != inputLength
                    let isAlphabetic := and(gt(char, 96), lt(char, 123)) // 'a' <= char < 'z' (ASCII коды)
                    let isNumeric := and(gt(char, 47), lt(char, 58)) // '0' <= char < '9' (ASCII коды)
                    if eq(or(or(isAlphabetic, isHyphen), isNumeric), false) {
                        specialSymbol := true
                    }
                    mstore8(add(outputPtr, _index), char)
                }
            }
            if (isDot == true) {
                _domainNotRegistered(set, string(removeNullBytes(outputData)));
            }

            require(
                specialSymbol != true,
                "It is prohibited to use special characters"
            );
        }
        return string(removeNullBytes(outputData));
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
