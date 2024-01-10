
import { ethers } from "ethers";

// import Contrats from "./contracts/4002.json";
import Contrats from "./contracts/1.json";
import { fromBigNum } from "../utils";
const supportChainId = 1;
const TOTALPRESALETOKENAMOUNT = 650000000000;

const RPCS = {
    1: "https://mainnet.infura.io/v3/49a547b1f17a417f8b7fe8dc8d33308e",
    56: "https://bsc-dataseed.binance.org/",
}

const providers = {
    1: new ethers.providers.JsonRpcProvider(RPCS[1]),
    56: new ethers.providers.JsonRpcProvider(RPCS[56])
}

const presaleContract = new ethers.Contract(Contrats.presale.address, Contrats.presale.abi, providers[supportChainId]);
const usdtContract = new ethers.Contract(Contrats.usdt, Contrats.abi, providers[supportChainId]);
const getProgress = async () => {
    const balance = await presaleContract.totalSaled();
    const tokenEthBalance = fromBigNum(balance, 18);
    console.log("current balance", tokenEthBalance);
    return [(tokenEthBalance / TOTALPRESALETOKENAMOUNT) * 100, tokenEthBalance];
}

export {
    providers, presaleContract, usdtContract, getProgress
}