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
    Markup.button.callback("🔑 Show Public Key", "public_key"),
    Markup.button.callback("🔐 Show Private Key", "private_key"),
],[
    Markup.button.callback("💎 Buy Token","buy"),
    Markup.button.callback("💰 Balance", "balance")
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
        ctx.reply(`🎉 **Welcome back to 0x Trading Bot!** 🚀\n\n` +
                   `🔑 **Your Public Key:**\n\`${publicKey}\`\n\n` +
                   `💰 **Wallet Status:**\n${empty ? "⚠️ Your wallet is empty! Please deposit some SOL to start trading 💎" : message}\n\n` +
                   `📊 Ready to trade Solana tokens? Let's make some profits! 🔥`,{
            ...DEFAULT_KEYBOARD,
            parse_mode: 'Markdown'
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
        ctx.reply(`🎊 **WELCOME TO 0X TRADING BOT!** 🎊\n\n` +
                   `✨ Your fresh wallet has been created! ✨\n\n` +
                   `🔑 **Your New Public Key:**\n\`${publicKey}\`\n\n` +
                   `💡 **Next Steps:**\n` +
                   `1️⃣ Fund your wallet with SOL 💰\n` +
                   `2️⃣ Start trading amazing tokens! 🚀\n` +
                   `3️⃣ Make those gains! 📈\n\n` +
                   `🔥 **Ready to become a trading legend?** 🔥`,{
            ...DEFAULT_KEYBOARD,
            parse_mode: 'Markdown'
        })
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
        `🔑 **Your Public Key** 🔑\n\n` +
        `\`${existingUser?.publicKey}\`\n\n` +
        `💰 **Wallet Status:**\n${empty ? "⚠️ Empty wallet! Fund it to start trading 💎" : message}\n\n` +
        `📋 *Tap to copy the address above*`,{
            ...DEFAULT_KEYBOARD,
            parse_mode: 'Markdown'
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
        `🔐 **Your Private Key** 🔐\n\n` +
        `⚠️ **IMPORTANT SECURITY WARNING** ⚠️\n` +
        `🚨 Never share this with anyone! 🚨\n\n` +
        `\`${user?.privateKey}\`\n\n` +
        `🛡️ **Keep this safe and secure!**\n` +
        `💡 *Use this to import your wallet into other apps*`,{
            ...DEFAULT_KEYBOARD,
            parse_mode: 'Markdown'
        }
    )
});

bot.action("buy",async ctx=>{
    PENDING_USER_BUYS[ctx.chat?.id!]={
        isPending:true
    }
    return ctx.reply(
        `💎 **Token Purchase** 💎\n\n` +
        `🎯 What token would you like to buy?\n\n` +
        `📝 **Please provide:**\n` +
        `• Token contract address\n` +
        `• Token symbol (if you know it)\n\n` +
        `🔍 *Example: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v*\n\n` +
        `✨ **Let's make this trade happen!** ✨`,{
        parse_mode: 'Markdown'
    })
});

bot.action("balance", async ctx=>{
    const existingUser = await prismaClient.users.findFirst({
        where:{
            userId:ctx.chat?.id.toString()
        }
    })
    const {empty, message} = await getBalanceMessage(existingUser?.publicKey || "")
    
    return ctx.reply(
        `💰 **Wallet Balance** 💰\n\n` +
        `${empty ? "⚠️ **Empty Wallet**\nYour wallet has no SOL! 💸\n\n🏦 Please deposit some SOL to start trading." : message}\n\n` +
        `🔄 *Balance updates in real-time*`,{
            ...DEFAULT_KEYBOARD,
            parse_mode: 'Markdown'
        }
    )
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
        ctx.reply(
            `💰 **Purchase Amount** 💰\n\n` +
            `🎯 How much SOL would you like to spend?\n\n` +
            `📝 **Enter amount in SOL:**\n` +
            `• Example: 0.1 (for 0.1 SOL)\n` +
            `• Example: 1 (for 1 SOL)\n\n` +
            `💡 *Make sure you have enough SOL in your wallet!*`,{
            parse_mode: 'Markdown'
        })
    } else if(PENDING_USER_BUYS[ctx.chat.id]?.isPending && PENDING_USER_BUYS[ctx.chat.id!]?.mint) {
        // Show processing message
        ctx.reply(
            `⏳ **Processing Your Trade** ⏳\n\n` +
            `🔄 Preparing transaction...\n` +
            `💎 Amount: ${message} SOL\n` +
            `🎯 Token: ${PENDING_USER_BUYS[ctx.chat.id!]?.mint}\n\n` +
            `⚡ Please wait while we execute your trade...`,{
            parse_mode: 'Markdown'
        });

        const swapTXN =  await swap("So11111111111111111111111111111111111111112",PENDING_USER_BUYS[ctx.chat.id!]?.mint!,Number(message)* LAMPORTS_PER_SOL,existingUser?.publicKey!);
        const tx = VersionedTransaction.deserialize(Uint8Array.from(atob(swapTXN), c => c.charCodeAt(0)));
        tx.sign([userKeypair]);

       const sign = await connection.sendTransaction(tx);

        delete PENDING_USER_BUYS[ctx.chat.id];
        ctx.reply(
            `🎉 **TRADE SUCCESSFUL!** 🎉\n\n` +
            `✅ Your swap has been completed!\n\n` +
            `📊 **Transaction Details:**\n` +
            `• Amount: ${message} SOL 💰\n` +
            `• Token: ${PENDING_USER_BUYS[ctx.chat.id!]?.mint || 'Token'} 💎\n\n` +
            `🔍 **Track Your Transaction:**\n` +
            `[View on Solscan](https://solscan.io/tx/${sign})\n\n` +
            `🚀 **Happy Trading!** 🚀`,{
            parse_mode: 'Markdown'
        });

    }
}catch(error){
    console.error(error);
    delete PENDING_USER_BUYS[ctx.chat.id]; // Clear pending state on error
    ctx.reply(
        `❌ **Oops! Something went wrong** ❌\n\n` +
        `🔧 **Error occurred while processing your request**\n\n` +
        `🔄 **What you can do:**\n` +
        `• Check your wallet balance 💰\n` +
        `• Verify the token address 🔍\n` +
        `• Try again in a moment ⏰\n\n` +
        `💬 If the problem persists, contact support\n\n` +
        `💪 **Don't give up - let's try again!** 💪`,{
        parse_mode: 'Markdown'
    });
}

})




bot.launch().then(() => {
    console.log('🚀 0x Trading Bot is now live and ready for action! 💎');
    console.log('⚡ Users can now start trading Solana tokens! ⚡');
});

