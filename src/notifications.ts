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
  private newEntryMotivations: string[] = [
    "Ammuccamu! 🎉",
    "Avanti... ✨",
    "Marraccumannu non mangiari pani scuddatu 🥖",
    "Fozza Mamma! 💫",
    "Non tu scuddari! 💖",
    "Bellissimo! 🎉",
    "Chista n'mezzu a l'autri! 🌟",
    "Iu mu sinteva, proprio ca n'da ucca lamma! 😍",
    "Meeeeee! 🥳",
    "Festeggiamo con un bel piatto di pasta fresca! 🍝",
    "Festeggimo con un kebab! 🌯",
    "Festeggiamo con un bel macaron! 🍪",
    "Atelier des mamies, j'arrive! 🚀",
    "pe pe pepepe pe pe pepepe! Brigitte bardo' bardo' 🥳",
    "Comu finiu ca securité sociale? 🥳",
    "U signuri ci runa u pasta a cu pava l'atelier ! 🍞",
    "A fari Macaron o Maccarruni ? 🍪🍝",
    "Viri ca iu non tu rioddu c'a fari l'atelier! arrusbigghiamuni! 💪",
  ];
  private removedEntryMotivations: string[] = [
    "Peccato, ma ce ne saranno altre! 💪",
    "Anammazzari! 🌈",
    "Che Strunz! ✨",
    "Non è una sfortuna, è proprio sfiga! 🍀",
    "Qualcuno ti ha fatto il malocchio ? 🧙‍♂️",
    "Bafantoc...! 💕",
    "Au, mappiddaveru! 😔",
    "Quindi sei libera di uscire? 😜",
    "Quindi sei libera di vedere Lillina? 💏",
    "Manco a farlo apposta! 😔",
    "Iu mu sinteva, proprio ca n'da ucca lamma! 😔",
    "Acqua d'avanti e ventu darreri! 🌬️",
    "Giustu giustu! 😔",
    "Vabbè, I macaron li puoi fare a noi allora! 🍪",
    "A bedda pasta fresca... na mangiamo nuatri! 🍝",
    "Marraccumannu, non tu scuddari ca non cià ghiri chiù! 🥖",
    "U signuri ci runa u pasta a cu non c'avi i denti ! 🍞",
    "Comu finiu ca securité sociale? 🥳",
  ];

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

  private getRandomMotivation(motivations: string[]): string {
    return motivations[Math.floor(Math.random() * motivations.length)];
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

  async notifyNewEntry(
    name: string,
    day: string,
    month: string,
    time: string,
  ): Promise<boolean> {
    if (!this.enabled || !this.bot) {
      logger.warn("Telegram notifications disabled");
      return false;
    }

    try {
      const capitalizedName =
        name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      const motivation = this.getRandomMotivation(this.newEntryMotivations);

      const message = `*🥳 Nuovo Atelier in programma*

Ciao ${capitalizedName}, ho trovato un nuovo atelier in programma per te il ${day} ${month} alle ${time}.

${motivation}`;

      await this.bot.telegram.sendMessage(this.chatId, message, {
        parse_mode: "Markdown",
      });

      logger.info("Telegram new entry notification sent");
      return true;
    } catch (error) {
      logger.error("Failed to send Telegram new entry notification:", error);
      return false;
    }
  }

  async notifyDeletedEntry(
    name: string,
    day: string,
    month: string,
    time: string,
  ): Promise<boolean> {
    if (!this.enabled || !this.bot) {
      logger.warn("Telegram notifications disabled");
      return false;
    }

    try {
      const capitalizedName =
        name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      const motivation = this.getRandomMotivation(this.removedEntryMotivations);

      const message = `*❌ Rimosso un Atelier in programma*

Ciao ${capitalizedName}, sembra che l'atelier che era in programma il ${day} ${month} alle ${time} sia stato annullato! 😔

${motivation}`;

      await this.bot.telegram.sendMessage(this.chatId, message, {
        parse_mode: "Markdown",
      });

      logger.info("Telegram deleted entry notification sent");
      return true;
    } catch (error) {
      logger.error(
        "Failed to send Telegram deleted entry notification:",
        error,
      );
      return false;
    }
  }

  async notifyDailyReminder(name: string, time: string): Promise<boolean> {
    if (!this.enabled || !this.bot) {
      logger.warn("Telegram notifications disabled");
      return false;
    }

    try {
      const upperName =
        name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

      const message = `*❗❗❗ ATTENZIONE OGGI ATELIER ❗❗❗*

Ciao ${upperName}, ti ricordo che oggi hai un Atelier previsto alle ${time}, mi raccomando non lo scordare! 🎨`;

      await this.bot.telegram.sendMessage(this.chatId, message, {
        parse_mode: "Markdown",
      });

      logger.info("Telegram daily reminder notification sent");
      return true;
    } catch (error) {
      logger.error(
        "Failed to send Telegram daily reminder notification:",
        error,
      );
      return false;
    }
  }

  async notifyUpcomingEvent(name: string, time: string): Promise<boolean> {
    if (!this.enabled || !this.bot) {
      logger.warn("Telegram notifications disabled");
      return false;
    }

    try {
      const capitalizedName =
        name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

      const message = `*❗❗❗ ⏰ Atelier tra poco! ❗❗❗*

Ciao ${capitalizedName}, tra poco hai un Atelier! Ricorda che inizia alle ${time}! ⏱️`;

      await this.bot.telegram.sendMessage(this.chatId, message, {
        parse_mode: "Markdown",
      });

      logger.info("Telegram upcoming event notification sent");
      return true;
    } catch (error) {
      logger.error(
        "Failed to send Telegram upcoming event notification:",
        error,
      );
      return false;
    }
  }

  async notifyTemplateError(): Promise<boolean> {
    if (!this.enabled || !this.bot) {
      logger.warn("Telegram notifications disabled");
      return false;
    }

    try {
      const message = `*⚠️ ERRORE CRITICO - Template Calendario Modificato*

Il template del calendario è cambiato! Questo bot non è più affidabile. Contattami al più presto e non fidarti più di quello che ti dico io! ❌

Non riesco più a riconoscere i mesi. L'applicazione ha bisogno di essere aggiornata urgentemente!`;

      await this.bot.telegram.sendMessage(this.chatId, message, {
        parse_mode: "Markdown",
      });

      logger.error(
        "Template error notification sent - calendar template changed",
      );
      return true;
    } catch (error) {
      logger.error("Failed to send template error notification:", error);
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

    // Send email with technical details
    await this.emailNotifier.send(payload);

    // Send user-friendly Telegram notification
    const name = (details.name as string) || "Amore";
    const day = (details.day as string) || "";
    const month = (details.month as string) || "";
    const time = (details.time as string) || "";

    await this.telegramNotifier.notifyNewEntry(name, day, month, time);
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

    // Send email with technical details
    await this.emailNotifier.send(payload);

    // Send user-friendly Telegram notification
    const name = (details.name as string) || "Amore";
    const day = (details.day as string) || "";
    const month = (details.month as string) || "";
    const time = (details.time as string) || "";

    await this.telegramNotifier.notifyDeletedEntry(name, day, month, time);
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

  async notifyDailyReminders(
    entries: Array<{ name: string; time: string }>,
  ): Promise<void> {
    for (const entry of entries) {
      await this.telegramNotifier.notifyDailyReminder(entry.name, entry.time);
    }
  }

  async notifyUpcomingEvents(
    entries: Array<{ name: string; time: string }>,
  ): Promise<void> {
    for (const entry of entries) {
      await this.telegramNotifier.notifyUpcomingEvent(entry.name, entry.time);
    }
  }

  async notifyTemplateError(): Promise<void> {
    await this.telegramNotifier.notifyTemplateError();
  }
}

export default new NotificationManager();
