/**
 * Prompt Post Admin Dashboard
 * อ่านข้อมูลจริงจาก Google Sheets
 */

const ADMIN_PASSWORD_HASH = "0637941837";

let charts = {};
let realResponses = [];

const WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbyMduBfJA7J8Ah_ms15it4m_LkWYaYzm1EqCNHmm7TBaBjVwqvR0o11yo9hdJI4Vrw1/exec";


/* =========================================
   AUTH
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    checkAuth();

  }
);


function checkAuth() {

  const isAuth =
    sessionStorage.getItem("admin_auth") === "true";

  const gate =
    document.getElementById("password-gate");

  const content =
    document.getElementById("admin-content");

  if (isAuth) {

    if (gate)
      gate.style.display = "none";

    if (content)
      content.style.display = "block";

    initDashboard();

  } else {

    if (gate)
      gate.style.display = "flex";

    if (content)
      content.style.display = "none";
  }
}


function handlePasswordSubmit(e) {

  e.preventDefault();

  const input =
    document.getElementById("admin-pass-input");

  const errorMsg =
    document.getElementById("pass-error");

  const val =
    input.value.trim();

  if (val === ADMIN_PASSWORD_HASH) {

    sessionStorage.setItem(
      "admin_auth",
      "true"
    );

    errorMsg.style.display = "none";

    checkAuth();

  } else {

    errorMsg.style.display = "block";

    input.value = "";

    input.focus();
  }
}


function logoutAdmin() {

  sessionStorage.removeItem(
    "admin_auth"
  );

  location.reload();
}


/* =========================================
   GOOGLE SHEETS
========================================= */

async function loadGoogleSheetResponses() {

  const url =
    WEBHOOK_URL +
    "?action=getResponses&t=" +
    Date.now();

  try {

    const response =
      await fetch(url, {
        method: "GET",
        cache: "no-store"
      });

    if (!response.ok) {

      throw new Error(
        "HTTP " + response.status
      );
    }

    const result =
      await response.json();

    if (result.status !== "success") {

      throw new Error(
        result.message ||
        "ไม่สามารถอ่านข้อมูลได้"
      );
    }

    return convertSheetRows(
      result.rows || []
    );

  } catch (error) {

    console.error(
      "Google Sheets Error:",
      error
    );

    throw error;
  }
}


/* =========================================
   แปลงข้อมูลจาก Google Sheets
========================================= */

function convertSheetRows(rows) {

  return rows.map(function(row) {

    return {

      _sheetRow:
        Number(row.rowNumber),

      timestamp:
        row["Timestamp (วันเวลา)"] || "",

      ageGroup:
        row["1.1 ช่วงอายุ (Age)"] || "",

      status:
        row["1.2 สถานภาพปัจจุบัน (Status)"] || "",

      livingType:
        row["1.3 รูปแบบการอยู่อาศัย (Living)"] || "",

      painDocs:
        splitMulti(
          row[
            "2.1 เอกสารที่ยุ่งยากที่สุด (Pain Docs)"
          ]
        ),

      lostDocExp:
        row[
          "2.2 ประสบการณ์เอกสารหาย (Lost Experience)"
        ] || "",

      wasteTime:
        row[
          "2.3 เวลาที่เสียไป (Waste Time)"
        ] || "",

      wasteMoney:
        row[
          "2.4 ค่าใช้จ่ายที่เสียไป (Waste Money)"
        ] || "",

      hybridFeatureInterest:
        splitMulti(
          row[
            "3.1 ฟีเจอร์ที่จำเป็น (Hybrid Feature)"
          ]
        ),

      triggerReason:
        row[
          "3.2 เหตุผลเปิดใช้ครั้งแรก (Trigger Reason)"
        ] || "",

      usageFrequency:
        row[
          "3.3 ความถี่ในการใช้งาน (Usage Frequency)"
        ] || "",

      regularUseIntent:
        row[
          "3.4 แนวโน้มใช้ประจำ (Regular Use Intent)"
        ] || "",

      lifeDimension:
        row[
          "4.1 มิติชีวิตที่ช่วยลดความกังวล (Life Dimension)"
        ] || "",

      mediaChannels:
        splitMulti(
          row[
            "5.1 ช่องทางรับข้อมูลสื่อ (Media Channels)"
          ]
        ),

      downloadFactor:
        splitMulti(
          row[
            "6.1 ปัจจัยตัดสินใจดาวน์โหลด (Download Factor)"
          ]
        ),

      pricingModel:
        row[
          "6.2 โมเดลราคาที่ยินดีจ่าย (Pricing Intent)"
        ] || "",

      brandAwareness:
        row[
          "7.1 การรับรู้แบรนด์ Prompt Post (Brand Awareness)"
        ] || "",

      valueRelief:
        row[
          "8.1 ระดับการช่วยแก้ปัญหา (Value Relief)"
        ] || "",

      actionableFeedback:
        row[
          "9.1 ข้อเสนอแนะเพิ่มเติม (Actionable Feedback)"
        ] || "",

      persona:
        row["Persona Classification"] || ""
    };

  });
}


function splitMulti(value) {

  if (!value)
    return [];

  if (Array.isArray(value))
    return value;

  return String(value)
    .split(",")
    .map(function(item) {
      return item.trim();
    })
    .filter(Boolean);
}


/* =========================================
   DASHBOARD
========================================= */

async function initDashboard() {

  const lastUpdate =
    document.getElementById(
      "last-update"
    );

  try {

    if (lastUpdate) {

      lastUpdate.innerText =
        "กำลังโหลดข้อมูล...";
    }

    const responses =
      await loadGoogleSheetResponses();

    realResponses =
      responses;

    if (lastUpdate) {

      lastUpdate.innerText =
        new Date().toLocaleTimeString(
          "th-TH"
        );
    }

    renderKPIs(responses);

    renderCharts(responses);

    renderInsights(responses);

    renderTable(responses);

  } catch (error) {

    console.error(error);

    realResponses = [];

    document.getElementById(
      "kpi-total"
    ).innerText = "0";

    document.getElementById(
      "responses-tbody"
    ).innerHTML = `
      <tr>
        <td colspan="12"
            style="text-align:center;
                   color:#DC2626;
                   padding:24px;">
          ❌ ไม่สามารถโหลดข้อมูลจาก Google Sheets ได้
          <br>
          <small>
            ${escapeHtml(error.message)}
          </small>
        </td>
      </tr>
    `;

  }

}


/* =========================================
   KPI
========================================= */

function renderKPIs(data) {

  const total =
    data.length;

  document.getElementById(
    "kpi-total"
  ).innerText = total;

  if (total === 0) {

    document.getElementById(
      "kpi-regular-intent"
    ).innerText = "0%";

    document.getElementById(
      "kpi-value-relief"
    ).innerText = "0%";

    document.getElementById(
      "kpi-awareness"
    ).innerText = "0%";

    return;
  }


  const regularCount =
    data.filter(function(d) {

      const value =
        d.regularUseIntent || "";

      return (
        value.includes(
          "ใช้อย่างแน่นอน"
        ) ||
        value.includes(
          "มีแนวโน้มจะใช้"
        )
      );

    }).length;


  document.getElementById(
    "kpi-regular-intent"
  ).innerText =
    Math.round(
      (regularCount / total) * 100
    ) + "%";


  const reliefCount =
    data.filter(function(d) {

      return (
        (d.valueRelief || "")
          .includes("มากที่สุด")
      );

    }).length;


  document.getElementById(
    "kpi-value-relief"
  ).innerText =
    Math.round(
      (reliefCount / total) * 100
    ) + "%";


  const awareCount =
    data.filter(function(d) {

      return !(
        (d.brandAwareness || "")
          .includes("ไม่เคย")
      );

    }).length;


  document.getElementById(
    "kpi-awareness"
  ).innerText =
    Math.round(
      (awareCount / total) * 100
    ) + "%";
}


/* =========================================
   TABLE
========================================= */

function renderTable(data) {

  const tbody =
    document.getElementById(
      "responses-tbody"
    );

  if (!tbody)
    return;


  if (!data.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="12"
            style="text-align:center;
                   color:var(--text-muted);
                   padding:24px;">
          ยังไม่มีข้อมูลคำตอบจริงใน Google Sheets
        </td>
      </tr>
    `;

    return;
  }


  tbody.innerHTML =
    data.map(function(item) {

      const feature =
        Array.isArray(
          item.hybridFeatureInterest
        )
          ? item.hybridFeatureInterest.join(", ")
          : item.hybridFeatureInterest || "";


      const feedback =
        item.actionableFeedback || "";


      return `
        <tr>

          <td>
            <button
              class="btn-delete-row"
              onclick="deleteGoogleSheetResponse(${item._sheetRow})">
              ลบ
            </button>
          </td>

          <td>
            ${escapeHtml(item.timestamp)}
          </td>

          <td>
            ${escapeHtml(item.ageGroup)}
          </td>

          <td>
            ${escapeHtml(item.status)}
          </td>

          <td>
            ${escapeHtml(item.livingType)}
          </td>

          <td title="${escapeHtml(feature)}">
            ${escapeHtml(feature)}
          </td>

          <td>
            ${escapeHtml(item.triggerReason)}
          </td>

          <td>
            ${escapeHtml(item.regularUseIntent)}
          </td>

          <td>
            ${escapeHtml(item.lifeDimension)}
          </td>

          <td>
            ${escapeHtml(item.pricingModel)}
          </td>

          <td>
            ${escapeHtml(item.brandAwareness)}
          </td>

          <td
            title="${escapeHtml(feedback)}"
            style="max-width:250px;
                   overflow:hidden;
                   text-overflow:ellipsis;
                   white-space:nowrap;">
            ${escapeHtml(feedback)}
          </td>

        </tr>
      `;

    }).join("");
}


/* =========================================
   DELETE 1 ROW
========================================= */

async function deleteGoogleSheetResponse(
  rowNumber
) {

  if (
    !confirm(
      "คุณต้องการลบคำตอบนี้จาก Google Sheets ใช่หรือไม่?"
    )
  ) {

    return;
  }


  try {

    const url =
      WEBHOOK_URL +
      "?action=deleteResponse" +
      "&row=" +
      encodeURIComponent(rowNumber) +
      "&t=" +
      Date.now();


    const response =
      await fetch(url, {
        method: "GET",
        cache: "no-store"
      });


    const result =
      await response.json();


    if (
      result.status !==
      "success"
    ) {

      throw new Error(
        result.message ||
        "ลบข้อมูลไม่สำเร็จ"
      );
    }


    alert(
      "ลบข้อมูลจาก Google Sheets สำเร็จ"
    );


    await initDashboard();


  } catch (error) {

    console.error(error);

    alert(
      "ไม่สามารถลบข้อมูลได้\n\n" +
      error.message
    );
  }
}


/* =========================================
   DELETE ALL
========================================= */

async function clearAllData() {

  if (
    !confirm(
      "คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลคำตอบทั้งหมดจาก Google Sheets?\n\nไม่สามารถกู้คืนได้"
    )
  ) {

    return;
  }


  try {

    const url =
      WEBHOOK_URL +
      "?action=deleteAll&t=" +
      Date.now();


    const response =
      await fetch(url, {
        method: "GET",
        cache: "no-store"
      });


    const result =
      await response.json();


    if (
      result.status !==
      "success"
    ) {

      throw new Error(
        result.message ||
        "ลบข้อมูลไม่สำเร็จ"
      );
    }


    alert(
      "ลบข้อมูลทั้งหมดจาก Google Sheets สำเร็จ"
    );


    await initDashboard();


  } catch (error) {

    console.error(error);

    alert(
      "ไม่สามารถลบข้อมูลได้\n\n" +
      error.message
    );
  }
}


/* =========================================
   WEBHOOK SETTINGS
========================================= */

function openWebhookModal() {

  const modal =
    document.getElementById(
      "webhook-modal"
    );

  const input =
    document.getElementById(
      "webhook-input"
    );

  if (input)
    input.value =
      WEBHOOK_URL;

  if (modal)
    modal.style.display =
      "flex";
}


function closeWebhookModal() {

  const modal =
    document.getElementById(
      "webhook-modal"
    );

  if (modal)
    modal.style.display =
      "none";
}


function saveWebhookUrl() {

  alert(
    "ระบบนี้กำหนด Google Sheets Web App URL ไว้ใน admin.js แล้ว"
  );

  closeWebhookModal();
}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHtml(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";
  }

  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );
}


/* =========================================
   EXPORT CSV
========================================= */

function exportToCSV() {

  const data =
    realResponses || [];

  if (!data.length) {

    alert(
      "ไม่มีข้อมูลสำหรับส่งออก"
    );

    return;
  }


  const headers = [
    "Timestamp",
    "1.1_Age",
    "1.2_Status",
    "1.3_Living",
    "2.1_Pain_Docs",
    "2.2_Lost_Doc_Exp",
    "2.3_Waste_Time",
    "2.4_Waste_Money",
    "3.1_Feature_Interest",
    "3.2_Trigger_Reason",
    "3.3_Usage_Frequency",
    "3.4_Regular_Intent",
    "4.1_Life_Dimension",
    "5.1_Media_Channels",
    "6.1_Download_Factor",
    "6.2_Pricing_Model",
    "7.1_Brand_Awareness",
    "8.1_Value_Relief",
    "9.1_Actionable_Feedback"
  ];


  const csvRows = [];

  csvRows.push(
    headers.join(",")
  );


  data.forEach(function(item) {

    const values = [

      item.timestamp,

      item.ageGroup,

      item.status,

      item.livingType,

      Array.isArray(item.painDocs)
        ? item.painDocs.join("; ")
        : item.painDocs,

      item.lostDocExp,

      item.wasteTime,

      item.wasteMoney,

      Array.isArray(item.hybridFeatureInterest)
        ? item.hybridFeatureInterest.join("; ")
        : item.hybridFeatureInterest,

      item.triggerReason,

      item.usageFrequency,

      item.regularUseIntent,

      item.lifeDimension,

      Array.isArray(item.mediaChannels)
        ? item.mediaChannels.join("; ")
        : item.mediaChannels,

      Array.isArray(item.downloadFactor)
        ? item.downloadFactor.join("; ")
        : item.downloadFactor,

      item.pricingModel,

      item.brandAwareness,

      item.valueRelief,

      item.actionableFeedback

    ].map(function(value) {

      return '"' +
        String(value || "")
          .replace(/"/g, '""') +
        '"';

    });


    csvRows.push(
      values.join(",")
    );

  });


  const csvString =
    "\uFEFF" +
    csvRows.join("\n");


  const blob =
    new Blob(
      [csvString],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    "PromptPost_Survey_RealData_" +
    new Date()
      .toISOString()
      .slice(0, 10) +
    ".csv";


  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}


/* =========================================
   CHARTS
   ใช้ฟังก์ชันเดิมของคุณได้
========================================= */

function renderCharts(data) {

  Object.keys(charts).forEach(
    function(id) {

      if (charts[id]) {

        try {
          charts[id].destroy();
        } catch (e) {}

      }

    }
  );

  charts = {};

  if (!data.length)
    return;


  /*
   * สร้างกราฟพื้นฐาน
   * เพื่อให้ Dashboard แสดงข้อมูลจริง
   */


  createMultiChart(
    "chartFeatureNeeded",
    "ฟีเจอร์ที่ต้องการ",
    data.flatMap(function(d) {

      return Array.isArray(
        d.hybridFeatureInterest
      )
        ? d.hybridFeatureInterest
        : [];

    })
  );


  createMultiChart(
    "chartPainPoints",
    "เอกสารที่มีปัญหา",
    data.flatMap(function(d) {

      return Array.isArray(
        d.painDocs
      )
        ? d.painDocs
        : [];

    })
  );


  createMultiChart(
    "chartMedia",
    "ช่องทางรับข้อมูล",
    data.flatMap(function(d) {

      return Array.isArray(
        d.mediaChannels
      )
        ? d.mediaChannels
        : [];

    })
  );


  createSingleChart(
    "chartPricing",
    "โมเดลราคา",
    data.map(function(d) {

      return d.pricingModel || "";

    })
  );
}


function countValues(values) {

  const counts = {};

  values.forEach(function(value) {

    if (!value)
      return;

    counts[value] =
      (counts[value] || 0) + 1;

  });

  return counts;
}


function createMultiChart(
  canvasId,
  label,
  values
) {

  const canvas =
    document.getElementById(
      canvasId
    );

  if (!canvas)
    return;


  const counts =
    countValues(values);


  const labels =
    Object.keys(counts);


  const data =
    labels.map(function(label) {

      return counts[label];

    });


  charts[canvasId] =
    new Chart(
      canvas,
      {
        type: "bar",

        data: {
          labels: labels,

          datasets: [
            {
              label: label,
              data: data
            }
          ]
        },

        options: {
          responsive: true,
          maintainAspectRatio: false,

          plugins: {
            legend: {
              display: false
            }
          }
        }
      }
    );
}


function createSingleChart(
  canvasId,
  label,
  values
) {

  const canvas =
    document.getElementById(
      canvasId
    );

  if (!canvas)
    return;


  const counts =
    countValues(values);


  const labels =
    Object.keys(counts);


  const data =
    labels.map(function(label) {

      return counts[label];

    });


  charts[canvasId] =
    new Chart(
      canvas,
      {
        type: "doughnut",

        data: {
          labels: labels,

          datasets: [
            {
              label: label,
              data: data
            }
          ]
        },

        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      }
    );
}


/* =========================================
   INSIGHTS
========================================= */

function renderInsights(data) {

  const list =
    document.getElementById(
      "insights-list"
    );

  if (!list)
    return;


  if (!data.length) {

    list.innerHTML =
      "<li>ยังไม่มีข้อมูลจริงสำหรับวิเคราะห์</li>";

    return;
  }


  const total =
    data.length;


  const regular =
    data.filter(function(d) {

      return (
        (d.regularUseIntent || "")
          .includes(
            "ใช้อย่างแน่นอน"
          ) ||
        (d.regularUseIntent || "")
          .includes(
            "มีแนวโน้มจะใช้"
          )
      );

    }).length;


  const awareness =
    data.filter(function(d) {

      return !(
        (d.brandAwareness || "")
          .includes("ไม่เคย")
      );

    }).length;


  list.innerHTML = `

    <li>
      มีผู้ตอบแบบสอบถามจริงทั้งหมด
      <strong>${total}</strong> คน
    </li>

    <li>
      ผู้ที่มีแนวโน้มใช้งานประจำ
      <strong>${Math.round(
        regular / total * 100
      )}%</strong>
    </li>

    <li>
      ผู้ที่เคยรับรู้แบรนด์ Prompt Post
      <strong>${Math.round(
        awareness / total * 100
      )}%</strong>
    </li>

  `;
}


/* =========================================
   COPY INSIGHTS
========================================= */

function copyInsights() {

  const list =
    document.getElementById(
      "insights-list"
    );

  if (!list)
    return;


  const text =
    list.innerText;


  navigator.clipboard
    .writeText(text)
    .then(function() {

      alert(
        "คัดลอกข้อความสรุปแล้ว"
      );

    })

    .catch(function() {

      alert(
        "ไม่สามารถคัดลอกอัตโนมัติได้"
      );

    });
}
