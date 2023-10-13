// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;
import "hardhat/console.sol";

library domainSet {
    struct Domain {
        string name;
        address owner;
        uint256 price;
        uint256 deposit;
    }

    struct Set {
        Domain[] _values;
        mapping(string => uint256) _positions;
    }

    function _add(
        Set storage set,
        Domain memory domain
    ) private returns (bool) {
        set._values.push(domain);
        set._positions[domain.name] = set._values.length;
        return true;
    }

    function _get(
        Set storage set,
        string memory value
    ) private view returns (Domain storage) {
        return set._values[set._positions[value] - 1];
    }

    function _update(
        Set storage set,
        Domain memory domain
    ) private returns (bool) {
        uint256 _position = set._positions[domain.name];
        set._values[_position - 1] = domain;
        return true;
    }

    function _length(Set storage set) private view returns (uint256) {
        return set._values.length;
    }

    function _remove(
        Set storage set,
        string memory value
    ) private returns (bool) {
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

    function _items(Set storage set) internal view returns (Domain[] memory) {
        return set._values;
    }

    function toLowerCaseIfNeeded(
        bytes1 charByte
    ) internal pure returns (bytes1) {
        if (bytes1("A") <= charByte && charByte <= bytes1("Z")) {
            charByte = bytes1(uint8(charByte) + 32);
        }
        return charByte;
    }

    function _validateDomain(
        Set storage set,
        string memory input
    ) internal view returns (string memory) {
        bytes memory delimiter = bytes(".");
        bytes memory inputBytes = bytes(input);
        bytes memory concatenatedBytes = new bytes(0);
        uint256 _lastIndex = inputBytes.length - 1;

        for (int256 i = int256(inputBytes.length) - 1; i >= 0; i--) {
            // convert to lower case
            uint256 _index = uint256(i);
            inputBytes[_index] = toLowerCaseIfNeeded(inputBytes[_index]);

            if (
                inputBytes[_index] == delimiter[0] &&
                _index != 0 &&
                _index != _lastIndex
            ) {
                _domainNotRegistered(set, string(concatenatedBytes));
            } else if (inputBytes[uint256(i)] == bytes1("/")[0]) {
                // check https:// or http://
                for (uint j = 0; j < _index; j++) {
                    require(
                        ((inputBytes[j] == bytes23("https://")[j]) ||
                            (inputBytes[j] == bytes23("http://")[j])),
                        "Domain start http:// or https://"
                    );
                }
                break;
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
                inputBytes[uint256(i)],
                concatenatedBytes
            );
        }
        return string(concatenatedBytes);
    }

    function _domainRegistered(
        Set storage set,
        string memory value
    ) private view returns (string memory) {
        require((set._positions[value] == 0), "Domain is already registered");
        return value;
    }

    function _domainNotRegistered(
        Set storage set,
        string memory value
    ) private view returns (string memory) {
        require((set._positions[value] != 0), "Domain is not registered");
        return value;
    }

    function add(
        Set storage set,
        Domain memory domain
    ) internal returns (bool) {
        domain.name = _domainRegistered(set, _validateDomain(set, domain.name));
        return _add(set, domain);
    }

    function update(
        Set storage set,
        Domain memory domain
    ) internal returns (bool) {
        domain.name = _domainNotRegistered(
            set,
            _validateDomain(set, domain.name)
        );
        return _update(set, domain);
    }

    function remove(
        Set storage set,
        string memory value
    ) internal returns (bool) {
        return
            _remove(
                set,
                _domainNotRegistered(set, _validateDomain(set, value))
            );
    }

    function get(
        Set storage set,
        string memory value
    ) internal view returns (Domain storage) {
        return
            _get(set, _domainNotRegistered(set, _validateDomain(set, value)));
    }

    function items(Set storage set) internal view returns (Domain[] memory) {
        return _items(set);
    }

    function length(Set storage set) internal view returns (uint256) {
        return _length(set);
    }
}
