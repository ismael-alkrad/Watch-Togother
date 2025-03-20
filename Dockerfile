# استخدام Ubuntu كصورة أساسية
FROM ubuntu:20.04

# تثبيت التحديثات وPython وFFmpeg و Node.js
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# تعيين مسار Python الافتراضي
RUN ln -s /usr/bin/python3 /usr/bin/python

# إنشاء مجلد التطبيق داخل الحاوية
WORKDIR /app

# نسخ ملفات المشروع
COPY package*.json ./

# تجاوز فحص Python عند تثبيت youtube-dl-exec
ENV YOUTUBE_DL_SKIP_PYTHON_CHECK=1

# تثبيت الحزم
RUN npm install

# نسخ بقية الملفات
COPY . .

# تشغيل البوت
CMD ["node", "bot.js"]