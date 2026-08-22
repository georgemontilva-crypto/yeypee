import "dotenv/config";

export const cfg = {
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET || "change-me",
  appUrl: process.env.APP_URL || "http://localhost:3000",
  port: Number(process.env.PORT || 3000),
  mailFrom: process.env.MAIL_FROM || "info@unifiedtradinggroup.com",
  resendApiKey: process.env.RESEND_API_KEY,
  nodeEnv: process.env.NODE_ENV || "development",

  // Cloudflare R2 (S3-compatible)
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    bucket: process.env.R2_BUCKET || "yeypee-media",
    endpoint: process.env.R2_ENDPOINT || "",
    publicUrl: process.env.R2_PUBLIC_URL || "",
    get enabled() {
      return Boolean(cfg.r2.accessKeyId && cfg.r2.secretAccessKey && cfg.r2.endpoint);
    },
  },

  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD,
  enableCheckout: process.env.ENABLE_CHECKOUT === "true",
};
