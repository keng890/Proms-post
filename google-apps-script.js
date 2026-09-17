/**
 * Prompt Post Survey - Google Apps Script
 *
 * Google Sheet = ฐานข้อมูลจริงของระบบ
 * รองรับ:
 *   POST JSON           -> เพิ่มคำตอบ
 *   GET ?action=read    -> อ่านคำตอบทั้งหมดให้ Admin
 *   POST {"action":"deleteAll"} -> ลบคำตอบทั้งหมด (แถวข้อมูล ไม่ลบหัวตาราง)
 *
 * Deploy:
 *   Execute as: Me
 *   Who has access: Anyone
 */

const SHEET_NAME = ""; // เว้นว่าง = ใช้ Active Sheet

const HEADERS = [
  "Timestamp",
  "1.1 Age Group",
  "1.2 Status",
  "1.3 Living Type",
  "2.1 Pain Documents",
  "2.2 Lost Document Experience",
  "2.3 Waste Time",
  "2.4 Waste Money",
  "3.1 Hybrid Feature",
  "3.2 Trigger Reason",
  "3.3 Usage Frequency",
  "3.4 Regular Use Intent",
  "4.1 Life Dimension",
  "5.1 Media Channels",
  "6.1 Download Factors",
  "6.2 Pricing Models",
  "7.1 Brand Awareness",
  "8.1 Value Relief",
  "9.1 Actionable Feedback"
];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getActiveSheet();
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    const range = sheet.getRange(1, 1, 1, HEADERS.length);
    range.setBackground("#2E3E8A");
    range.setFontColor("#FFFFFF");
    range.setFontWeight("bold");
    sheet.setFrozenRows(1);
    return;
  }

  const current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), HEADERS.length)).getValues()[0];
  const isNewSchema = HEADERS.every((h, i) => current[i] === h);

  // ถ้าเป็นชีตเก่าที่มีข้อมูลอยู่แล้ว ห้ามเปลี่ยนหัวตารางเงียบๆ
  // เพื่อป้องกันข้อมูลเดิมเลื่อนคอลัมน์ผิดตำแหน่ง
  if (!isNewSchema && sheet.getLastRow() > 1) {
    throw new Error(
      "Google Sheet นี้ยังใช้โครงสร้างแบบเก่า กรุณาสร้าง Google Sheet ใหม่สำหรับแบบสอบถามเวอร์ชันนี้"
    );
  }

  if (!isNewSchema) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    const range = sheet.getRange(1, 1, 1, HEADERS.length);
    range.setBackground("#2E3E8A").setFontColor("#FFFFFF").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
}

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getSheet_();
    ensureHeader_(sheet);

    const data = JSON.parse(e.postData.contents || "{}");

    // ลบข้อมูลทั้งหมด แต่เก็บหัวตารางไว้
    if (data.action === "deleteAll") {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
      }
      return jsonOutput_({status: "success", action: "deleteAll"});
    }

    const row = [
      data.timestamp || new Date().toLocaleString("th-TH", {timeZone: "Asia/Bangkok"}),
      data.ageGroup || "",
      data.status || "",
      data.livingType || "",
      Array.isArray(data.painDocs) ? data.painDocs.join(", ") : (data.painDocs || ""),
      data.lostDocExp || "",
      data.wasteTime || "",
      data.wasteMoney || "",
      data.hybridFeatureInterest || "",
      data.triggerReason || "",
      data.usageFrequency || "",
      data.regularUseIntent || "",
      data.lifeDimension || "",
      Array.isArray(data.mediaChannels) ? data.mediaChannels.join(", ") : (data.mediaChannels || ""),
      Array.isArray(data.downloadFactors) ? data.downloadFactors.join(", ") : (data.downloadFactors || ""),
      Array.isArray(data.pricingModels) ? data.pricingModels.join(", ") : (data.pricingModels || ""),
      data.brandAwareness || "",
      data.valueRelief || "",
      data.actionableFeedback || ""
    ];

    sheet.appendRow(row);

    return jsonOutput_({status: "success", action: "insert"});
  } catch (error) {
    return jsonOutput_({status: "error", message: String(error)});
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "status";
    const sheet = getSheet_();
    ensureHeader_(sheet);

    if (action === "read") {
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) return jsonOutput_({status: "success", data: []});

      const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getDisplayValues();

      const data = values.map(row => ({
        timestamp: row[0] || "",
        ageGroup: row[1] || "",
        status: row[2] || "",
        livingType: row[3] || "",
        painDocs: row[4] ? row[4].split(", ").filter(Boolean) : [],
        lostDocExp: row[5] || "",
        wasteTime: row[6] || "",
        wasteMoney: row[7] || "",
        hybridFeatureInterest: row[8] || "",
        triggerReason: row[9] || "",
        usageFrequency: row[10] || "",
        regularUseIntent: row[11] || "",
        lifeDimension: row[12] || "",
        mediaChannels: row[13] ? row[13].split(", ").filter(Boolean) : [],
        downloadFactors: row[14] ? row[14].split(", ").filter(Boolean) : [],
        pricingModels: row[15] ? row[15].split(", ").filter(Boolean) : [],
        brandAwareness: row[16] || "",
        valueRelief: row[17] || "",
        actionableFeedback: row[18] || ""
      }));

      return jsonOutput_({status: "success", data: data});
    }

    return jsonOutput_({
      status: "success",
      message: "Prompt Post Survey Web App is active",
      records: Math.max(sheet.getLastRow() - 1, 0)
    });
  } catch (error) {
    return jsonOutput_({status: "error", message: String(error)});
  }
}
