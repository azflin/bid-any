require("@nomiclabs/hardhat-ethers");
const { ethers } = require("hardhat");

const feeReceiver = "0xcd6DD8D6A5Afb4AEd5eEaD9Db3551CBA70fa7727";

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
