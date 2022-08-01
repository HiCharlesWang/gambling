/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.0",
  networks: {
    hardhat: {
      gasPrice: 11875000002220,
      gasLimit: 2100022222222222222220
    },
  }
};
require('@nomiclabs/hardhat-waffle');
