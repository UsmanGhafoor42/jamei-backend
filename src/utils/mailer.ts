import nodemailer from "nodemailer";

export const sendResetEmail = async (to: string, token: string) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER!,
      pass: process.env.EMAIL_PASS!,
    },
  });

  const resetUrl = `https://jamie-nine.vercel.app/reset-password?token=${token}`;

  const mailOptions = {
    from: "Hot Market Design DTF <no-reply@dtfstickers.com>",
    to,
    subject: "Password Reset Request",
    html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Click here to reset</a></p>`,
  };

  await transporter.sendMail(mailOptions);
};
