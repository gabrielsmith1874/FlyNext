import nodemailer from 'nodemailer';

/**
 * Configure email transporter
 * Using environment variables for security
 */
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Send an email with PDF invoice attachment
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text email body
 * @param {string} options.html - HTML email body
 * @param {Buffer} options.pdfBuffer - PDF invoice as buffer
 * @param {string} options.filename - PDF filename
 * @returns {Promise<Object>} - Nodemailer send response
 */
export async function sendInvoiceEmail({ to, subject, text, html, pdfBuffer, filename }) {
  try {
    const mailOptions = {
      from: `"FlyNext Travel" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
      attachments: [
        {
          filename: filename || 'invoice.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
}
