require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, VoiceConnectionStatus } = require("@discordjs/voice");
const puppeteer = require("puppeteer");
const { spawn } = require("child_process");
const ytdl = require("@distube/ytdl-core"); // ✅ Updated YouTube module
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

client.once("ready", () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);
});

// ✅ **Command Handler**
client.on("messageCreate", async (message) => {
    if (message.content.startsWith("!watch")) {
        const args = message.content.split(" ");
        if (args.length < 2) {
            return message.channel.send("❌ Please provide a video URL.");
        }

        const videoUrl = args[1];

        if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
            message.channel.send(`🎬 Playing YouTube video: ${videoUrl}`);
            await playYouTubeAudio(message.guild.id, videoUrl);
            return;
        }

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

// ✅ **YouTube Audio Streaming**
async function playYouTubeAudio(guildId, videoUrl) {
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

    connection.on(VoiceConnectionStatus.Ready, async () => {
        console.log("🎥 Connected to voice channel, starting YouTube stream...");

        try {
            const stream = await ytdl(videoUrl, {
                filter: "audioonly",
                quality: "highestaudio",
                highWaterMark: 1 << 25,
            });

            const player = createAudioPlayer();
            const resource = createAudioResource(stream);

            player.play(resource);
            connection.subscribe(player);
        } catch (error) {
            console.error("❌ Error streaming YouTube video:", error);
        }
    });
}

// ✅ **Start WebRTC Streaming for Other Websites**
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

    let interceptedVideoUrl = null;
    await page.setRequestInterception(true);
    page.on("request", (request) => {
        const url = request.url();
        if (url.includes(".m3u8")) {
            console.log(`🎯 Intercepted HLS stream: ${url}`);
            interceptedVideoUrl = url;
        }
        request.continue();
    });

    await page.goto(videoUrl, { waitUntil: "networkidle2" });
    console.log(`🎥 Opened video page: ${videoUrl}`);

    const videoSrc = await page.evaluate(async () => {
        return new Promise((resolve) => {
            const videoElement = document.querySelector("video");

            if (!videoElement) {
                resolve(null);
                return;
            }

            const sourceTag = videoElement.querySelector("source[type='application/x-mpegurl']");
            if (sourceTag) {
                resolve(sourceTag.src);
                return;
            }

            if (videoElement.src.startsWith("blob:")) {
                const observer = new MutationObserver(() => {
                    if (videoElement.src && !videoElement.src.startsWith("blob:")) {
                        observer.disconnect();
                        resolve(videoElement.src);
                    }
                });
                observer.observe(videoElement, { attributes: true, attributeFilter: ["src"] });

                setTimeout(() => {
                    observer.disconnect();
                    resolve(null);
                }, 5000);
            } else {
                resolve(videoElement.src);
            }
        });
    });

    if (!videoSrc && interceptedVideoUrl) {
        console.log(`✅ Using intercepted video URL: ${interceptedVideoUrl}`);
    } else if (!videoSrc) {
        console.error("❌ No video found on the page.");
        await browser.close();
        browser = null;
        return;
    }

    console.log(`🎞️ Video source URL: ${videoSrc || interceptedVideoUrl}`);
    await playVideoInDiscord(guildId, videoSrc || interceptedVideoUrl);
}

// ✅ **Play WebRTC Stream in Discord**
async function playVideoInDiscord(guildId, videoStream) {
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
        startGStreamer(videoStream, connection);
    });
}

// ✅ **Stop Streaming**
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

// ✅ **Express Server (Health Check)**
app.get("/", (req, res) => {
    res.send("WebRTC Streaming Bot is Running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌍 Express server running on http://localhost:${PORT}`);
});

client.login(process.env.DISCORD_BOT_TOKEN);