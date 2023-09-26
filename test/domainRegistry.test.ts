import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

// TEST contract ./contracts/domainRegistry.sol
describe("DomainRegistry", function () {
  let DomainRegistry: any;
  let domainRegistry: any;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  beforeEach(async function () {
    [addr1, addr2] = await ethers.getSigners();
    DomainRegistry = await ethers.getContractFactory("DomainRegistry");
    domainRegistry = await DomainRegistry.deploy();
  });

  it("Should top level domain special characters", async function () {
    const invalidDomainNames = [
      ".com",
      "com.",
      "domain@name",
      "special*char",
      "example.com",
    ];

    const depositAmount = ethers.parseEther("0.001");
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

    const depositAmount = ethers.parseEther("0.001");
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

    const depositAmount = ethers.parseEther("0.001");
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
    const depositAmount = ethers.parseEther("0.001");
    await domainRegistry
      .connect(addr1)
      .registerDomain(domainName, { value: depositAmount });

    const domain = await domainRegistry.domains(domainName);
    expect(domain.owner).to.equal(await addr1.getAddress());
    expect(domain.deposit).to.equal(depositAmount);
  });

  it("Should release a domain and refund the deposit", async function () {
    const domainName = "example";
    const depositAmount = ethers.parseEther("0.001");

    await domainRegistry
      .connect(addr1)
      .registerDomain(domainName, { value: depositAmount });
    const balanceBefore = await ethers.provider.getBalance(addr1);
    const tx = await domainRegistry.connect(addr1).releaseDomain(domainName);
    const receipt = await tx.wait(); // Очікуємо на підтвердження транзакції
    const gasUsed = BigInt(receipt.gasUsed * tx.gasPrice); // Газові витрати * ціна газу
    const balanceAfter = await ethers.provider.getBalance(addr1);
    const domain = await domainRegistry.domains(domainName);

    expect(domain.owner).to.equal("0x0000000000000000000000000000000000000000");
    expect(domain.deposit).to.equal(0n);

    // Check that the balance has changed to depositAmount + gas costs
    const expectedBalanceChange = depositAmount - gasUsed;
    expect(balanceAfter - balanceBefore).to.equal(expectedBalanceChange);
  });

  it("Should not allow registration of an already registered domain", async function () {
    const domainName = "gov";
    const depositAmount = ethers.parseEther("0.001");

    await domainRegistry
      .connect(addr1)
      .registerDomain(domainName, { value: depositAmount });

    // Try to register the same domain suddenly
    await expect(
      domainRegistry
        .connect(addr2)
        .registerDomain(domainName, { value: depositAmount })
    ).to.be.revertedWith("Domain is already registered");
  });

  it("Should not allow release of a domain by a non-owner", async function () {
    const domainName = "example";
    const depositAmount = ethers.parseEther("0.001");

    await domainRegistry
      .connect(addr1)
      .registerDomain(domainName, { value: depositAmount });

    // An attempt to release a domain that is not the owner
    await expect(
      domainRegistry.connect(addr2).releaseDomain(domainName)
    ).to.be.revertedWith("Only the owner can release the domain");
  });

  it("Should not allow release of an unregistered domain", async function () {
    const domainName = "com";
    // Attempting to release an unregistered domain
    await expect(
      domainRegistry.connect(addr1).releaseDomain(domainName)
    ).to.be.revertedWith("Domain is not registered");
  });
  it("Transfer of invalid deposit", async function () {
    const domainName = "ua";
    const depositAmount = ethers.parseEther("1");
    const defaulDeposit = await domainRegistry.collateral();
    expect(defaulDeposit).to.not.equal(depositAmount);
    await expect(
      domainRegistry
        .connect(addr1)
        .registerDomain(domainName, { value: depositAmount })
    ).to.be.revertedWith("Deposit must equal to collateral");
  });
});
