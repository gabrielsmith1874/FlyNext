const nodemailer = require('nodemailer');
require('dotenv').config({ path: './.env.local' });

// Log environment variables (without sensitive data)
console.log('Email Configuration:');
console.log('- HOST:', process.env.EMAIL_HOST);
console.log('- PORT:', process.env.EMAIL_PORT);
console.log('- SECURE:', process.env.EMAIL_SECURE);
console.log('- USER:', process.env.EMAIL_USER);
console.log('- PASSWORD:', process.env.EMAIL_PASSWORD ? '******' : 'Not set');

async function testEmail() {
  try {
    // Create transporter with debug enabled
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      debug: true, // Enable debug logs
      logger: true  // Log to console
    });
    
    console.log('Verifying connection...');
    const verify = await transporter.verify();
    console.log('Connection verified:', verify);
    
    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: `"FlyNext Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to self for testing
      subject: "Test Email from FlyNext",
      text: "This is a test email to verify the email configuration works properly.",
      html: "<p>This is a test email to verify the email configuration works properly.</p>"
    });
    
    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    
  } catch (error) {
    console.error('Error sending test email:');
    console.error(error);
  }
}

testEmail();
