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
      "-com",
      "ua-",
      "domain@name",
      "special*char",
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
      await domainRegistry
        .connect(addr1)
        .registerDomain(domainName, { value: depositAmount });
      let result = await domainRegistry.getDomain(domainName);
      expect(result.name).to.equal(domainName.toLowerCase());
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

  it("Check all domain in contract", async function () {
    const domainsNames = ["com", "ua"];
    for (const domainName of domainsNames) {
      await domainRegistry
        .connect(addr1)
        .registerDomain(domainName, { value: depositAmount });
    }
    const reuslt = await domainRegistry.getAllDomains();
    const owner = await addr1.getAddress();
    expect(reuslt[0].name).to.equal(domainsNames[0]);
    expect(reuslt[1].name).to.equal(domainsNames[1]);
    expect(reuslt[0].owner).to.equal(owner);
    expect(reuslt[1].owner).to.equal(owner);
  });

  it("Check count registation domains", async function () {
    const domainNames = ["gCoM", "qwerTyuiopasdfghjklzxcvbnmqwertyui"];
    for (const domainName of domainNames) {
      await domainRegistry
        .connect(addr1)
        .registerDomainAssambly(domainName, { value: depositAmount });
    }
    expect(await domainRegistry.countDomains()).to.equal(domainNames.length);
  });

  it("Checking the presence of a parent domain", async function () {
    const domainName = "kos-data.com";
    await expect(
      domainRegistry
        .connect(addr1)
        .registerDomain(domainName, { value: depositAmount })
    ).to.be.revertedWith("Domain is not registered");
  });

  it("Check using prefix https or http ", async function () {
    await domainRegistry
      .connect(addr1)
      .registerDomain("com", { value: depositAmount });
    await domainRegistry
      .connect(addr1)
      .registerDomain("http://kos-data.com", { value: depositAmount });

    const diferentVariants = ["https://kos-data.com", "kos-data.com"];
    for (const domainName of diferentVariants) {
      let getDomain = await domainRegistry.getDomain(domainName);
      expect(getDomain.owner).to.equal(await addr1.getAddress());
    }
  });

  it("Check using prefix https:// or http:// if not valid ", async function () {
    await domainRegistry
      .connect(addr1)
      .registerDomain("com", { value: depositAmount });

    const notValidDomainName = "kos-https://data.com";
    await expect(
      domainRegistry
        .connect(addr1)
        .registerDomain(notValidDomainName, { value: depositAmount })
    ).to.be.revertedWith("Domain start http:// or https://");
  });

  it("Check using registerDomainAssambly", async function () {
    const domainNames = ["gCoM", "qwerTyuiopasdfghjklzxcvbnmqwertyui"];
    for (const domainName of domainNames) {
      await domainRegistry
        .connect(addr1)
        .registerDomainAssambly(domainName, { value: depositAmount });
      let getDomain = await domainRegistry.getDomain(domainName);
      expect(getDomain.owner).to.equal(await addr1.getAddress());
    }
  });

  it("Check using not valid domain http assembly ", async function () {
    await expect(
      domainRegistry
        .connect(addr1)
        .registerDomainAssambly("pphttps://est", { value: depositAmount })
    ).to.be.revertedWith("Domain start http:// or https://");
  });

  it("Check using prefix https or http registerDomainAssambly", async function () {
    await domainRegistry
      .connect(addr1)
      .registerDomainAssambly("test", { value: depositAmount });

    await domainRegistry
      .connect(addr1)
      .registerDomainAssambly("https://kos-data.test", {
        value: depositAmount,
      });
    const diferentVariants = ["kos-data.test", "http://kos-data.test"];

    for (const domainName of diferentVariants) {
      let result = await domainRegistry.getDomain(domainName);
      expect(result.owner).to.equal(await addr1.getAddress());
    }
  });

  it("Get price asselby check", async function () {
    await domainRegistry
      .connect(addr1)
      .registerDomainAssambly("test", { value: depositAmount });
    let result0 = await domainRegistry
      .connect(addr1)
      .registerDomain("https://kos-data.test", { value: depositAmount });

    let result1 = await domainRegistry
      .connect(addr1)
      .registerDomainAssambly("https://kos-dats.test", {
        value: depositAmount,
      });
    console.log("Result not assembly", result0.gasPrice);
    console.log("Result with assembly", result1.gasPrice);
    if (result1.gasPrice < result0.gasPrice) {
      console.log(
        "With assembly less gas",
        "====",
        result0.gasPrice - result1.gasPrice
      );
    } else if (result1.gasPrice > result0.gasPrice) {
      console.log(
        "With not assebly less gas",
        "====",
        result1.gasPrice - result0.gasPrice
      );
    }
  });
});
