const FALLBACK_MODEL = {
  model_name: "CIP_Prediction_Model",
  intercept: -2.62789827585594,
  coefficients: {
    Radiotherapy1: 1.67472765949244,
    Reticular_opacities1: 1.17783752617838,
    Heart_disease1: 1.37104478854538,
    COPD1: 0.80193270992934,
    Lung_surgery1: 0.576667100167027,
  },
  weights: {
    Radiotherapy1: 29.8940547385792,
    Reticular_opacities1: 21.0245166019413,
    Heart_disease1: 24.4732853879305,
    COPD1: 14.3145783682527,
    Lung_surgery1: 10.2935649032963,
  },
  odds_ratios: {
    Radiotherapy1: 5.33734137686203,
    Reticular_opacities1: 3.24734430759192,
    Heart_disease1: 3.93946445342854,
    COPD1: 2.22984641282907,
    Lung_surgery1: 1.78009565240616,
  },
};

const FACTORS = [
  {
    key: "Radiotherapy1",
    label: "Radiotherapy",
    description: "History of thoracic radiotherapy.",
  },
  {
    key: "Reticular_opacities1",
    label: "Reticular Opacities",
    description: "Reticular opacities present on baseline imaging.",
  },
  {
    key: "Heart_disease1",
    label: "Heart Disease",
    description: "History of heart disease.",
  },
  {
    key: "COPD1",
    label: "Chronic Obstructive Pulmonary Disease",
    description: "History of COPD.",
  },
  {
    key: "Lung_surgery1",
    label: "Lung Surgery",
    description: "History of lung surgery.",
  },
];

let model = FALLBACK_MODEL;

const els = {
  form: document.querySelector("#calculator"),
  factorList: document.querySelector("#factor-list"),
  calculateButton: document.querySelector("#calculate-button"),
  heroRisk: document.querySelector("#hero-risk"),
  heroRiskNote: document.querySelector("#hero-risk-note"),
  riskPercent: document.querySelector("#risk-percent"),
  riskFill: document.querySelector("#risk-fill"),
  riskCategory: document.querySelector("#risk-category"),
  results: document.querySelector(".results"),
  scoreValue: document.querySelector("#score-value"),
  logitValue: document.querySelector("#logit-value"),
  selectedCount: document.querySelector("#selected-count"),
  dynamicNomogram: document.querySelector("#dynamic-nomogram"),
  formula: document.querySelector("#formula"),
  parameterTable: document.querySelector("#parameter-table"),
};

function logistic(logit) {
  return 1 / (1 + Math.exp(-logit));
}

function getValues() {
  return FACTORS.reduce((values, factor) => {
    const selected = document.querySelector(`input[name="${factor.key}"]:checked`);
    values[factor.key] = Number(selected?.value ?? 0);
    return values;
  }, {});
}

function calculate(values) {
  const logit = FACTORS.reduce((sum, factor) => {
    return sum + (model.coefficients[factor.key] || 0) * values[factor.key];
  }, model.intercept);

  const score = FACTORS.reduce((sum, factor) => {
    return sum + (values[factor.key] ? model.weights[factor.key] || 0 : 0);
  }, 0);

  return {
    logit,
    probability: logistic(logit),
    score: Math.min(100, Math.max(0, score)),
    selectedCount: Object.values(values).filter(Boolean).length,
  };
}

function getRiskLabel(probability) {
  if (probability < 0.1) return "Lower estimated risk";
  if (probability < 0.3) return "Moderate estimated risk";
  return "Higher estimated risk";
}

function formatPercent(probability) {
  return `${(probability * 100).toFixed(1)}%`;
}

function renderFactors() {
  els.factorList.innerHTML = FACTORS.map(
    (factor) => `
      <div class="factor">
        <div>
          <strong>${factor.label}</strong>
          <span>${factor.description}</span>
        </div>
        <div class="toggle" role="radiogroup" aria-label="${factor.label}">
          <input id="${factor.key}-no" type="radio" name="${factor.key}" value="0" checked>
          <label for="${factor.key}-no">No</label>
          <input id="${factor.key}-yes" type="radio" name="${factor.key}" value="1">
          <label for="${factor.key}-yes">Yes</label>
        </div>
      </div>
    `,
  ).join("");
}

function renderModelDetails() {
  const terms = FACTORS.map((factor) => {
    const coefficient = model.coefficients[factor.key].toFixed(4);
    return `${coefficient} x ${factor.label}`;
  });

  els.formula.innerHTML = `
    <strong>logit = ${model.intercept.toFixed(4)} + ${terms.join(" + ")}</strong>
  `;

  els.parameterTable.innerHTML = FACTORS.map(
    (factor) => `
      <tr>
        <td>${factor.label}</td>
        <td>${model.coefficients[factor.key].toFixed(4)}</td>
        <td>${model.weights[factor.key].toFixed(2)}</td>
        <td>${model.odds_ratios[factor.key].toFixed(4)}</td>
      </tr>
    `,
  ).join("");
}

function renderResult(result) {
  const risk = formatPercent(result.probability);
  const label = getRiskLabel(result.probability);
  const riskClass =
    result.probability >= 0.3 ? "risk-high" : result.probability >= 0.1 ? "risk-moderate" : "risk-low";

  els.heroRisk.textContent = risk;
  els.heroRiskNote.textContent = label;
  els.results.classList.remove("risk-low", "risk-moderate", "risk-high");
  els.results.classList.add(riskClass);
  els.riskPercent.textContent = risk;
  els.riskFill.style.width = risk;
  els.riskCategory.textContent = label;
  els.scoreValue.textContent = result.score.toFixed(2);
  els.logitValue.textContent = result.logit.toFixed(4);
  els.selectedCount.textContent = `${result.selectedCount} / ${FACTORS.length}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function markerStyle(percent) {
  return `style="left: ${clamp(percent, 0, 100).toFixed(2)}%"`;
}

function renderScaleTicks(values, suffix = "") {
  return values
    .map((value) => `<span ${markerStyle(value)}>${value}${suffix}</span>`)
    .join("");
}

function renderDynamicNomogram(values, result) {
  const maxPoint = Math.ceil(Math.max(...FACTORS.map((factor) => model.weights[factor.key])));
  const factorRows = FACTORS.map((factor) => {
    const activePoints = values[factor.key] ? model.weights[factor.key] : 0;
    const yesPercent = (model.weights[factor.key] / maxPoint) * 100;
    const activePercent = (activePoints / maxPoint) * 100;
    const state = values[factor.key] ? "Yes" : "No";

    return `
      <div class="nomogram-row">
        <div class="nomogram-label">
          <strong>${factor.label}</strong>
          <span>${state} · ${activePoints.toFixed(2)} points</span>
        </div>
        <div class="nomogram-track-wrap">
          <div class="nomogram-track">
            <span class="nomogram-baseline"></span>
            <span class="nomogram-option no" ${markerStyle(0)}>No</span>
            <span class="nomogram-option yes" ${markerStyle(yesPercent)}>Yes</span>
            <span class="nomogram-marker" ${markerStyle(activePercent)}></span>
          </div>
        </div>
      </div>
    `;
  }).join("");

  const totalPercent = result.score;
  const riskPercent = result.probability * 100;

  els.dynamicNomogram.innerHTML = `
    <div class="nomogram-row nomogram-scale">
      <div class="nomogram-label">
        <strong>Points</strong>
        <span>0 to ${maxPoint}</span>
      </div>
      <div class="nomogram-track-wrap">
        <div class="nomogram-track">
          <span class="nomogram-baseline"></span>
          <div class="nomogram-ticks">${renderScaleTicks([0, 10, 20, 30])}</div>
        </div>
      </div>
    </div>
    ${factorRows}
    <div class="nomogram-row summary-row">
      <div class="nomogram-label">
        <strong>Total Points</strong>
        <span>${result.score.toFixed(2)} / 100</span>
      </div>
      <div class="nomogram-track-wrap">
        <div class="nomogram-track">
          <span class="nomogram-baseline"></span>
          <div class="nomogram-ticks">${renderScaleTicks([0, 25, 50, 75, 100])}</div>
          <span class="nomogram-marker total" ${markerStyle(totalPercent)}></span>
        </div>
      </div>
    </div>
    <div class="nomogram-row summary-row">
      <div class="nomogram-label">
        <strong>Predicted CIP Risk</strong>
        <span>${formatPercent(result.probability)}</span>
      </div>
      <div class="nomogram-track-wrap">
        <div class="nomogram-track risk-track">
          <span class="nomogram-baseline"></span>
          <div class="nomogram-ticks">${renderScaleTicks([0, 25, 50, 75, 100], "%")}</div>
          <span class="nomogram-marker risk" ${markerStyle(riskPercent)}></span>
        </div>
      </div>
    </div>
  `;
}

function update() {
  const values = getValues();
  const result = calculate(values);

  renderResult(result);
  renderDynamicNomogram(values, result);
}

async function loadModel() {
  try {
    const response = await fetch("./assets/cip_model_parameters.json");
    if (response.ok) {
      model = await response.json();
    }
  } catch {
    model = FALLBACK_MODEL;
  }
}

async function init() {
  await loadModel();
  renderFactors();
  renderModelDetails();
  update();

  els.form.addEventListener("change", update);
  els.calculateButton.addEventListener("click", update);
  els.form.addEventListener("reset", () => {
    window.setTimeout(update, 0);
  });
}

init();
