pragma solidity >=0.8.0;

interface IVAULT {
    function takeETH(uint256 _amount) external;

    function depositETH() external payable;

    function reserveETH(uint256 _amount) external;
}

contract gameContract {
    address public vault;

    function setVault(address _addr) external {
        vault = _addr;
    }

    function sendETH() external payable {
        IVAULT(vault).depositETH{value: msg.value}();
    }

    function takeETH(uint256 _amount) external {
        IVAULT(vault).takeETH(_amount);
        //  payable(_winner).transfer(_amount)
    }

    function reserveETH(uint256 _amount) external {
        IVAULT(vault).reserveETH(_amount);
    }

    receive() external payable {}
}
