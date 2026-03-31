import nodemailer from "nodemailer";
import { Telegraf } from "telegraf";
import logger from "./logger.js";

export interface NotificationPayload {
  title: string;
  message: string;
  details?: Record<string, unknown>;
}

class EmailNotifier {
  private transporter: nodemailer.Transporter | null = null;
  private enabled: boolean;
  private recipientEmail: string;

  constructor() {
    this.enabled = process.env.ENABLE_EMAIL_NOTIFICATIONS === "true";
    this.recipientEmail = process.env.NOTIFY_EMAIL_TO || "";

    if (this.enabled) {
      this.initializeTransporter();
    }
  }

  private initializeTransporter(): void {
    try {
      const smtpConfig = {
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      };

      this.transporter = nodemailer.createTransport(smtpConfig);
      logger.info("Email transporter initialized");
    } catch (error) {
      logger.error("Failed to initialize email transporter:", error);
      this.enabled = false;
    }
  }

  async send(payload: NotificationPayload): Promise<boolean> {
    if (!this.enabled || !this.transporter) {
      logger.warn("Email notifications disabled");
      return false;
    }

    try {
      const htmlBody = `
        <h2>${payload.title}</h2>
        <p>${payload.message}</p>
        ${
          payload.details
            ? `<pre>${JSON.stringify(payload.details, null, 2)}</pre>`
            : ""
        }
        <hr>
        <p><small>Sent at ${new Date().toISOString()}</small></p>
      `;

      const info = await this.transporter.sendMail({
        from: process.env.SMTP_USER,
        to: this.recipientEmail,
        subject: `[Notify Mom] ${payload.title}`,
        html: htmlBody,
        text: `${payload.title}\n\n${payload.message}`,
      });

      logger.info(`Email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      logger.error("Failed to send email:", error);
      return false;
    }
  }
}

class TelegramNotifier {
  private bot: Telegraf | null = null;
  private enabled: boolean;
  private chatId: string;

  constructor() {
    this.enabled = process.env.ENABLE_TELEGRAM_NOTIFICATIONS === "true";
    this.chatId = process.env.TELEGRAM_CHAT_ID || "";

    if (this.enabled && process.env.TELEGRAM_BOT_TOKEN) {
      this.initializeBot();
    }
  }

  private initializeBot(): void {
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) {
        throw new Error("TELEGRAM_BOT_TOKEN not set");
      }

      this.bot = new Telegraf(token);
      logger.info("Telegram bot initialized");
    } catch (error) {
      logger.error("Failed to initialize Telegram bot:", error);
      this.enabled = false;
    }
  }

  async send(payload: NotificationPayload): Promise<boolean> {
    if (!this.enabled || !this.bot) {
      logger.warn("Telegram notifications disabled");
      return false;
    }

    try {
      const message = `
*${payload.title}*

${payload.message}

${
  payload.details
    ? `\`\`\`\n${JSON.stringify(payload.details, null, 2)}\n\`\`\``
    : ""
}

_Sent at ${new Date().toISOString()}_
      `;

      await this.bot.telegram.sendMessage(this.chatId, message, {
        parse_mode: "Markdown",
      });

      logger.info("Telegram message sent");
      return true;
    } catch (error) {
      logger.error("Failed to send Telegram message:", error);
      return false;
    }
  }
}

class NotificationManager {
  private emailNotifier: EmailNotifier;
  private telegramNotifier: TelegramNotifier;

  constructor() {
    this.emailNotifier = new EmailNotifier();
    this.telegramNotifier = new TelegramNotifier();
  }

  async notifyNew(
    entryId: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    const payload: NotificationPayload = {
      title: "✅ New Schedule Entry",
      message: `A new entry has been added: ${entryId}`,
      details,
    };

    await Promise.all([
      this.emailNotifier.send(payload),
      this.telegramNotifier.send(payload),
    ]);
  }

  async notifyAnnulled(
    entryId: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    const payload: NotificationPayload = {
      title: "❌ Schedule Entry Removed",
      message: `An entry has been removed: ${entryId}`,
      details,
    };

    await Promise.all([
      this.emailNotifier.send(payload),
      this.telegramNotifier.send(payload),
    ]);
  }

  async notifyError(
    error: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    const payload: NotificationPayload = {
      title: "⚠️ Sync Error",
      message: error,
      details,
    };

    await Promise.all([
      this.emailNotifier.send(payload),
      this.telegramNotifier.send(payload),
    ]);
  }

  async notifySyncCompleted(
    addedCount: number,
    removedCount: number,
  ): Promise<void> {
    const payload: NotificationPayload = {
      title: "🔄 Sync Completed",
      message: `Sync operation completed`,
      details: {
        added: addedCount,
        removed: removedCount,
        timestamp: new Date().toISOString(),
      },
    };

    await Promise.all([
      this.emailNotifier.send(payload),
      this.telegramNotifier.send(payload),
    ]);
  }
}

export default new NotificationManager();
