pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

contract gamblingVault is ERC20("gamblingShare", "gShare"), Ownable {
    // uint256 extAdded;
    uint256 public reservedAmount;
    int256 public gameProfit;
    address public immutable gameAddress; // test done
    using SafeCast for uint256;
    using SafeCast for int256;

    event Withdraw(address _user, uint256 _amount);
    event Deposit(address _user, uint256 _value);

    constructor(address _game) {
        // test done
        gameAddress = _game;
    }

    modifier onlyGame() {
        // test done
        require(
            msg.sender == gameAddress,
            "Only the game can execute this functions"
        );
        _;
    }

    function deposit() external payable {
        // test done
        uint256 shareAmount;
        require(msg.value > 0, "Not possible to purchase zero shares"); // test done
        if (totalSupply() == 0) {
            // test done

            shareAmount = msg.value;
        } else {
            shareAmount =
                (msg.value * totalSupply()) /
                (address(this).balance - msg.value); // test done (edge cases)
        }

        super._mint(msg.sender, shareAmount); // test done
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 _shares) external returns (uint256) {
        // test done
        uint256 amount = (_shares * address(this).balance) / totalSupply(); // test done
        require(
            address(this).balance >= reservedAmount + amount,
            "Not possible due to reserve reservations"
        );
        super._burn(msg.sender, _shares);
        payable(msg.sender).transfer(amount);
        emit Withdraw(msg.sender, amount);
        return amount;
    }

    function takeETH(uint256 _amount) external onlyGame {
        require(
            address(this).balance >= _amount,
            "Contract does not have enough funds"
        ); // this should never happen
        require(reservedAmount >= _amount, "Not enough funds reserved");
        gameProfit -= _amount.toInt256();
        reservedAmount -= _amount; // small bug which was detected during my tests (test line:103)
        payable(gameAddress).transfer(_amount);
    }

    function reserveETH(uint256 _amount) external onlyGame {
        reservedAmount += _amount;
    }

    function depositETH() external payable onlyGame {
        // test done
        int256 value = msg.value.toInt256();
        gameProfit += value; // test done
    }

    // function depositETH() payable external onlyGame { // test done
    //     uint256 profit = gameProfit.toUint256();
    //     profit += msg.value; // test done
    //     gameProfit = profit.toInt256(); // test done
    // }
}
