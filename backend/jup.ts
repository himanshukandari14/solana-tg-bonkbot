import axios from "axios";
import { VersionedTransaction } from "@solana/web3.js";

const JUP_URL = "https://lite-api.jup.ag"
const SLIPPAGE = 5;

export async function swap(inputMint: string, outputMint: string, qty: number, publicKey: string) {
    try {
        let quoteConfig = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${JUP_URL}/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${qty}&slippageBps=${SLIPPAGE}`,
            headers: { 
              'Accept': 'application/json'
            }
        };
        
        const quoteResponse = await axios.request(quoteConfig);
        console.log(JSON.stringify(quoteResponse.data));

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `${JUP_URL}/swap/v1/swap`,
            headers: { 
              'Content-Type': 'application/json', 
              'Accept': 'application/json'
            },
            data: {quoteResponse: quoteResponse.data, payer: publicKey, userPublicKey: publicKey}
        };
        
        const swapResponse = await axios.request(config);
        console.log(JSON.stringify(swapResponse.data));
        
        return swapResponse.data.swapTransaction;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

export async function swapWithSigner(inputMint: string, outputMint: string, qty: number, publicKey: string, signer: any) {
    try {
        const swapTransaction = await swap(inputMint, outputMint, qty, publicKey);
        const transaction = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'));
        
        // Sign the transaction with the user's keypair
        transaction.sign([signer]);
        
        return transaction;
    } catch (error) {
        console.log(error);
        throw error;
    }
}
