/**
 * Prompt Post Survey - Configuration
 */
const CONFIG = {
  // ใส่ Web App URL ของ Google Apps Script ที่ Deploy แล้ว
  GOOGLE_SHEET_WEBHOOK_URL: localStorage.getItem("promptpost_webhook_url") || "",
  STORAGE_KEY_WEBHOOK: "promptpost_webhook_url",
  APP_TITLE: "Prompt Post Survey",
  VERSION: "2.0.0"
};
