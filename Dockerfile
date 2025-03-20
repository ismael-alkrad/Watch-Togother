# استخدم Ubuntu كأساس
FROM ubuntu:20.04

# تحديث الحزم وتثبيت FFmpeg و Node.js
RUN apt-get update && apt-get install -y ffmpeg curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# إنشاء مجلد داخل الحاوية للتطبيق
WORKDIR /app

# نسخ ملفات المشروع إلى الحاوية
COPY package*.json ./
RUN npm install

COPY . .

# تشغيل البوت عند تشغيل الحاوية
CMD ["node", "index.js"]