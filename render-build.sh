#!/bin/bash

# تثبيت Google Chrome
echo "Installing Google Chrome..."
curl -O https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
apt install -y ./google-chrome-stable_current_amd64.deb

# تثبيت Puppeteer Chromium
echo "Installing Puppeteer Chromium..."
npx puppeteer browsers install chrome