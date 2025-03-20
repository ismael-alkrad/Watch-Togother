# ✅ استخدم صورة Node.js الرسمية التي تحتوي على npm مثبت مسبقًا
FROM node:18

# إعداد المنطقة الزمنية لتجنب التوقف أثناء التثبيت
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    tzdata \
    && ln -fs /usr/share/zoneinfo/Etc/UTC /etc/localtime \
    && dpkg-reconfigure -f noninteractive tzdata

# ✅ تثبيت المكتبات المطلوبة لـ Puppeteer و FFmpeg
RUN apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxrender1 \
    libxshmfence1 \
    xdg-utils \
    ffmpeg \
    curl \
    python3 \
    python3-pip

# تعيين مسار Python الافتراضي
RUN ln -s /usr/bin/python3 /usr/bin/python

# إنشاء مجلد التطبيق داخل الحاوية
WORKDIR /app

# نسخ ملفات المشروع
COPY package*.json ./

# تجاوز فحص Python عند تثبيت youtube-dl-exec
ENV YOUTUBE_DL_SKIP_PYTHON_CHECK=1

# ✅ تثبيت الحزم باستخدام npm (سيعمل الآن لأنه تم تثبيت Node.js بشكل صحيح)
RUN npm install

# نسخ بقية الملفات
COPY . .

# ✅ Puppeteer سيستخدم Chromium المثبت مسبقًا
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# تشغيل البوت
CMD ["node", "index.js"]