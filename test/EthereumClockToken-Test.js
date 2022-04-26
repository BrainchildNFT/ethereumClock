const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EthereumClockToken", function () {
  it("Deployment should assign the total supply of tokens to the owner", async function () {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();

    const _pendingURI =
      "https://ipfs.io/ipfs/QmUvogkkF8fLjjpSr7UyqVU6ZZZEQTVNU2s5vzMnME3ydA/pending.json";
    const _proxyRegistryAddress = "0xf57b2c51ded3a29e6891aba85459d600256cf317";

    const ethClockTokenFactory = await ethers.getContractFactory(
      "EthereumClockToken"
    );
    const ethClockToken = await ethClockTokenFactory.deploy(
      _pendingURI,
      _proxyRegistryAddress
    );
    await ethClockToken.deployed();

    const enhancementFactory = await ethers.getContractFactory("Enhancement");
    const enhancementToken = await enhancementFactory.deploy(
      ethClockToken.address
    );
    await enhancementToken.deployed();

    const redeemFactory = await ethers.getContractFactory("Redeem");
    const redeemToken = await redeemFactory.deploy(ethClockToken.address);
    await redeemToken.deployed();

    await ethClockToken.init(
      10,
      420,
      3,
      4207,
      125,
      "120000000000000000",
      "0",
      "60000000000000000",
      true,
      true,
      ".json"
    );
    await ethClockToken.setRevealURI(
      "https://ipfs.io/ipfs/QmUvogkkF8fLjjpSr7UyqVU6ZZZEQTVNU2s5vzMnME3ydA/"
    );
    await ethClockToken.registerController(enhancementToken.address);
    await ethClockToken.registerController(redeemToken.address);

    expect(await ethClockToken._MAX_TOKEN_LEVEL_()).to.equal(10);
    expect(await ethClockToken._PRESALE_COUNT_()).to.equal(420);
    expect(await ethClockToken._MAX_MINT_COUNT_()).to.equal(3);
    expect(await ethClockToken._WHITE_LIST_COUNT_()).to.equal(4207);
    expect(await ethClockToken._COUNT_PER_LEVEL_()).to.equal(125);
    expect(await ethClockToken._REVEAL_ALLOWED_()).to.equal(true);
    expect(await ethClockToken._PRESALE_ALLOWED_()).to.equal(true);
    expect(await ethClockToken.whiteList(owner.address)).to.equal(true);
    expect(await ethClockToken.whiteList(addr1.address)).to.equal(false);
    expect(await ethClockToken.whiteList(addr2.address)).to.equal(false);

    await ethClockToken.setMaxMintCount(4);
    expect(await ethClockToken._MAX_MINT_COUNT_()).to.equal(4);

    await ethClockToken.setWhiteListCount(5000);
    expect(await ethClockToken._WHITE_LIST_COUNT_()).to.equal(5000);

    await ethClockToken.setPresaleCount(500);
    expect(await ethClockToken._PRESALE_COUNT_()).to.equal(500);

    await ethClockToken.raffle([addr1.address]);

    await ethClockToken.connect(addr2).register();
    expect(await ethClockToken.whiteList(addr1.address)).to.equal(true);
    expect(await ethClockToken.whiteList(addr2.address)).to.equal(true);

    await ethClockToken.connect(addr1).drop({
      from: addr1.address,
      value: ethers.utils.parseEther("0.06"),
    });
    await ethClockToken.connect(addr2).drop({
      from: addr2.address,
      value: ethers.utils.parseEther("0.06"),
    });

    expect(await ethClockToken.isAdditionalDrop()).to.equal(false);
    await ethClockToken.disableRaffle();
    expect(await ethClockToken.isAdditionalDrop()).to.equal(false);
    await ethClockToken.connect(addr3).directDrop({
      from: addr3.address,
      value: ethers.utils.parseEther("0.06"),
    });

    let tokenURI = await ethClockToken.callStatic.tokenURI(1);
    console.log("tokenURI = ", tokenURI);

    await ethClockToken.disableReveal();

    tokenURI = await ethClockToken.callStatic.tokenURI(1);
    console.log("tokenURI = ", tokenURI);

    // disable PreSale and enable Raffle after finishing mint prsale nft
    await ethClockToken.disablePreSale();
    await ethClockToken.enableRaffle();

    await ethClockToken.connect(addr2).drop({
      from: addr2.address,
      value: ethers.utils.parseEther("0.12"),
    });

    // enhancement workflow
    await enhancementToken.enableEnhancement();
    await enhancementToken.setLockTime(0);

    expect(await enhancementToken.enhanceRequested(1)).to.equal(false);
    await enhancementToken.connect(addr1).enhanceRequest(1);
    expect(await enhancementToken.enhanceRequested(1)).to.equal(true);
    expect(await enhancementToken.pendingEnhancedList(1)).to.equal(true);
    await enhancementToken.connect(addr1).enhance(1);
    expect(await enhancementToken.pendingEnhancedList(1)).to.equal(false);
    expect(await ethClockToken.levels(1)).to.equal(2);

    // redeem workflow
    await redeemToken.enableRedeem();

    console.log("startTimestamps = ", await ethClockToken.startTimestamps(1));
    await redeemToken.setLockTime(0);
    await redeemToken.connect(addr1).redeem(1);
    console.log("startTimestamps = ", await ethClockToken.startTimestamps(1));
  });
});
