// const ethers = require("ethers");
// const hre = require("hardhat");
// const abi = require("./abi/Lock.json");
// const contractAddress = "0xF72E090f47eB6cDE0f9Eec6BDe3e6BfB91E75280";
// const provider = new ethers.JsonRpcProvider(hre.config.networks.sepolia.url); // Замените на ваш Infura Project ID или URL вашего Ethereum узла

// const signer = new ethers.Wallet(
//   "",
//   provider
// );
// const contract = new ethers.Contract(contractAddress, abi, signer);

// // console.log(contract);

// async function callContractMethod() {
//   try {
//     const result = await contract.withdraw();
//     console.log("Результат вызова myMethod:", result);
//   } catch (error) {
//     console.error("Ошибка вызова myMethod:", error);
//   }
// }

// callContractMethod();