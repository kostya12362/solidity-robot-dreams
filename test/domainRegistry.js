// Завантажуємо необхідні бібліотеки
const { expect } = require("chai");
const { ethers } = require("hardhat");

// Описуємо тестовий контракт
describe("DomainRegistry", function () {
  let DomainRegistry;
  let domainRegistry;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    DomainRegistry = await ethers.getContractFactory("DomainRegistry");
    domainRegistry = await DomainRegistry.deploy();
  });

  it("Should register a domain with a deposit", async function () {
    const domainName = "example.com";
    const depositAmount = ethers.parseEther("1");
    await domainRegistry
      .connect(addr1)
      .registerDomain(domainName, { value: depositAmount });

    const domain = await domainRegistry.domains(domainName);
    expect(domain.owner).to.equal(addr1.address);
    expect(domain.deposit).to.equal(depositAmount);
    expect(domain.isRegistered).to.equal(true);
  });

  it("Should release a domain and refund the deposit", async function () {
     const domainName = "example.com";
    const depositAmount = ethers.parseEther("1");

    await domainRegistry
      .connect(addr1)
      .registerDomain(domainName, { value: depositAmount });
    const balanceBefore = await ethers.provider.getBalance(addr1);
    const tx = await domainRegistry.connect(addr1).releaseDomain(domainName);
    const receipt = await tx.wait(); // Очікуємо на підтвердження транзакції
    // console.log(receipt)
    const gasUsed = receipt.gasUsed * tx.gasPrice; // Газові витрати * ціна газу
    const balanceAfter = await ethers.provider.getBalance(addr1);
    const domain = await domainRegistry.domains(domainName);

    expect(domain.owner).to.equal("0x0000000000000000000000000000000000000000");
    expect(domain.deposit).to.equal(0n);
    expect(domain.isRegistered).to.equal(false);

    // Перевірка, що баланс зменшився на depositAmount + газові витрати
    const expectedBalanceChange = depositAmount - gasUsed;
    expect(balanceAfter - balanceBefore).to.equal(expectedBalanceChange);
  });

  it("Should not allow registration of an already registered domain", async function () {
    const domainName = "example.com";
    const depositAmount = ethers.parseEther("1");

    await domainRegistry
      .connect(addr1)
      .registerDomain(domainName, { value: depositAmount });

    // Спроба зареєструвати той же домен вдруге
    await expect(
      domainRegistry
        .connect(addr2)
        .registerDomain(domainName, { value: depositAmount })
    ).to.be.revertedWith("Domain is already registered");
  });

  it("Should not allow release of a domain by a non-owner", async function () {
    const domainName = "example.com";
    const depositAmount = ethers.parseEther("1");

    await domainRegistry
      .connect(addr1)
      .registerDomain(domainName, { value: depositAmount });

    // Спроба звільнити домен не власником
    await expect(
      domainRegistry.connect(addr2).releaseDomain(domainName)
    ).to.be.revertedWith("Only the owner can release the domain");
  });

  it("Should not allow release of an unregistered domain", async function () {
    const domainName = "example.com";

    // Спроба звільнити незареєстрований домен
    await expect(
      domainRegistry.connect(addr1).releaseDomain(domainName)
    ).to.be.revertedWith("Domain is not registered");
  });
});
