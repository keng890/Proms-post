/**
 * Prompt Post Admin Dashboard
 * Reads live data from Google Sheets. No mock-data generation.
 */

let charts = {};
let liveData = [];
let refreshTimer = null;

// Keep the existing admin password used by this project.
// Note: client-side password gates are convenience protection, not server-side security.
const ADMIN_PASSWORD = "0637941837";

const COLORS = {
  red: "#FE3B1F",
  blue: "#173F8F",
  sky: "#3CB4E5",
  red2: "#FF7A68",
  navy2: "#102B63",
  green: "#10B981",
  amber: "#F59E0B",
  purple: "#8B5CF6",
  gray: "#CBD5E1"
};

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
});

function checkAuth() {
  const auth = sessionStorage.getItem("promptpost_admin_auth") === "true";
  const gate = document.getElementById("password-gate");
  const content = document.getElementById("admin-content");

  if (auth) {
    gate.style.display = "none";
    content.style.display = "block";
    initDashboard();
  } else {
    gate.style.display = "flex";
    content.style.display = "none";
  }
}

function handlePasswordSubmit(e) {
  e.preventDefault();
  const input = document.getElementById("admin-pass-input");
  const error = document.getElementById("pass-error");

  if (input.value.trim() === ADMIN_PASSWORD) {
    sessionStorage.setItem("promptpost_admin_auth", "true");
    error.style.display = "none";
    checkAuth();
  } else {
    error.style.display = "block";
    input.value = "";
    input.focus();
  }
}

function logoutAdmin() {
  sessionStorage.removeItem("promptpost_admin_auth");
  location.reload();
}

function getWebhookUrl() {
  return (localStorage.getItem(CONFIG.STORAGE_KEY_WEBHOOK) || CONFIG.GOOGLE_SHEET_WEBHOOK_URL || "").trim();
}

async function initDashboard() {
  const input = document.getElementById("webhook-input");
  if (input) input.value = getWebhookUrl();

  await refreshDashboard();

  clearInterval(refreshTimer);
  refreshTimer = setInterval(refreshDashboard, 10000);
}

async function refreshDashboard() {
  const url = getWebhookUrl();
  const status = document.getElementById("connection-status");

  if (!url) {
    status.className = "connection-status error";
    status.innerText = "ยังไม่ได้ตั้งค่า Google Sheets Web App URL";
    liveData = [];
    renderAll();
    return;
  }

  try {
    const separator = url.includes("?") ? "&" : "?";
    const response = await fetch(`${url}${separator}action=read&t=${Date.now()}`, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();
    if (result.status !== "success") throw new Error(result.message || "ไม่สามารถอ่านข้อมูลได้");

    liveData = Array.isArray(result.data) ? result.data : [];
    status.className = "connection-status ok";
    status.innerText = `● เชื่อมต่อ Google Sheets สำเร็จ · ${liveData.length} records · รีเฟรชอัตโนมัติทุก 10 วินาที`;

    document.getElementById("last-update").innerText =
      new Date().toLocaleTimeString("th-TH", {hour:"2-digit", minute:"2-digit", second:"2-digit"});

    renderAll();
  } catch (error) {
    console.error(error);
    status.className = "connection-status error";
    status.innerText = "ไม่สามารถดึงข้อมูลจาก Google Sheets ได้: " + error.message;
    liveData = [];
    renderAll();
  }
}

function renderAll() {
  renderKPIs(liveData);
  renderCharts(liveData);
  renderTable(liveData);
}

function renderKPIs(data) {
  const total = data.length;
  document.getElementById("kpi-total").innerText = total;

  if (!total) {
    document.getElementById("kpi-regular").innerText = "0%";
    document.getElementById("kpi-relief").innerText = "0%";
    document.getElementById("kpi-awareness").innerText = "0%";
    return;
  }

  const regular = data.filter(d =>
    (d.regularUseIntent || "").includes("ใช้อย่างแน่นอน") ||
    (d.regularUseIntent || "").includes("มีแนวโน้มจะใช้")
  ).length;

  const relief = data.filter(d => (d.valueRelief || "").includes("มากที่สุด")).length;
  const aware = data.filter(d => !(d.brandAwareness || "").includes("ไม่เคย")).length;

  document.getElementById("kpi-regular").innerText = `${Math.round(regular / total * 100)}%`;
  document.getElementById("kpi-relief").innerText = `${Math.round(relief / total * 100)}%`;
  document.getElementById("kpi-awareness").innerText = `${Math.round(aware / total * 100)}%`;
}

function countMatches(data, getter, labels) {
  const counts = {};
  labels.forEach(label => counts[label] = 0);
  data.forEach(row => {
    const values = getter(row);
    const arr = Array.isArray(values) ? values : [values || ""];
    arr.forEach(value => {
      const text = String(value);
      labels.forEach(label => {
        if (text === label || text.includes(label)) counts[label]++;
      });
    });
  });
  return counts;
}

function draw(id, type, labels, values, colors) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  if (charts[id]) charts[id].destroy();

  charts[id] = new Chart(canvas, {
    type,
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 1,
        borderColor: "#FFFFFF"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {position: type === "bar" ? "top" : "bottom"},
        tooltip: {enabled: true}
      },
      scales: type === "bar" ? {
        y: {beginAtZero: true, ticks: {stepSize: 1}}
      } : {}
    }
  });
}

function renderCharts(data) {
  const featureLabels = [
    "รับ–ส่งเอกสารออนไลน์อย่างปลอดภัย",
    "เซ็นเอกสารออนไลน์",
    "กระเป๋าเก็บเอกสารดิจิทัล",
    "เก็บเอกสารและจ่ายเงินในแอปเดียว",
    "โหวตออนไลน์และโปสการ์ด"
  ];
  const featureMap = countMatches(data, d => d.hybridFeatureInterest, featureLabels);

  draw("chartFeature", "doughnut", featureLabels.map((_,i)=>`ฟีเจอร์ ${i+1}`),
    Object.values(featureMap), [COLORS.red,COLORS.blue,COLORS.sky,COLORS.amber,COLORS.purple]);

  const painLabels = [
    "เอกสารการศึกษา",
    "เอกสารส่วนตัว/สัญญาเช่า",
    "เอกสารการเงิน/บิลค่าใช้จ่าย",
    "เอกสารการสมัครงานอื่นๆ",
    "อื่นๆ"
  ];
  const painMap = {};
  painLabels.forEach(x => painMap[x] = 0);
  data.forEach(d => {
    (Array.isArray(d.painDocs) ? d.painDocs : [d.painDocs || ""]).forEach(p => {
      if (p.includes("เอกสารการศึกษา")) painMap["เอกสารการศึกษา"]++;
      else if (p.includes("เอกสารส่วนตัว")) painMap["เอกสารส่วนตัว/สัญญาเช่า"]++;
      else if (p.includes("เอกสารการเงิน")) painMap["เอกสารการเงิน/บิลค่าใช้จ่าย"]++;
      else if (p.includes("เอกสารการสมัครงาน")) painMap["เอกสารการสมัครงานอื่นๆ"]++;
      else if (p.includes("อื่นๆ")) painMap["อื่นๆ"]++;
    });
  });
  draw("chartPain", "bar", painLabels, Object.values(painMap), [COLORS.sky]);

  const mediaLabels = ["Facebook","Instagram","TikTok","YouTube Shorts","X (Twitter)","Google / บล็อกรีวิว","เพื่อน / คนรู้จัก","อื่นๆ"];
  const mediaMap = {};
  mediaLabels.forEach(x => mediaMap[x] = 0);
  data.forEach(d => {
    (Array.isArray(d.mediaChannels) ? d.mediaChannels : [d.mediaChannels || ""]).forEach(m => {
      if (m.includes("Facebook")) mediaMap["Facebook"]++;
      else if (m.includes("Instagram")) mediaMap["Instagram"]++;
      else if (m.includes("TikTok")) mediaMap["TikTok"]++;
      else if (m.includes("YouTube Shorts")) mediaMap["YouTube Shorts"]++;
      else if (m.includes("X (Twitter)")) mediaMap["X (Twitter)"]++;
      else if (m.includes("Google")) mediaMap["Google / บล็อกรีวิว"]++;
      else if (m.includes("เพื่อน")) mediaMap["เพื่อน / คนรู้จัก"]++;
      else if (m.includes("อื่นๆ")) mediaMap["อื่นๆ"]++;
    });
  });
  draw("chartMedia", "bar", mediaLabels, Object.values(mediaMap), [COLORS.blue]);

  const priceLabels = ["ใช้งานฟรี","รายเดือน","รายปี","ซื้อขาด","อื่นๆ"];
  const priceMap = {};
  priceLabels.forEach(x => priceMap[x] = 0);
  data.forEach(d => {
    (Array.isArray(d.pricingModels) ? d.pricingModels : [d.pricingModels || ""]).forEach(p => {
      if (p.includes("ใช้งานฟรี")) priceMap["ใช้งานฟรี"]++;
      else if (p.includes("รายเดือน")) priceMap["รายเดือน"]++;
      else if (p.includes("รายปี")) priceMap["รายปี"]++;
      else if (p.includes("ซื้อขาด")) priceMap["ซื้อขาด"]++;
      else if (p.includes("อื่นๆ")) priceMap["อื่นๆ"]++;
    });
  });
  draw("chartPricing", "doughnut", priceLabels, Object.values(priceMap),
    [COLORS.red,COLORS.blue,COLORS.sky,COLORS.green,COLORS.gray]);

  const triggerLabels = ["ความสะดวก","ประหยัดเวลา","ความปลอดภัย","ความน่าเชื่อถือ","ลดการใช้กระดาษ","ลดค่าใช้จ่าย","ยังไม่มีความจำเป็น","อื่นๆ"];
  const triggerMap = {};
  triggerLabels.forEach(x => triggerMap[x] = 0);
  data.forEach(d => {
    const t = d.triggerReason || "";
    if (t.includes("ความสะดวก")) triggerMap["ความสะดวก"]++;
    else if (t.includes("ประหยัดเวลา")) triggerMap["ประหยัดเวลา"]++;
    else if (t.includes("ความปลอดภัย")) triggerMap["ความปลอดภัย"]++;
    else if (t.includes("ความน่าเชื่อถือ")) triggerMap["ความน่าเชื่อถือ"]++;
    else if (t.includes("ลดการใช้กระดาษ")) triggerMap["ลดการใช้กระดาษ"]++;
    else if (t.includes("ลดค่าใช้จ่าย")) triggerMap["ลดค่าใช้จ่าย"]++;
    else if (t.includes("ยังไม่มี")) triggerMap["ยังไม่มีความจำเป็น"]++;
    else if (t.includes("อื่นๆ")) triggerMap["อื่นๆ"]++;
  });
  draw("chartTrigger", "bar", triggerLabels, Object.values(triggerMap), [COLORS.red]);

  const regularLabels = ["ใช้อย่างแน่นอน","มีแนวโน้มจะใช้","ยังไม่แน่ใจ","มีแนวโน้มจะไม่ใช้","ไม่ใช้แน่นอน"];
  const regularMap = {};
  regularLabels.forEach(x => regularMap[x] = 0);
  data.forEach(d => {
    const r = d.regularUseIntent || "";
    regularLabels.forEach(label => { if (r.includes(label)) regularMap[label]++; });
  });
  draw("chartRegular", "doughnut", regularLabels, Object.values(regularMap),
    [COLORS.red,COLORS.sky,COLORS.amber,COLORS.blue,COLORS.gray]);
}

function safe(text) {
  return String(text ?? "-")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function joinValues(value) {
  return Array.isArray(value) ? value.join(" • ") : (value || "-");
}

function renderTable(data) {
  const tbody = document.getElementById("responses-tbody");
  document.getElementById("record-count").innerText = `${data.length} records`;

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="16" class="empty-cell">ยังไม่มีข้อมูลคำตอบจริงใน Google Sheets</td></tr>';
    return;
  }

  tbody.innerHTML = data.slice().reverse().map(row => `
    <tr>
      <td>${safe(row.timestamp)}</td>
      <td>${safe(row.ageGroup)}</td>
      <td>${safe(row.status)}</td>
      <td>${safe(row.livingType)}</td>
      <td>${safe(joinValues(row.painDocs))}</td>
      <td>${safe(row.hybridFeatureInterest)}</td>
      <td>${safe(row.triggerReason)}</td>
      <td>${safe(row.usageFrequency)}</td>
      <td>${safe(row.regularUseIntent)}</td>
      <td>${safe(row.lifeDimension)}</td>
      <td>${safe(joinValues(row.mediaChannels))}</td>
      <td>${safe(joinValues(row.downloadFactors))}</td>
      <td>${safe(joinValues(row.pricingModels))}</td>
      <td>${safe(row.brandAwareness)}</td>
      <td>${safe(row.valueRelief)}</td>
      <td title="${safe(row.actionableFeedback)}">${safe(row.actionableFeedback)}</td>
    </tr>
  `).join("");
}

async function clearAllData() {
  const url = getWebhookUrl();
  if (!url) {
    alert("ยังไม่ได้ตั้งค่า Google Sheets Web App URL");
    return;
  }
  if (!liveData.length) {
    alert("ขณะนี้ไม่มีข้อมูลให้ลบ");
    return;
  }

  const ok = confirm(
    `คุณกำลังจะลบข้อมูลคำตอบจริงทั้งหมด ${liveData.length} รายการจาก Google Sheets\n\n` +
    `การลบนี้ไม่สามารถย้อนกลับได้\n\nต้องการดำเนินการต่อหรือไม่?`
  );
  if (!ok) return;

  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: {"Content-Type": "text/plain;charset=utf-8"},
      body: JSON.stringify({action: "deleteAll"})
    });

    // Give Apps Script a moment to finish, then read the sheet again.
    setTimeout(refreshDashboard, 1200);
    alert("ส่งคำสั่งลบข้อมูลไปยัง Google Sheets แล้ว");
  } catch (error) {
    console.error(error);
    alert("ไม่สามารถส่งคำสั่งลบข้อมูลได้");
  }
}

function exportToCSV() {
  if (!liveData.length) {
    alert("ไม่มีข้อมูลสำหรับส่งออก");
    return;
  }

  const headers = [
    "Timestamp","Age_Group","Status","Living_Type","Pain_Documents",
    "Lost_Doc_Experience","Waste_Time","Waste_Money","Hybrid_Feature",
    "Trigger_Reason","Usage_Frequency","Regular_Use_Intent","Life_Dimension",
    "Media_Channels","Download_Factors","Pricing_Models","Brand_Awareness",
    "Value_Relief","Actionable_Feedback"
  ];

  const esc = v => `"${String(v ?? "").replaceAll('"','""')}"`;
  const rows = [headers.join(",")];

  liveData.forEach(item => {
    rows.push([
      item.timestamp, item.ageGroup, item.status, item.livingType,
      joinValues(item.painDocs), item.lostDocExp, item.wasteTime, item.wasteMoney,
      item.hybridFeatureInterest, item.triggerReason, item.usageFrequency,
      item.regularUseIntent, item.lifeDimension, joinValues(item.mediaChannels),
      joinValues(item.downloadFactors), joinValues(item.pricingModels),
      item.brandAwareness, item.valueRelief, item.actionableFeedback
    ].map(esc).join(","));
  });

  const blob = new Blob(["\uFEFF" + rows.join("\n")], {type:"text/csv;charset=utf-8"});
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `PromptPost_Real_Responses_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function openWebhookModal() {
  document.getElementById("webhook-modal").style.display = "flex";
}
function closeWebhookModal() {
  document.getElementById("webhook-modal").style.display = "none";
}
function saveWebhookUrl() {
  const url = document.getElementById("webhook-input").value.trim();
  if (!url) {
    alert("กรุณาใส่ URL");
    return;
  }
  localStorage.setItem(CONFIG.STORAGE_KEY_WEBHOOK, url);
  CONFIG.GOOGLE_SHEET_WEBHOOK_URL = url;
  closeWebhookModal();
  refreshDashboard();
}
