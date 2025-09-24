import { Telegraf } from 'telegraf'
import { PrismaClient } from "./generated/prisma";
import { Keypair } from '@solana/web3.js';
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
const prismaClient =  new PrismaClient();
bot.start(async (ctx) => {

    const existingUser = await prismaClient.users.findFirst({
        where:{
            userId: ctx.chat.id.toString()
        }
    })

    if (existingUser) {
        const publicKey = existingUser.publicKey;
        ctx.reply(`Welcome to zero x bot. Here is your public Key ${publicKey}`)
    }else {
        const keyPair = Keypair.generate();
        await prismaClient.users.create({
            data:{
                userId: ctx.chat.id.toString(),
                publicKey: keyPair.publicKey.toBase58(),
                privateKey: JSON.stringify(keyPair.secretKey)
            }
        })
        const publicKey = keyPair.publicKey;
        ctx.reply(`WELCOME to 0x trading solana bot here is your freshly created Public Key ${publicKey}. You can trade solana now. BE A MAN AND PUT SOME SOL IN ME IF U HAVE BALLS FOR ME BABY`)
    }

})
bot.launch()

