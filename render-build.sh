#!/bin/bash

# تثبيت Google Chrome
echo "Installing Google Chrome..."
curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-chrome-keyring.gpg
echo 'deb [signed-by=/usr/share/keyrings/google-chrome-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main' | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt update
sudo apt install -y google-chrome-stable

# تثبيت Chromium من Puppeteer
echo "Installing Puppeteer Chromium..."
npx puppeteer browsers install chrome