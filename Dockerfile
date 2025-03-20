# استخدام صورة Ubuntu مع Node.js مثبت مسبقًا
FROM ubuntu:20.04

# تثبيت تحديثات النظام و FFmpeg و Node.js
RUN apt-get update && apt-get install -y ffmpeg curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean

# تحديد مجلد العمل داخل الحاوية
WORKDIR /app

# نسخ ملفات package.json و package-lock.json فقط أولًا لتسريع الـ build
COPY package*.json ./

# تثبيت جميع البكجات
RUN npm install

# الآن نسخ جميع ملفات المشروع إلى الحاوية
COPY . .

# تشغيل البوت عند بدء الحاوية
CMD ["node", "index.js"]