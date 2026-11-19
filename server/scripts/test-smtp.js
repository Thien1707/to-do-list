'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const nodemailer = require('nodemailer');

const user = process.env.EMAIL_USER;
let pass = process.env.EMAIL_PASS;

console.log('--------------------------------------------------');
console.log('📧 TaskFlow — Kiểm tra kết nối Gmail SMTP');
console.log('--------------------------------------------------');
console.log(`- EMAIL_USER: ${user || '(chưa cấu hình)'}`);
console.log(`- EMAIL_PASS: ${pass ? '****** (độ dài: ' + pass.length + ' ký tự)' : '(chưa cấu hình)'}`);

if (!user || !pass) {
  console.error('\n❌ LỖI: Chưa cấu hình EMAIL_USER hoặc EMAIL_PASS trong server/.env');
  process.exit(1);
}

const cleanPass = String(pass).replace(/\s+/g, '').replace(/["']/g, '');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: String(user).trim(),
    pass: cleanPass,
  },
});

console.log('\n⏳ Đang xác thực với máy chủ smtp.gmail.com...');
transporter.verify(async (err) => {
  if (err) {
    console.error('\n❌ XÁC THỰC THẤT BẠI:');
    console.error(err.message);
    if (
      err.message.includes('Application-specific password required') ||
      err.message.includes('534-5.7.9') ||
      err.message.includes('535-5.7.8')
    ) {
      console.log('\n💡 NGUYÊN NHÂN & CÁCH SỬA:');
      console.log('Google không cho phép dùng mật khẩu tài khoản Gmail thông thường để gửi mail qua ứng dụng.');
      console.log('Bạn cần tạo "Mật khẩu ứng dụng" (App Password 16 chữ cái):');
      console.log('1. Truy cập: https://myaccount.google.com/apppasswords');
      console.log('2. Đặt tên ứng dụng là "TaskFlow" rồi bấm Tạo');
      console.log('3. Copy 16 ký tự và dán vào EMAIL_PASS trong server/.env');
    }
    process.exit(1);
  }

  console.log('\n✅ XÁC THỰC THÀNH CÔNG! Kết nối Gmail SMTP hoạt động hoàn hảo.');

  const targetEmail = process.argv[2] || user;
  console.log(`⏳ Đang gửi thư thử nghiệm tới: ${targetEmail}...`);

  try {
    const info = await transporter.sendMail({
      from: `"TaskFlow Notification" <${user}>`,
      to: targetEmail,
      subject: '[TaskFlow] Kiểm tra gửi Email SMTP thành công 🎉',
      text: `Xin chào!\n\nEmail này xác nhận hệ thống gửi mail tự động của TaskFlow đã được cấu hình thành công.\nThời gian: ${new Date().toLocaleString('vi-VN')}`,
    });
    console.log(`\n🎉 ĐÃ GỬI THÀNH CÔNG! MessageId: ${info.messageId}`);
    console.log(`👉 Hãy kiểm tra hộp thư đến (hoặc hòm thư Spam) của: ${targetEmail}`);
  } catch (sendErr) {
    console.error('\n❌ Lỗi khi gửi thư:', sendErr.message);
  }
});
