# ใช้ Node.js image สำหรับการ build
FROM node:16 AS build

# ตั้งค่า working directory
WORKDIR /app

# คัดลอกไฟล์ package.json และ package-lock.json ไปที่ container
COPY frontend/package*.json ./

# ติดตั้ง dependencies
RUN npm install

# คัดลอกโค้ดของ frontend ไปยัง container
COPY frontend/ .

# สร้างโปรเจค React (build)
RUN npm run build

# สร้าง production image โดยใช้ Nginx
FROM nginx:alpine

# คัดลอกไฟล์จาก build ไปที่ Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# เปิดพอร์ต 80 สำหรับเว็บแอป
EXPOSE 80
