const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendVerificationEmail(userEmail, verificationToken) {
  const verificationUrl = `http://localhost:5173/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: `"Trade Circle" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: "Verificação de Email",
    html: `<p>Clique <a href="${verificationUrl}">aqui</a> para verificar seu email.</p>`,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Email de verificação enviado para ${userEmail}`);
}

async function sendPasswordResetEmail(userEmail, userName, resetToken) {
  const resetUrl = `http://localhost:5173/password/reset?token=${resetToken}`;

  const mailOptions = {
    from: `"App Name" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: "Redefinição de Senha",
    html: `<p>Olá, ${userName}! Clique <a href="${resetUrl}">aqui</a> para redefinir sua senha.</p>`,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Email de redefinição de senha enviado para ${userEmail}`);
}

async function sendAcceptedProposalEmail(userEmail, proposalDetails) {
  console.log('Sending accepted proposal email:', proposalDetails);
  const mailOptions = {
    from: `"App Name" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: "Proposta Aceita",
    html: `<div>
    <p>Boas Notícias! Sua proposta para o item ${proposalDetails.itemName} foi aceita.
    Entre em contato com ${proposalDetails.itemOwnerName} para combinar a troca</p>
    
        <p>Detalhes da Proposta: </p>
        <ul>
          <li>Item: ${proposalDetails.itemName}</li>
          <li>Proprietário do Item: ${proposalDetails.itemOwnerName}</li>
          <li>Email do Proprietário: ${proposalDetails.itemOwnerEmail}</li>
        </ul>
    </div>`,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Email de proposta aceita enviado para ${userEmail}`);
}

async function sendDeclinedProposalEmail(userEmail, proposalDetails) {
  const mailOptions = {
    from: `"App Name" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: "Proposta Recusada",
    html: `<p>Infelizmente, sua proposta para o item ${proposalDetails.itemName} foi recusada.</p>`,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Email de proposta recusada enviado para ${userEmail}`);
}

async function sendProposalReceivedEmail(userEmail, proposalDetails) {
  const mailOptions = {
    from: `"Trade Circle" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: "Nova Proposta Recebida",
    html: `<p>Você recebeu uma nova proposta para o item ${proposalDetails.itemName}.</p>`,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Email de proposta recebida enviado para ${userEmail}`);
}

module.exports = {
  emailService: {
    sendVerificationEmail,
    sendProposalReceivedEmail,
    sendPasswordResetEmail,
    sendAcceptedProposalEmail,
    sendDeclinedProposalEmail,
  },
};
