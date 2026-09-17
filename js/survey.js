/**
 * Prompt Post Survey Logic
 * Data source of truth: Google Sheets via Google Apps Script.
 */
let currentStep = 1;
const totalSteps = 9;

const surveyData = {
  ageGroup: "",
  status: "",
  livingType: "",
  painDocs: [],
  lostDocExp: "",
  wasteTime: "",
  wasteMoney: "",
  hybridFeatureInterest: "",
  triggerReason: "",
  usageFrequency: "",
  regularUseIntent: "",
  lifeDimension: "",
  mediaChannels: [],
  downloadFactors: [],
  pricingModels: [],
  brandAwareness: "",
  valueRelief: "",
  actionableFeedback: "",
  timestamp: ""
};

const stepTitles = [
  "Screening & Demographics",
  "Behavior & Pain Points",
  "Hybrid Use Case & Value Proposition",
  "Pain to Solution Connection",
  "Target & Marketing Channels",
  "Conversion & Pricing Intent",
  "Brand Awareness",
  "Value & Pain Point Relief",
  "Actionable Feedback"
];

function selectSingle(element) {
  const parent = element.closest(".options-list");
  parent.querySelectorAll(".option-item").forEach(item => item.classList.remove("selected"));
  element.classList.add("selected");

  const fieldName = parent.dataset.name;
  let value = element.querySelector(".option-text")?.innerText.trim() || "";
  surveyData[fieldName] = value;

  if (element.dataset.terminate === "true") {
    surveyData[fieldName] = value;
  }
}

function selectMultiple(element, maxLimit = 99) {
  const parent = element.closest(".options-list");
  const selected = parent.querySelectorAll(".option-item.selected");

  if (!element.classList.contains("selected") && selected.length >= maxLimit) {
    alert(`คุณสามารถเลือกได้สูงสุด ${maxLimit} ข้อครับ`);
    return;
  }

  element.classList.toggle("selected");
  const fieldName = parent.dataset.name;
  surveyData[fieldName] = Array.from(parent.querySelectorAll(".option-item.selected"))
    .map(item => item.querySelector(".option-text")?.innerText.trim() || "");
}

function updateOtherValue(fieldName, baseValue, inputId) {
  const input = document.getElementById(inputId);
  if (surveyData[fieldName] && surveyData[fieldName].includes(baseValue) && input && input.value.trim()) {
    surveyData[fieldName] = `${baseValue}: ${input.value.trim()}`;
  }
}

function updateMultiOther(fieldName, baseValue, inputId) {
  const input = document.getElementById(inputId);
  if (!Array.isArray(surveyData[fieldName])) return;
  surveyData[fieldName] = surveyData[fieldName].map(v =>
    v === baseValue && input && input.value.trim() ? `${baseValue}: ${input.value.trim()}` : v
  );
}

function handleStep1Next() {
  if (!validateStep(1)) return;

  updateOtherValue("status", "อื่นๆ", "status-other");
  updateOtherValue("livingType", "อื่นๆ", "living-other");

  if (
    surveyData.ageGroup.includes("น้อยกว่า 21") ||
    surveyData.ageGroup.includes("มากกว่า 25") ||
    surveyData.status.includes("ทำงานมาแล้วมากกว่า 1 ปี")
  ) {
    terminateSurvey();
    return;
  }

  nextStep(1);
}

function terminateSurvey() {
  document.getElementById("survey-form").style.display = "none";
  document.getElementById("progress-wrapper").style.display = "none";
  document.getElementById("hero-banner").style.display = "none";
  document.getElementById("terminate-screen").style.display = "block";
  window.scrollTo({top: 0, behavior: "smooth"});
}

function updateProgress(step) {
  const percent = Math.round((step / totalSteps) * 100);
  const bar = document.getElementById("progress-bar");
  const label = document.getElementById("step-label");
  const pct = document.getElementById("step-percent");
  if (bar) bar.style.width = `${percent}%`;
  if (label) label.innerText = `ส่วนที่ ${step} จาก ${totalSteps}: ${stepTitles[step - 1] || ""}`;
  if (pct) pct.innerText = `${percent}%`;
}

function validateStep(stepNumber) {
  const card = document.querySelector(`.survey-step[data-step="${stepNumber}"]`);
  if (!card) return true;

  const lists = card.querySelectorAll('.options-list[data-required="true"]');
  for (const list of lists) {
    const field = list.dataset.name;
    const isMulti = list.dataset.type === "multi";
    const value = surveyData[field];

    if (isMulti && (!Array.isArray(value) || value.length === 0)) {
      alert("กรุณาเลือกคำตอบอย่างน้อย 1 ข้อครับ");
      return false;
    }
    if (!isMulti && (!value || value === "")) {
      alert("กรุณาเลือกคำตอบให้ครบถ้วนครับ");
      return false;
    }
  }

  if (stepNumber === 2) {
    updateMultiOther("painDocs", "อื่นๆ", "pain-other");

    if (surveyData.lostDocExp.includes("เคยประสบปัญหา")) {
      const detail = document.getElementById("lost-doc-detail")?.value.trim();
      if (!detail) {
        alert("กรุณาระบุเหตุการณ์ที่เคยประสบปัญหาเอกสารครับ");
        document.getElementById("lost-doc-detail")?.focus();
        return false;
      }
      surveyData.lostDocExp = `เคยประสบปัญหา: ${detail}`;
    }
  }

  if (stepNumber === 3) {
    updateOtherValue("triggerReason", "อื่นๆ", "trigger-other");
    updateOtherValue("usageFrequency", "อื่นๆ", "usage-other");
  }

  if (stepNumber === 5) {
    updateMultiOther("mediaChannels", "อื่นๆ", "media-other");
  }

  if (stepNumber === 6) {
    updateMultiOther("downloadFactors", "อื่นๆ", "download-other");
    updateMultiOther("pricingModels", "อื่นๆ", "pricing-other");
  }

  return true;
}

function nextStep(step) {
  if (!validateStep(step)) return;

  const current = document.querySelector(`.survey-step[data-step="${step}"]`);
  const next = document.querySelector(`.survey-step[data-step="${step + 1}"]`);
  if (current) current.style.display = "none";
  if (next) {
    next.style.display = "block";
    window.scrollTo({top: 80, behavior: "smooth"});
  }
  currentStep = Math.min(step + 1, totalSteps);
  updateProgress(currentStep);
}

function prevStep(step) {
  const current = document.querySelector(`.survey-step[data-step="${step}"]`);
  const prev = document.querySelector(`.survey-step[data-step="${step - 1}"]`);
  if (current) current.style.display = "none";
  if (prev) {
    prev.style.display = "block";
    window.scrollTo({top: 80, behavior: "smooth"});
  }
  currentStep = Math.max(step - 1, 1);
  updateProgress(currentStep);
}

async function submitSurvey() {
  const submitBtn = document.getElementById("btn-submit");
  const feedback = document.getElementById("actionable-feedback");
  surveyData.actionableFeedback = feedback ? feedback.value.trim() : "";

  if (!CONFIG.GOOGLE_SHEET_WEBHOOK_URL || !CONFIG.GOOGLE_SHEET_WEBHOOK_URL.trim()) {
    alert("ยังไม่ได้ตั้งค่า Google Sheets Web App URL กรุณาแจ้งผู้ดูแลระบบก่อนครับ");
    return;
  }

  surveyData.timestamp = new Date().toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok"
  });

  submitBtn.disabled = true;
  submitBtn.innerText = "กำลังบันทึกข้อมูล...";

  try {
    await fetch(CONFIG.GOOGLE_SHEET_WEBHOOK_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {"Content-Type": "text/plain;charset=utf-8"},
      body: JSON.stringify(surveyData)
    });

    // no-cors does not expose the response, but the request has been sent.
    document.getElementById("survey-form").style.display = "none";
    document.getElementById("progress-wrapper").style.display = "none";
    document.getElementById("hero-banner").style.display = "none";
    document.getElementById("success-screen").style.display = "block";
    window.scrollTo({top: 0, behavior: "smooth"});
  } catch (error) {
    console.error(error);
    submitBtn.disabled = false;
    submitBtn.innerText = "ส่งคำตอบแบบสอบถาม ✓";
    alert("ไม่สามารถส่งข้อมูลได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้งครับ");
  }
}

updateProgress(1);
