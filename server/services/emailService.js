'use strict';
const nodemailer = require('nodemailer');

/**
 * Khởi tạo transporter cho Gmail SMTP
 */
const getTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass || user.includes('YOUR_') || pass.includes('YOUR_')) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass, // Mật khẩu ứng dụng (App Password 16 ký tự của Google)
    },
  });
};

/**
 * Gửi email cảnh báo nhiệm vụ sắp hết hạn (trong vòng 2 ngày)
 * @param {string} toEmail - Địa chỉ email người nhận
 * @param {string} userName - Tên người dùng
 * @param {Array} tasks - Danh sách nhiệm vụ sắp hết hạn
 */
const sendDueTasksReminder = async (toEmail, userName, tasks) => {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('⚠️ [EmailService] Chưa cấu hình EMAIL_USER hoặc EMAIL_PASS trong .env. Bỏ qua gửi email.');
    return {
      success: false,
      message: 'Chưa cấu hình tài khoản gửi mail trong backend (.env EMAIL_USER, EMAIL_PASS)',
      notConfigured: true,
    };
  }

  if (!tasks || tasks.length === 0) {
    return { success: true, message: 'Không có nhiệm vụ nào sắp hết hạn' };
  }

  const frontendUrl = process.env.USER_FRONTEND_URL || 'http://localhost:5173';

  const priorityLabels = {
    urgent: { text: 'Khẩn cấp', color: '#ef4444' },
    high: { text: 'Cao', color: '#f97316' },
    medium: { text: 'Trung bình', color: '#eab308' },
    low: { text: 'Thấp', color: '#3b82f6' },
  };

  const tasksHtml = tasks
    .map((task) => {
      const pInfo = priorityLabels[task.priority] || { text: task.priority, color: '#6b7280' };
      const dueDateStr = task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : 'Không có';
      
      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 12px; font-weight: 600; color: #0078d4;">#${task.id}</td>
          <td style="padding: 10px 12px; color: #1f2937;">
            <div style="font-weight: 600;">${task.title}</div>
            ${task.description ? `<div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${task.description.substring(0, 80)}${task.description.length > 80 ? '...' : ''}</div>` : ''}
          </td>
          <td style="padding: 10px 12px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: ${pInfo.color}15; color: ${pInfo.color};">
              ${pInfo.text}
            </span>
          </td>
          <td style="padding: 10px 12px; font-weight: 600; color: #dc2626; white-space: nowrap;">
            📅 ${dueDateStr}
          </td>
        </tr>
      `;
    })
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Cảnh báo nhiệm vụ sắp hết hạn</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 24px 0;">
        <tr>
          <td align="center">
            <table width="640" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;">
              
              <!-- Azure DevOps Style Header -->
              <tr style="background: linear-gradient(135deg, #0078d4 0%, #005a9e 100%);">
                <td style="padding: 24px 32px; color: #ffffff;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 24px;">🔷</span>
                    <span style="font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">TaskFlow Boards &bull; Azure DevOps</span>
                  </div>
                  <h1 style="margin: 12px 0 4px 0; font-size: 20px; font-weight: 700; color: #ffffff;">
                    ⚠️ Cảnh báo: Bạn có ${tasks.length} nhiệm vụ sắp đến hạn (trong 2 ngày tới)
                  </h1>
                  <p style="margin: 0; font-size: 13px; color: #e0f2fe;">
                    Hệ thống tự động nhắc nhở tiến độ theo chu kỳ Sprint
                  </p>
                </td>
              </tr>

              <!-- Greeting & Info -->
              <tr>
                <td style="padding: 24px 32px; color: #374151;">
                  <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.5;">
                    Xin chào <strong>${userName || 'bạn'}</strong>,
                  </p>
                  <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #4b5563;">
                    Dưới đây là danh sách các công việc còn lại trong Sprint có thời hạn kết thúc trong vòng <strong>48 giờ tới</strong>. Hãy tập trung xử lý để giữ vững tiến độ (Burndown on-track):
                  </p>

                  <!-- Tasks Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 24px; font-size: 13px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                    <thead>
                      <tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb; text-align: left; color: #4b5563; font-weight: 600;">
                        <th style="padding: 10px 12px; width: 60px;">ID</th>
                        <th style="padding: 10px 12px;">Nhiệm vụ</th>
                        <th style="padding: 10px 12px; width: 110px;">Độ ưu tiên</th>
                        <th style="padding: 10px 12px; width: 120px;">Hạn chót</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${tasksHtml}
                    </tbody>
                  </table>

                  <!-- Call to Action -->
                  <div style="text-align: center; margin: 28px 0 12px 0;">
                    <a href="${frontendUrl}/dashboard" style="display: inline-block; background-color: #0078d4; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600; box-shadow: 0 2px 4px rgba(0, 120, 212, 0.3);">
                      🚀 Mở Bảng Sprint &amp; Hoàn thành ngay
                    </a>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr style="background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                <td style="padding: 16px 32px; text-align: center; font-size: 12px; color: #9ca3af;">
                  <p style="margin: 0 0 4px 0;">Email này được gửi tự động bởi hệ thống Quản trị công việc TaskFlow.</p>
                  <p style="margin: 0;">Nếu đã hoàn thành nhiệm vụ, vui lòng tick chọn hoàn thành trên giao diện web để cập nhật Burndown Chart.</p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"TaskFlow Notification" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `[TaskFlow] ⚠️ Bạn có ${tasks.length} nhiệm vụ sắp hết hạn trong 2 ngày tới`,
      html: htmlContent,
    });
    console.log(`✅ [EmailService] Đã gửi email nhắc nhở đến: ${toEmail} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ [EmailService] Lỗi khi gửi email đến ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
};

module.exports = {
  getTransporter,
  sendDueTasksReminder,
};
