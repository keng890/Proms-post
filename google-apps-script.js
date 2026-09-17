/**
 * Prompt Post Survey - Google Sheets API
 * รับข้อมูล / อ่านข้อมูล / ลบข้อมูล
 */

const SHEET_NAME = ""; 
// ถ้าใช้ Sheet แรก ไม่ต้องใส่ชื่อ
// ถ้าต้องการระบุชื่อ Sheet เช่น "Form Responses"
// ให้ใส่ชื่อใน "" ได้เลย

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (SHEET_NAME && SHEET_NAME.trim() !== "") {
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      throw new Error("ไม่พบ Sheet ชื่อ: " + SHEET_NAME);
    }

    return sheet;
  }

  return ss.getActiveSheet();
}


/**
 * ============================
 * รับข้อมูลจากแบบสอบถาม
 * ============================
 */
function doPost(e) {

  const lock = LockService.getScriptLock();

  try {

    lock.tryLock(10000);

    const sheet = getSheet();

    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("ไม่พบข้อมูลที่ส่งเข้ามา");
    }

    const data = JSON.parse(e.postData.contents);

    // สร้าง Header ถ้ายังไม่มี
    if (sheet.getLastRow() === 0) {

      const headers = [
        "Timestamp (วันเวลา)",
        "1.1 ช่วงอายุ (Age)",
        "1.2 สถานภาพปัจจุบัน (Status)",
        "1.3 รูปแบบการอยู่อาศัย (Living)",
        "2.1 เอกสารที่ยุ่งยากที่สุด (Pain Docs)",
        "2.2 ประสบการณ์เอกสารหาย (Lost Experience)",
        "2.3 เวลาที่เสียไป (Waste Time)",
        "2.4 ค่าใช้จ่ายที่เสียไป (Waste Money)",
        "3.1 ฟีเจอร์ที่จำเป็น (Hybrid Feature)",
        "3.2 เหตุผลเปิดใช้ครั้งแรก (Trigger Reason)",
        "3.3 ความถี่ในการใช้งาน (Usage Frequency)",
        "3.4 แนวโน้มใช้ประจำ (Regular Use Intent)",
        "4.1 มิติชีวิตที่ช่วยลดความกังวล (Life Dimension)",
        "5.1 ช่องทางรับข้อมูลสื่อ (Media Channels)",
        "6.1 ปัจจัยตัดสินใจดาวน์โหลด (Download Factor)",
        "6.2 โมเดลราคาที่ยินดีจ่าย (Pricing Intent)",
        "7.1 การรับรู้แบรนด์ Prompt Post (Brand Awareness)",
        "8.1 ระดับการช่วยแก้ปัญหา (Value Relief)",
        "9.1 ข้อเสนอแนะเพิ่มเติม (Actionable Feedback)",
        "Persona Classification"
      ];

      sheet.appendRow(headers);

      sheet
        .getRange(1, 1, 1, headers.length)
        .setFontWeight("bold");

      sheet.setFrozenRows(1);
    }

    const row = [

      data.timestamp || new Date(),

      data.ageGroup || "",

      data.status || "",

      data.livingType || "",

      Array.isArray(data.painDocs)
        ? data.painDocs.join(", ")
        : (data.painDocs || ""),

      data.lostDocExp || "",

      data.wasteTime || "",

      data.wasteMoney || "",

      Array.isArray(data.hybridFeatureInterest)
        ? data.hybridFeatureInterest.join(", ")
        : (data.hybridFeatureInterest || ""),

      data.triggerReason || "",

      data.usageFrequency || "",

      data.regularUseIntent || "",

      data.lifeDimension || "",

      Array.isArray(data.mediaChannels)
        ? data.mediaChannels.join(", ")
        : (data.mediaChannels || ""),

      Array.isArray(data.downloadFactor)
        ? data.downloadFactor.join(", ")
        : (data.downloadFactor || ""),

      data.pricingModel || "",

      data.brandAwareness || "",

      data.valueRelief || "",

      data.actionableFeedback || "",

      data.persona || ""
    ];

    sheet.appendRow(row);

    return jsonResponse({
      status: "success",
      message: "บันทึกข้อมูลสำเร็จ"
    });

  } catch (error) {

    return jsonResponse({
      status: "error",
      message: error.toString()
    });

  } finally {

    try {
      lock.releaseLock();
    } catch (err) {}

  }
}


/**
 * ============================
 * GET API
 *
 * /exec
 * /exec?action=getResponses
 * ============================
 */
function doGet(e) {

  try {

    const action =
      e &&
      e.parameter &&
      e.parameter.action
        ? e.parameter.action
        : "";

    // ตรวจสอบระบบ
    if (action === "") {

      return ContentService
        .createTextOutput(
          "Prompt Post 9-Part Survey Webhook is active and running!"
        )
        .setMimeType(ContentService.MimeType.TEXT);
    }


    // อ่านข้อมูลทั้งหมด
    if (action === "getResponses") {

      const sheet = getSheet();

      const lastRow = sheet.getLastRow();
      const lastColumn = sheet.getLastColumn();

      if (lastRow < 2 || lastColumn === 0) {

        return jsonResponse({
          status: "success",
          headers: [],
          rows: [],
          total: 0
        });
      }

      const values =
        sheet
          .getRange(1, 1, lastRow, lastColumn)
          .getValues();

      const headers = values[0];

      const rows = [];

      for (let i = 1; i < values.length; i++) {

        const row = values[i];

        // ข้ามแถวว่าง
        if (
          row.every(function(cell) {
            return cell === "" || cell === null;
          })
        ) {
          continue;
        }

        const obj = {
          rowNumber: i + 1
        };

        headers.forEach(function(header, index) {

          obj[header] = row[index];

        });

        rows.push(obj);
      }

      return jsonResponse({
        status: "success",
        headers: headers,
        rows: rows,
        total: rows.length
      });
    }


    // ลบข้อมูล 1 แถว
    if (action === "deleteResponse") {

      const rowNumber =
        Number(e.parameter.row);

      if (!rowNumber || rowNumber < 2) {

        throw new Error(
          "หมายเลขแถวไม่ถูกต้อง"
        );
      }

      const sheet = getSheet();

      if (rowNumber > sheet.getLastRow()) {

        throw new Error(
          "ไม่พบแถวที่ต้องการลบ"
        );
      }

      sheet.deleteRow(rowNumber);

      return jsonResponse({
        status: "success",
        message: "ลบข้อมูลสำเร็จ"
      });
    }


    // ลบข้อมูลทั้งหมด เหลือ Header
    if (action === "deleteAll") {

      const sheet = getSheet();

      const lastRow = sheet.getLastRow();

      if (lastRow > 1) {

        sheet.deleteRows(
          2,
          lastRow - 1
        );
      }

      return jsonResponse({
        status: "success",
        message: "ลบข้อมูลทั้งหมดสำเร็จ"
      });
    }


    return jsonResponse({
      status: "error",
      message: "ไม่รู้จัก action: " + action
    });


  } catch (error) {

    return jsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}


/**
 * ============================
 * JSON Response
 * ============================
 */
function jsonResponse(data) {

  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}
