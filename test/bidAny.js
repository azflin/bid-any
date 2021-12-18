const { expect } = require("chai");
const { ethers } = require("hardhat");
const hre = require("hardhat");
const erc721abi = require("../abis/ERC721.json");

const erc721address = "0x763864F1A74D748015f45F7c1181B60E62E40804";
const impersonatedAddress = "0xEF330d6F0B4375c39D8eD3d0D690a5B69e9EcD0c";

describe("BidAny contract", function () {
  before(async function () {
    this.Marketplace = await ethers.getContractFactory("BidAny");
    [this.account1, this.account2, this.account3] = await ethers.getSigners();
    marketplace = await this.Marketplace.deploy(this.account1.address);
    await marketplace.deployed();
    this.marketplace = await ethers.getContractAt(
      "BidAny",
      marketplace.address
    );
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonatedAddress],
    });
    this.impersonatedSigner = await ethers.getSigner(impersonatedAddress);
    // Give approval for marketplace contract to transfer impersonatedSigner's
    // and account1's NFT
    let erc721contract = new ethers.Contract(
      erc721address,
      erc721abi,
      this.impersonatedSigner
    );
    await erc721contract.setApprovalForAll(this.marketplace.address, true);
    erc721contract = erc721contract.connect(this.account1);
    await erc721contract.setApprovalForAll(this.marketplace.address, true);
    this.erc721contract = erc721contract;
  });

  it("should makeBid when bid is 0", async function () {
    this.marketplace = this.marketplace.connect(this.account1);
    await expect(
      this.marketplace.makeBid(erc721address, ethers.utils.parseEther("1"), {
        value: ethers.utils.parseEther("1"),
      })
    )
      .to.emit(this.marketplace, "NewBid")
      .withArgs(
        this.account1.address,
        ethers.utils.parseEther("1"),
        erc721address
      );
    expect(
      await ethers.provider.getBalance(this.marketplace.address)
    ).to.be.equal(ethers.utils.parseEther("1"));
    expect(
      await this.marketplace.bids(this.account1.address, erc721address)
    ).to.be.equal(ethers.utils.parseEther("1"));
  });

  it("shouldn't makeBid if insufficient ether when bid is 0", async function () {
    this.marketplace = this.marketplace.connect(this.impersonatedSigner);
    await expect(
      this.marketplace.makeBid(erc721address, ethers.utils.parseEther("1"), {
        value: ethers.utils.parseEther("0.99"),
      })
    ).to.be.revertedWith("Insufficient payment");
  });

  it("should handle changing bids correctly", async function () {
    this.marketplace = this.marketplace.connect(this.account1);
    // Increase bid to 1.5 ETH
    await expect(
      this.marketplace.makeBid(erc721address, ethers.utils.parseEther("1.5"), {
        value: ethers.utils.parseEther("0.5"),
      })
    )
      .to.emit(this.marketplace, "NewBid")
      .withArgs(
        this.account1.address,
        ethers.utils.parseEther("1.5"),
        erc721address
      );
    // Check that there's 1.5 ETH in the contract
    expect(
      await ethers.provider.getBalance(this.marketplace.address)
    ).to.be.equal(ethers.utils.parseEther("1.5"));
    // Try to increase bid to 2 ETH but only pay 0.4 ETH (0.1 ETH short)
    await expect(
      this.marketplace.makeBid(erc721address, ethers.utils.parseEther("2"), {
        value: ethers.utils.parseEther("0.4"),
      })
    ).to.be.revertedWith("Insufficient payment");
    // Decrease bid to 0.5 ETH
    const ethPriorToBidDecrease = await ethers.provider.getBalance(
      this.account1.address
    );
    await this.marketplace.makeBid(
      erc721address,
      ethers.utils.parseEther("0.5")
    );
    expect(
      await ethers.provider.getBalance(this.marketplace.address)
    ).to.be.equal(ethers.utils.parseEther("0.5"));
    // Check that there's 0.5 ETH in the contract
    expect(
      await ethers.provider.getBalance(this.marketplace.address)
    ).to.be.equal(ethers.utils.parseEther("0.5"));
    const ethAfterBidDecrease = await ethers.provider.getBalance(
      this.account1.address
    );
    // We expect account1's eth balance to increase by 1 ETH (we test for > 0.99 to account
    // for gas)
    expect(
      parseFloat(
        ethers.utils.formatEther(ethAfterBidDecrease.sub(ethPriorToBidDecrease))
      )
    ).to.be.gt(0.99);
  });

  it("should takeBid correctly", async function () {
    // At this point account1 has placed a bid of 0.5 ETH for <erc721address>
    // impersonatedSigner owns tokenId 2725 of <erc721address>
    this.marketplace = this.marketplace.connect(this.impersonatedSigner);
    const balanceBeforeTakeBid = await ethers.provider.getBalance(
      this.impersonatedSigner.address
    );
    await this.marketplace.takeBid(erc721address, 2725, this.account1.address);
    const balanceAfterTakeBid = await ethers.provider.getBalance(
      this.impersonatedSigner.address
    );
    // We expect balance to have increased by slightly less than 0.5
    expect(
      parseFloat(
        ethers.utils.formatEther(balanceAfterTakeBid.sub(balanceBeforeTakeBid))
      )
    ).to.be.gt(0.49);
    // Check that account1 has the NFT
    expect(await this.erc721contract.ownerOf(2725)).to.be.equal(
      this.account1.address
    );
  });

  it("should not takeBid if you don't own NFT", async function () {
    let marketplace = this.marketplace.connect(this.impersonatedSigner);
    await expect(
      marketplace.takeBid(erc721address, 2725, this.account1.address)
    ).to.be.revertedWith("You don't own this NFT");
  });

  it("should not takeBid there is no bid", async function () {
    let marketplace = this.marketplace.connect(this.account1);
    await expect(
      marketplace.takeBid(erc721address, 2725, this.account2.address)
    ).to.be.revertedWith("There is no bid");
  });

  it("should not let you bid the same", async function () {
    let marketplace = this.marketplace.connect(this.account1);
    await marketplace.makeBid(erc721address, ethers.utils.parseEther("1"), {
      value: ethers.utils.parseEther("1"),
    });
    await expect(
      marketplace.makeBid(erc721address, ethers.utils.parseEther("1"), {
        value: ethers.utils.parseEther("1"),
      })
    ).to.be.revertedWith("Cannot bid the same.");
  });

  it("should handle fees correctly", async function () {
    // account1 was the deployer
    let marketplace = this.marketplace.connect(this.account1);
    await marketplace.setFee(50);
    await marketplace.setFeeReceiver(this.account3.address);
    // The NFT is with account1. account2 will make bid on it
    marketplace = this.marketplace.connect(this.account2);
    await marketplace.makeBid(erc721address, ethers.utils.parseEther("1"), {
      value: ethers.utils.parseEther("1"),
    });
    marketplace = this.marketplace.connect(this.account1);
    let account3BalanceBefore = await ethers.provider.getBalance(
      this.account3.address
    );
    let account1BalanceBefore = await ethers.provider.getBalance(
      this.account1.address
    );
    await marketplace.takeBid(erc721address, 2725, this.account2.address);
    // Account 3 is the fee receiver and should have rececived 0.95
    let account3BalanceAfter = await ethers.provider.getBalance(
      this.account3.address
    );
    let account1BalanceAfter = await ethers.provider.getBalance(
      this.account1.address
    );
    expect(
      ethers.utils.formatEther(
        await account3BalanceAfter.sub(account3BalanceBefore)
      )
    ).to.be.equal("0.05");
    // Account 1's balance should have increased by approx 0.95 (less cause gas)
    const account1diff = parseFloat(
      ethers.utils.formatEther(
        await account1BalanceAfter.sub(account1BalanceBefore)
      )
    );
    expect(account1diff).to.be.gt(0.94);
    expect(account1diff).to.be.lt(0.95);
  });
});
