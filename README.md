# Prompt Post Survey Platform

เวอร์ชันปรับปรุง:
- ไม่มีข้อความ J-MAT Award #35 ในหน้าแบบสอบถาม
- มีปุ่ม Admin อยู่มุมขวาบนของหน้าแบบสอบถาม
- Admin มีรหัสผ่าน
- ไม่มี Mock Data / ไม่มีการสุ่มข้อมูล
- Admin อ่านข้อมูลจริงจาก Google Sheets
- Dashboard รีเฟรชข้อมูลทุก 10 วินาที
- มีปุ่มลบข้อมูลจริงทั้งหมดจาก Google Sheets โดยเก็บหัวตารางไว้
- Export CSV จากข้อมูลจริง
- แบบสอบถามปรับเป็น 9 ส่วนตามชุดคำถามล่าสุด
- โทนสีหลักแดง + น้ำเงิน

## โครงสร้าง
- index.html
- admin.html
- google-apps-script.js
- css/style.css
- js/config.js
- js/survey.js
- js/admin.js

## ตั้งค่า Google Sheets
1. สร้าง Google Sheet
2. Extensions > Apps Script
3. วางโค้ดจาก `google-apps-script.js`
4. Save
5. Deploy > New deployment
6. Type: Web app
7. Execute as: Me
8. Who has access: Anyone
9. Copy Web App URL
10. เปิดหน้า Admin > ตั้งค่า Sheets แล้ววาง URL

ระบบจะสร้างหัวตารางอัตโนมัติ และเก็บคำตอบจริงที่ส่งจากหน้าแบบสอบถาม

## สำคัญ
ปุ่ม "ลบข้อมูลทั้งหมด" ลบแถวข้อมูลจริงใน Google Sheets ตั้งแต่แถว 2 เป็นต้นไป และเก็บหัวตารางแถวแรกไว้ ควรใช้สำหรับลบข้อมูลทดสอบเท่านั้นเมื่อมั่นใจว่าต้องการลบ
