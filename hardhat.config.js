require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.0",
  networks: {
    localhost: {
      url: "http://localhost:8545",
    },
    fantom: {
      url: "https://rpc.ftm.tools/",
      chainId: 250,
      accounts: [process.env.PRIVATE_KEY],
    },
    hardhat: {
      forking: {
        blockNumber: 13691395,
        url: "https://eth-mainnet.alchemyapi.io/v2/v3XEMoQKY-qHj1R_MLDYiJOUdm59r9nh",
      },
      gas: "auto",
    },
    rinkeby: {
      url: process.env.RINKEBY_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
