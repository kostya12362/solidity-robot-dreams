import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const ContractName = "DomainRegistry";

// TEST contract ./contracts/domainRegistry.sol
describe(ContractName, function () {
  let domainRegistry: any;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  const depositAmount = ethers.parseEther("0.001");

  beforeEach(async function () {
    [addr1, addr2] = await ethers.getSigners();
    domainRegistry = await ethers.deployContract(ContractName);
  });

  it("Should top level domain special characters", async function () {
    const invalidDomainNames = [
      ".com",
      "com.",
      "domain@name",
      "special*char",
      "example.com",
    ];

    for (const domainName of invalidDomainNames) {
      await expect(
        domainRegistry
          .connect(addr1)
          .registerDomain(domainName, { value: depositAmount })
      ).to.be.revertedWith("It is prohibited to use special characters");
    }
  });

  it("Should with upercase", async function () {
    const invalidDomainNames = ["UA", "Com", "eXample"];

    for (const domainName of invalidDomainNames) {
      await expect(
        domainRegistry
          .connect(addr1)
          .registerDomain(domainName, { value: depositAmount })
      ).to.be.revertedWith("Domain name must be in lower case");
    }
  });

  it("Should top level domain special characters", async function () {
    const invalidDomainNames = [".com", "com.", "domain@name", "special*char"];
    for (const domainName of invalidDomainNames) {
      await expect(
        domainRegistry
          .connect(addr1)
          .registerDomain(domainName, { value: depositAmount })
      ).to.be.revertedWith("It is prohibited to use special characters");
    }
  });

  it("Should register a domain with a deposit", async function () {
    const domainName = "example";
    await domainRegistry
      .connect(addr1)
      .registerDomain(domainName, { value: depositAmount });
    const domain = await domainRegistry.getDomain(domainName);
    expect(domain.owner).to.equal(await addr1.getAddress());
    expect(domain.deposit).to.equal(depositAmount);
  });

  it("Should release a domain and refund the deposit", async function () {
    const domainName = "example";
    await domainRegistry
      .connect(addr1)
      .registerDomain(domainName, { value: depositAmount });
    const balanceBefore = await ethers.provider.getBalance(addr1);
    const tx = await domainRegistry.connect(addr1).removeDomain(domainName);
    const receipt = await tx.wait();
    const gasUsed = BigInt(receipt.gasUsed * tx.gasPrice);
    const balanceAfter = await ethers.provider.getBalance(addr1);
    await expect(domainRegistry.getDomain(domainName)).to.be.revertedWith(
      "Domain is not registered"
    );
    // Check that the balance has changed to depositAmount + gas costs
    const expectedBalanceChange = depositAmount - gasUsed;
    expect(balanceAfter - balanceBefore).to.equal(expectedBalanceChange);
  });

  it("Should not allow registration of an already registered domain", async function () {
    const domainName = "gov";
    await domainRegistry
      .connect(addr1)
      .registerDomain(domainName, { value: depositAmount });

    await expect(
      domainRegistry
        .connect(addr2)
        .registerDomain(domainName, { value: depositAmount })
    ).to.be.revertedWith("Domain is already registered");
  });

  it("Should not allow release of a domain by a non-owner", async function () {
    const domainName = "example";
    await domainRegistry
      .connect(addr1)
      .registerDomain(domainName, { value: depositAmount });

    // An attempt to release a domain that is not the owner
    await expect(
      domainRegistry.connect(addr2).removeDomain(domainName)
    ).to.be.revertedWith("Only the owner can release the domain");
  });

  it("Should not allow release of an unregistered domain", async function () {
    const domainName = "com";
    await domainRegistry
      .connect(addr2)
      .registerDomain(domainName, { value: depositAmount });
    // Attempting to release an unregistered domain
    await expect(
      domainRegistry.connect(addr1).removeDomain(domainName)
    ).to.be.revertedWith("Only the owner can release the domain");
  });

  it("Transfer of invalid deposit", async function () {
    const domainName = "ua";
    const notValidDeposidAmount = ethers.parseEther("1");
    const defaulDeposit = await domainRegistry.collateral();
    expect(defaulDeposit).to.not.equal(notValidDeposidAmount);
    await expect(
      domainRegistry
        .connect(addr1)
        .registerDomain(domainName, { value: notValidDeposidAmount })
    ).to.be.revertedWith("Deposit must equal to collateral");
  });

  it("Transfer of invalid deposit", async function () {
    const domainName = "ua";
    const defaulDeposit = await domainRegistry.collateral();
    const notValidDeposidAmount = ethers.parseEther("1");
    expect(defaulDeposit).to.not.equal(notValidDeposidAmount);
    await expect(
      domainRegistry
        .connect(addr1)
        .registerDomain(domainName, { value: notValidDeposidAmount })
    ).to.be.revertedWith("Deposit must equal to collateral");
  });

  it("Check all domain in contract", async function () {
    const domainsNames = ["com", "ua", "name", "story"];
    for (const domainName of domainsNames) {
      await domainRegistry
        .connect(addr1)
        .registerDomain(domainName, { value: depositAmount });
    }
    const reuslt = await domainRegistry.getAllDomains();
    expect(reuslt[0].length).to.equal(domainsNames.length);
    expect(reuslt[1].length).to.equal(domainsNames.length);
  });
});
