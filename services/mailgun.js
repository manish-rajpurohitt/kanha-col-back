const Mailgun = require('mailgun-js');

const template = require('../config/template');
const keys = require('../config/keys');
const nodemailer = require("nodemailer");

const { key, domain, sender } = keys.mailgun;

let transporter = nodemailer.createTransport({
  host: "smtp.gmail.email",
  port: 587,
  service: "gmail",
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_HOST, // generated ethereal user
    pass: process.env.EMAIL_KEY, // generated ethereal password
  },
});

class MailgunService {
  init() {
    try {
      return new Mailgun({
        apiKey: key,
        domain: domain
      });
    } catch (error) {
      console.warn('Missing mailgun keys');
    }
  }
}

const mailgun = new MailgunService().init();

exports.sendEmail = async (email, type, host, data) => {
  try {
    const message = prepareTemplate(type, host, data);

    const config = {
      from: `Kanha Collections! <${sender}>`,
      to: email,
      subject: message.subject,
      text: message.text
    };

    let info = await transporter.sendMail(config);

    //   return await mailgun.messages().send(config);
    return info.accepted;
  } catch (error) {
    return error;
  }
};

const prepareTemplate = (type, host, data) => {
  let message;

  switch (type) {
    case 'reset':
      message = template.resetEmail(host, data);
      break;

    case 'reset-confirmation':
      message = template.confirmResetPasswordEmail();
      break;

    case 'signup':
      message = template.signupEmail(data);
      break;

    case 'merchant-signup':
      message = template.merchantSignup(host, data);
      break;

    case 'merchant-welcome':
      message = template.merchantWelcome(data);
      break;

    case 'newsletter-subscription':
      message = template.newsletterSubscriptionEmail();
      break;

    case 'contact':
      message = template.contactEmail();
      break;

    case 'merchant-application':
      message = template.merchantApplicationEmail();
      break;

    case 'order-confirmation':
      message = template.orderConfirmationEmail(data);
      break;

    default:
      message = '';
  }

  return message;
};
