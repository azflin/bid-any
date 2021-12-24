require("@nomiclabs/hardhat-ethers");
const { ethers } = require("hardhat");

const feeReceiver = "0xEF330d6F0B4375c39D8eD3d0D690a5B69e9EcD0c";

async function main() {
  const Marketplace = await ethers.getContractFactory("BidAny");
  const marketplace = await Marketplace.deploy(feeReceiver);
  await marketplace.deployed();
  console.log(`Market Place deployed at ${marketplace.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
