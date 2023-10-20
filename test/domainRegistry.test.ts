import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

// TEST contract ./contracts/domainRegistry.sol

const contracts = [
  { contractName: "DomainRegistry" },
  { contractName: "DomainRegistryAssembly" },
];

contracts.forEach(({ contractName }) => {
  describe(`Deploy contract - ${contractName}`, function () {
    let domainRegistry: any;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;
    const depositAmount = ethers.parseEther("0.001");

    beforeEach(async function () {
      [addr1, addr2] = await ethers.getSigners();
      domainRegistry = await ethers.deployContract(contractName);
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
      const domainsNames = ["com", "ua", "test.ua", "uk"];
      const owner = await addr1.getAddress();
      let localDB = new Object();
      for (const domainName of domainsNames) {
        await domainRegistry
          .connect(addr1)
          .registerDomain(domainName, { value: depositAmount });
      }
      let registerEvents = await domainRegistry.queryFilter("DomainRegistered");
      for (let i = 0; i < domainsNames.length; i++) {
        expect(registerEvents[i].args.domainName).to.equal(domainsNames[i]);
        expect(registerEvents[i].args.owner).to.equal(owner);
        localDB[registerEvents[i].args.domainName] = [
          registerEvents[i].args.owner,
          registerEvents[i].args.deposit,
        ];
        if (registerEvents[i].args.operation === "remove") {
          delete localDB[registerEvents[i].args.domainName];
        }
      }
      expect(Object.keys(localDB).length).to.equal(domainsNames.length);
      // ================ After remove test ================
      await domainRegistry.connect(addr1).removeDomain(domainsNames[1]);
      let registerEventsAfterRemove = await domainRegistry.queryFilter(
        "DomainRegistered"
      );
      for (let event of registerEventsAfterRemove) {
        localDB[event.args.domainName] = [event.args.owner, event.args.deposit];
        if (event.args.operation === "remove") {
          delete localDB[event.args.domainName];
        }
      }
      expect(Object.keys(localDB).length).to.equal(domainsNames.length - 1);
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
      ).to.be.revertedWith("It is prohibited to use special characters");
    });
    it("Check count of registation domains and using gas", async function () {
      const domainsNames = ["com", "ua", "test", "uk"];
      let gasTotal = 0n;
      for (const domainName of domainsNames) {
        let tx = await domainRegistry
          .connect(addr1)
          .registerDomain(domainName, { value: depositAmount });
        const receipt = await tx.wait();
        gasTotal += receipt.gasUsed;
      }
      console.log(gasTotal);
      expect(await domainRegistry.countDomains()).to.equal(domainsNames.length);
    });
  });
});
