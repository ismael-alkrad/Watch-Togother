require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, VoiceConnectionStatus } = require("@discordjs/voice");
const puppeteer = require("puppeteer");
const { spawn } = require("child_process");
const express = require("express");

const app = express();
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let browser, page, gstreamerProcess;
const STREAM_URL = process.env.TELFAZ_NET_URL;

client.once("ready", () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);
});

// Command Handler
client.on("messageCreate", async (message) => {
    if (message.content.startsWith("!watch")) {
        const args = message.content.split(" ");
        if (args.length < 2) {
            return message.channel.send("❌ Please provide a video URL from Telfaz Net.");
        }

        const videoUrl = args[1];

        message.channel.send(`🎬 Starting WebRTC stream for: ${videoUrl}`);

        try {
            await startStreaming(message.guild.id, videoUrl);
        } catch (error) {
            console.error("❌ Error starting stream:", error);
            message.channel.send("❌ Failed to start the stream.");
        }
    }

    if (message.content === "!stop") {
        stopStreaming();
        message.channel.send("⏹️ Streaming stopped.");
    }
});

// Start WebRTC Streaming
async function startStreaming(guildId, videoUrl) {
    if (browser) {
        console.log("❌ A stream is already running.");
        return;
    }

    browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });     
    
    page = await browser.newPage();
    await page.goto(videoUrl, { waitUntil: "networkidle2" });

    console.log(`🎥 Opened video page: ${videoUrl}`);

    const videoSrc = await page.evaluate(() => {
        const videoElement = document.querySelector("video");
        return videoElement ? videoElement.src : null;
    });

    if (!videoSrc) {
        console.error("❌ No video found on the page.");
        await browser.close();
        browser = null;
        return;
    }

    console.log(`🎞️ Video source URL: ${videoSrc}`);

    await playVideoInDiscord(guildId, videoSrc);
}

// Play Video in Discord using WebRTC
async function playVideoInDiscord(guildId, videoUrl) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
        console.error("❌ Guild not found.");
        return;
    }

    const channel = guild.channels.cache.get(process.env.DISCORD_VOICE_CHANNEL_ID);
    if (!channel || channel.type !== 2) {
        console.error("❌ Voice channel not found.");
        return;
    }

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
    });

    connection.on(VoiceConnectionStatus.Ready, () => {
        console.log("🎥 Connected to voice channel, starting WebRTC stream...");
        startGStreamer(videoUrl, connection);
    });
}

// GStreamer Pipeline to Convert Video to WebRTC
function startGStreamer(videoUrl, connection) {
    console.log("🚀 Starting GStreamer...");

    gstreamerProcess = spawn("gst-launch-1.0", [
        "playbin", `uri=${videoUrl}`,
        "!", "audioconvert",
        "!", "audioresample",
        "!", "opusenc",
        "!", "rtpopuspay",
        "!", "queue",
        "!", "appsink"
    ]);

    gstreamerProcess.stdout.on("data", (data) => {
        console.log(`🔊 GStreamer Output: ${data}`);
    });

    gstreamerProcess.stderr.on("data", (data) => {
        console.error(`❌ GStreamer Error: ${data}`);
    });

    gstreamerProcess.on("close", (code) => {
        console.log(`⏹️ GStreamer exited with code ${code}`);
        stopStreaming();
    });

    const player = createAudioPlayer();
    const resource = createAudioResource(gstreamerProcess.stdout);

    player.play(resource);
    connection.subscribe(player);
}

// Stop Streaming
function stopStreaming() {
    if (browser) {
        browser.close();
        browser = null;
    }

    if (gstreamerProcess) {
        gstreamerProcess.kill("SIGINT");
        gstreamerProcess = null;
    }

    console.log("⏹️ Stream stopped.");
}

// Start Express Server (For Health Check)
app.get("/", (req, res) => {
    res.send("WebRTC Streaming Bot is Running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌍 Express server running on http://localhost:${PORT}`);
});

client.login(process.env.DISCORD_BOT_TOKEN);