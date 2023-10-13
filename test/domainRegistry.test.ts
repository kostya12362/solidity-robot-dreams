import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { beforeEach } from "mocha";

const ContractName = "DomainRegistry";

// TEST contract ./contracts/domainRegistry.sol
describe(ContractName, function () {
  let domainRegistry: any;
  let addrOwner: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  let contractAddress: SignerWithAddress;
  const depositAmount = ethers.parseEther("0.006");

  beforeEach(async function () {
    [addrOwner, addr2, addr3] = await ethers.getSigners();
    domainRegistry = await ethers.deployContract(ContractName);
    contractAddress = await domainRegistry.getAddress();
  });

  it("Should top level domain special characters", async function () {
    const invalidDomainNames = [
      ".com",
      "com.",
      "-com",
      "ua-",
      "domain@name",
      "special*char",
    ];
    for (const domainName of invalidDomainNames) {
      await expect(
        domainRegistry
          .connect(addrOwner)
          .registerPriceDomain(domainName, depositAmount)
      ).to.be.revertedWith("It is prohibited to use special characters");
    }
  });

  it("Should with upercase", async function () {
    const invalidDomainNames = ["UA", "Com", "eXample"];

    for (const domainName of invalidDomainNames) {
      await domainRegistry
        .connect(addrOwner)
        .registerPriceDomain(domainName, depositAmount);
      let result = await domainRegistry.getDomain(domainName);
      expect(result.name).to.equal(domainName.toLowerCase());
    }
  });

  it("Should register owner domain with a deposit, price and zero address", async function () {
    const domainName = "example";
    await domainRegistry
      .connect(addrOwner)
      .registerPriceDomain(domainName, depositAmount);
    const domain = await domainRegistry.getDomain(domainName);
    expect(domain.owner).to.equal(ethers.ZeroAddress);
    expect(domain.deposit).to.equal(0);
    expect(domain.price).to.equal(depositAmount);
  });

  it("Should not allow registration of an already registered domain", async function () {
    const domainName = "gov";
    await domainRegistry
      .connect(addrOwner)
      .registerPriceDomain(domainName, depositAmount);
    await expect(
      domainRegistry
        .connect(addrOwner)
        .registerPriceDomain(domainName, depositAmount)
    ).to.be.revertedWith("Domain is already registered");
  });

  it("Should verifying domain deletion by a non-contract owner", async function () {
    const domainName = "example";
    await domainRegistry
      .connect(addrOwner)
      .registerPriceDomain(domainName, depositAmount);
    await expect(
      domainRegistry.connect(addr2).removeDomain(domainName)
    ).to.be.revertedWithCustomError(
      domainRegistry,
      "OwnableUnauthorizedAccount"
    );
  });

  it("Verifies the deletion of a domain with the owner", async function () {
    const domainName = "example";
    await domainRegistry
      .connect(addrOwner)
      .registerPriceDomain(domainName, depositAmount);

    await domainRegistry
      .connect(addr2)
      .registerDomain(domainName, { value: depositAmount });
    await expect(
      domainRegistry.connect(addrOwner).removeDomain(domainName)
    ).to.be.revertedWith("Cannot delete a domain if it has an owner");
  });

  it("Check all domain in contract", async function () {
    const domainsNames = ["com", "ua"];
    for (const domainName of domainsNames) {
      await domainRegistry
        .connect(addrOwner)
        .registerPriceDomain(domainName, depositAmount);
      await domainRegistry
        .connect(addrOwner)
        .registerDomain(domainName, { value: depositAmount });
    }
    const reuslt = await domainRegistry.getAllDomains();
    const owner = await addrOwner.getAddress();
    expect(reuslt[0].name).to.equal(domainsNames[0]);
    expect(reuslt[1].name).to.equal(domainsNames[1]);
    expect(reuslt[0].owner).to.equal(owner);
    expect(reuslt[1].owner).to.equal(owner);
  });

  it("Checking the presence of a parent domain", async function () {
    const domainName = "kos-data.com";
    await expect(
      domainRegistry
        .connect(addrOwner)
        .registerDomain(domainName, { value: depositAmount })
    ).to.be.revertedWith("Domain is not registered");
  });

  it("Check using prefix https or http ", async function () {
    await domainRegistry
      .connect(addrOwner)
      .registerPriceDomain("com", depositAmount);
    await domainRegistry
      .connect(addrOwner)
      .registerPriceDomain("http://kos-data.com", depositAmount);

    await domainRegistry
      .connect(addr2)
      .registerDomain("kos-data.com", { value: depositAmount });

    const diferentVariants = ["https://kos-data.com", "kos-data.com"];
    for (const domainName of diferentVariants) {
      let getDomain = await domainRegistry.getDomain(domainName);
      expect(getDomain.owner).to.equal(await addr2.getAddress());
    }
  });

  it("Check using prefix https:// or http:// if not valid ", async function () {
    await domainRegistry
      .connect(addrOwner)
      .registerPriceDomain("com", depositAmount);

    const notValidDomainName = "kos-https://data.com";
    await expect(
      domainRegistry
        .connect(addrOwner)
        .registerPriceDomain(notValidDomainName, depositAmount)
    ).to.be.revertedWith("Domain start http:// or https://");
  });

  it("Should set the owner correctly", async function () {
    const contractOwner = await domainRegistry.owner();
    expect(contractOwner).to.equal(addrOwner.address);
  });

  it("Should add price not owner", async function () {
    await expect(
      domainRegistry
        .connect(addr2)
        .registerPriceDomain("test", ethers.parseEther("0.001"))
    ).to.be.revertedWithCustomError(
      domainRegistry,
      "OwnableUnauthorizedAccount"
    );
  });

  it("Should add price owner", async function () {
    const priceOwner = ethers.parseEther("0.0005");
    const domainName = "test";
    await domainRegistry
      .connect(addrOwner)
      .registerPriceDomain(domainName, priceOwner);
    const reusltAllDomains = await domainRegistry.getAllDomains();
    expect(reusltAllDomains.length).to.equal(1);
    expect(reusltAllDomains[0].owner).to.equal(ethers.ZeroAddress);
    expect(reusltAllDomains[0].name).to.equal(domainName);
    expect(reusltAllDomains[0].price).to.equal(priceOwner);
    expect(reusltAllDomains[0].deposit).to.equal(0);
  });

  it("Transfer of invalid deposit", async function () {
    const domainName = "ua";
    const priceOwner = ethers.parseEther("0.005");
    await domainRegistry
      .connect(addrOwner)
      .registerPriceDomain(domainName, priceOwner);
    await expect(
      domainRegistry
        .connect(addr2)
        .registerDomain(domainName, { value: depositAmount })
    ).to.be.revertedWith("Deposit must equal to collateral");
  });

  it("Should of valid deposit and re registration different address", async function () {
    const domainName = "ua";
    await domainRegistry
      .connect(addrOwner)
      .registerPriceDomain(domainName, depositAmount);

    await domainRegistry
      .connect(addr2)
      .registerDomain(domainName, { value: depositAmount });
    await expect(
      domainRegistry
        .connect(addr3)
        .registerDomain(domainName, { value: depositAmount })
    ).to.be.revertedWith("The domain already has an owner");
    const reusltAllDomains = await domainRegistry.getAllDomains();
    expect(reusltAllDomains.length).to.equal(1);
    expect(reusltAllDomains[0].owner).to.equal(await addr2.getAddress());
    expect(reusltAllDomains[0].name).to.equal(domainName);
    expect(reusltAllDomains[0].price).to.equal(depositAmount);
    expect(reusltAllDomains[0].deposit).to.equal(depositAmount);
  });

  it("Checking refund after deletion by contract owner", async function () {
    const domainName = "example";
    await domainRegistry
      .connect(addrOwner)
      .registerPriceDomain(domainName, depositAmount);

    await domainRegistry
      .connect(addrOwner)
      .registerDomain(domainName, { value: depositAmount });

    const balanceBefore = await ethers.provider.getBalance(addrOwner);
    const tx = await domainRegistry.connect(addrOwner).removeDomain(domainName);
    const receipt = await tx.wait();
    const balanceAfter = await ethers.provider.getBalance(addrOwner);
    await expect(domainRegistry.getDomain(domainName)).to.be.revertedWith(
      "Domain is not registered"
    );
    // Check that the balance has changed to depositAmount + gas costs
    const expectedBalanceChange = depositAmount - receipt.cumulativeGasUsed;
    expect(balanceAfter - balanceBefore).to.equal(expectedBalanceChange);
  });

  it("Should of valid deposit and re registration owner", async function () {
    const domainName = "ua";
    await domainRegistry
      .connect(addrOwner)
      .registerPriceDomain(domainName, depositAmount);

    await domainRegistry
      .connect(addrOwner)
      .registerDomain(domainName, { value: depositAmount });

    await expect(
      domainRegistry
        .connect(addr2)
        .registerDomain(domainName, { value: depositAmount })
    ).to.be.revertedWith("The domain already has an owner");

    const reusltAllDomains = await domainRegistry.getAllDomains();
    expect(reusltAllDomains.length).to.equal(1);
    expect(reusltAllDomains[0].owner).to.equal(await addrOwner.getAddress());
    expect(reusltAllDomains[0].name).to.equal(domainName);
    expect(reusltAllDomains[0].price).to.equal(depositAmount);
    expect(reusltAllDomains[0].deposit).to.equal(depositAmount);
  });

  it("Check validate registation price", async function () {
    const domainName = "ua";
    await expect(
      domainRegistry
        .connect(addrOwner)
        .registerPriceDomain(domainName, ethers.parseEther("0"))
    ).to.be.revertedWith("Price must be greater than 0");
  });

  it("Check balance owner of contracts", async function () {
    const domainName = "ua";

    const balanceBefore = await ethers.provider.getBalance(contractAddress);

    await domainRegistry
      .connect(addrOwner)
      .registerPriceDomain(domainName, depositAmount);
    await domainRegistry
      .connect(addr2)
      .registerDomain(domainName, { value: depositAmount });
    const balanceAfter = await ethers.provider.getBalance(contractAddress);
    expect(balanceAfter - balanceBefore).to.equal(depositAmount);
  });

  it("Check length of domains registation", async function () {
    const domainsName = ["ua", "com"];

    for (const domainName in domainsName) {
      await domainRegistry
        .connect(addrOwner)
        .registerPriceDomain(domainName, depositAmount);
    }
    const result = await domainRegistry.countDomains();
    expect(result).to.equal(domainsName.length);
  });

  it("Check length of domains registation", async function () {
    const domainName = "ua";
    const balanceBefore = await ethers.provider.getBalance(addrOwner.address);
    await domainRegistry
      .connect(addrOwner)
      .registerPriceDomain(domainName, depositAmount);

    await domainRegistry
      .connect(addr2)
      .registerDomain(domainName, { value: depositAmount });
    const tx = await domainRegistry.connect(addrOwner).withdrawAllFunds();
    await tx.wait();

    const balanceAfter = await ethers.provider.getBalance(addrOwner.address);
    expect(balanceAfter > balanceBefore).to.be.true;
  });
});
