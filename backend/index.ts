import { Telegraf, Markup } from 'telegraf'
import { PrismaClient } from "./generated/prisma";
import { Keypair, Connection, LAMPORTS_PER_SOL, Transaction, VersionedTransaction, VersionedMessage } from '@solana/web3.js';
import { getBalanceMessage } from './solana';
import { swap } from './jup';
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
const prismaClient =  new PrismaClient();
const PENDING_USER_BUYS: Record<string,{
    isPending: boolean,
    mint?: string,

}> = {}

const connection = new Connection(process.env.RPC_URL!);


const DEFAULT_KEYBOARD = Markup.inlineKeyboard([[
    Markup.button.callback("Show public key", "public_key"),
    Markup.button.callback("Show private key", "private_key"),
],[
    Markup.button.callback("Buy","buy")
]]);
bot.start(async (ctx) => {

    const existingUser = await prismaClient.users.findFirst({
        where:{
            userId: ctx.chat.id.toString()
        }
    })

    if (existingUser) {
        const publicKey = existingUser.publicKey;
        const {empty, message} = await getBalanceMessage(existingUser.publicKey.toString())
        ctx.reply(`Welcome to zero x bot. Here is your public Key ${publicKey}. ${empty ? "Your wallet is empty, Please put some SOL in it": message}`,{
            ...DEFAULT_KEYBOARD
        })
    }else {
        const keyPair = Keypair.generate();
        await prismaClient.users.create({
            data:{
                userId: ctx.chat.id.toString(),
                publicKey: keyPair.publicKey.toBase58(),
                privateKey: keyPair.secretKey.toBase64()
            }
        })
        const publicKey = keyPair.publicKey;
        ctx.reply(`WELCOME to 0x trading solana bot here is your freshly created Public Key ${publicKey}. You can trade solana now. BE A MAN AND PUT SOME SOL IN ME IF U HAVE BALLS FOR ME BABY`,{...DEFAULT_KEYBOARD})
    }

})

bot.action("public_key", async ctx=>{
    const existingUser = await prismaClient.users.findFirst({
        where:{
            userId:ctx.chat?.id.toString()
        }
    })
    const {empty, message} = await getBalanceMessage(existingUser?.publicKey || "")
    
    return ctx.reply(
        `Here is your Public key ${existingUser?.publicKey}${empty ? " 👌🏻fund your wallet to trade":message}`,{
            ...DEFAULT_KEYBOARD
        }
    )
});

bot.action("private_key", async ctx=>{
    const user = await prismaClient.users.findFirst({
        where:{
            userId:ctx.chat?.id.toString()
        }
    })
    return ctx.reply(
        `Here is your Private key ${user?.privateKey}`,{
            ...DEFAULT_KEYBOARD
        }
    )
});

bot.action("buy",async ctx=>{
    PENDING_USER_BUYS[ctx.chat?.id!]={
        isPending:true
    }
    return ctx.reply("What Token you want to buy?")
});

bot.on('text', async(ctx) => {
try{
    const message = ctx.message.text;
    const existingUser = await prismaClient.users.findFirst({
        where:{
            userId: ctx.chat.id.toString()
        }
    })
    const userKeypair = Keypair.fromSecretKey(Uint8Array.from(atob(existingUser?.privateKey!), c=>c.charCodeAt(0)))

    if(PENDING_USER_BUYS[ctx.chat.id]?.isPending && !PENDING_USER_BUYS[ctx.chat.id!]?.mint){
        PENDING_USER_BUYS[ctx.chat.id!]!.mint = message;
        ctx.reply("What quanity do you want to buy?")
    } else if(PENDING_USER_BUYS[ctx.chat.id]?.isPending && PENDING_USER_BUYS[ctx.chat.id!]?.mint) {
        const swapTXN =  await swap("So11111111111111111111111111111111111111112",PENDING_USER_BUYS[ctx.chat.id!]?.mint!,Number(message)* LAMPORTS_PER_SOL,existingUser?.publicKey!);
        const tx = VersionedTransaction.deserialize(Uint8Array.from(atob(swapTXN), c => c.charCodeAt(0)));
        tx.sign([userKeypair]);


       const sign = await connection.sendTransaction(tx);



        delete PENDING_USER_BUYS[ctx.chat.id];
        ctx.reply(`Swap succesful, you can track it here https://solscan.io/tx/${sign}`);

    }
}catch(error){
    console.error(error);
    ctx.reply("Something went wrong, please try again later");
}

})




bot.launch()

