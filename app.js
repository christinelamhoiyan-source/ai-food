// ===== 1. 每日目標設定 =====
// 1300 kcal；35% 蛋白質、35% 碳水、25% 脂肪
// 換算：蛋白質 4 kcal/g，碳水 4 kcal/g，脂肪 9 kcal/g
const DAILY_GOAL = {
  calories: 1300,
  proteinRatio: 0.35,
  carbsRatio: 0.35,
  fatRatio: 0.25
};

const MACRO_GOAL = {
  calories: DAILY_GOAL.calories,
  protein: Math.round((DAILY_GOAL.calories * DAILY_GOAL.proteinRatio) / 4),
  carbs: Math.round((DAILY_GOAL.calories * DAILY_GOAL.carbsRatio) / 4),
  fat: Math.round((DAILY_GOAL.calories * DAILY_GOAL.fatRatio) / 9)
};

const STORAGE_KEY = "ai-nutrition-foods-v1";

// ===== 2. 內建高蛋白食物推薦清單 =====
const HIGH_PROTEIN_FOODS = [
  { name: "雞胸肉 100g", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "水浸吞拿魚 1 罐", calories: 120, protein: 26, carbs: 0, fat: 1 },
  { name: "希臘乳酪 170g", calories: 100, protein: 17, carbs: 6, fat: 0 },
  { name: "蛋白 4 隻", calories: 68, protein: 14, carbs: 1, fat: 0 },
  { name: "豆腐 150g", calories: 120, protein: 13, carbs: 3, fat: 7 },
  { name: "低脂牛奶 250ml", calories: 105, protein: 9, carbs: 12, fat: 2 },
  { name: "蝦仁 100g", calories: 99, protein: 24, carbs: 0, fat: 0.3 },
  { name: "乳清蛋白 1 scoop", calories: 120, protein: 24, carbs: 3, fat: 2 }
];

// ===== 3. DOM 元素 =====
const goalSummary = document.getElementById("goalSummary");
const progressArea = document.getElementById("progressArea");
const foodForm = document.getElementById("foodForm");
const foodList = document.getElementById("foodList");
const clearBtn = document.getElementById("clearBtn");
const photoInput = document.getElementById("photoInput");
const previewImage = document.getElementById("previewImage");
const demoScanBtn = document.getElementById("demoScanBtn");
const recommendationCard = document.getElementById("recommendationCard");
const recommendationText = document.getElementById("recommendationText");

const fields = {
  foodName: document.getElementById("foodName"),
  calories: document.getElementById("calories"),
  protein: document.getElementById("protein"),
  carbs: document.getElementById("carbs"),
  fat: document.getElementById("fat")
};

// ===== 4. 資料讀寫 =====
function getFoods() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveFoods(foods) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(foods));
}

function getTotals() {
  return getFoods().reduce(
    (sum, food) => {
      sum.calories += Number(food.calories);
      sum.protein += Number(food.protein);
      sum.carbs += Number(food.carbs);
      sum.fat += Number(food.fat);
      return sum;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

// ===== 5. UI 更新 =====
function renderGoals() {
  goalSummary.innerHTML = `
    <div>蛋白質目標：${MACRO_GOAL.protein}g（35%）</div>
    <div>碳水目標：${MACRO_GOAL.carbs}g（35%）</div>
    <div>脂肪目標：${MACRO_GOAL.fat}g（25%）</div>
  `;
}

function progressRow(label, current, goal, unit) {
  const percent = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const remaining = Math.max(goal - current, 0);
  const overClass = current > goal ? "over" : "";

  return `
    <div class="progress-item">
      <div class="progress-head">
        <strong>${label}</strong>
        <span>已攝取 ${round1(current)}${unit} / 剩餘 ${round1(remaining)}${unit}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${overClass}" style="width:${percent}%"></div>
      </div>
    </div>
  `;
}

function renderProgress() {
  const t = getTotals();

  progressArea.innerHTML = `
    ${progressRow("卡路里", t.calories, MACRO_GOAL.calories, " kcal")}
    ${progressRow("蛋白質", t.protein, MACRO_GOAL.protein, " g")}
    ${progressRow("碳水化合物", t.carbs, MACRO_GOAL.carbs, " g")}
    ${progressRow("脂肪", t.fat, MACRO_GOAL.fat, " g")}
  `;
}

function renderFoodList() {
  const foods = getFoods();

  if (foods.length === 0) {
    foodList.innerHTML = `<li class="hint">今日未加入任何食物。</li>`;
    return;
  }

  foodList.innerHTML = foods
    .map(
      food => `
      <li>
        <div class="food-title">${escapeHtml(food.name)}</div>
        <div class="food-meta">
          ${food.calories} kcal｜蛋白質 ${food.protein}g｜碳水 ${food.carbs}g｜脂肪 ${food.fat}g
        </div>
      </li>
    `
    )
    .join("");
}

function renderRecommendation() {
  const totals = getTotals();
  const proteinRemaining = MACRO_GOAL.protein - totals.protein;
  const caloriesRemaining = MACRO_GOAL.calories - totals.calories;

  // 條件：蛋白質還差 20g 以上，而且剩餘卡路里少於 350 kcal
  if (proteinRemaining < 20 || caloriesRemaining <= 0 || caloriesRemaining > 350) {
    recommendationCard.classList.add("hidden");
    return;
  }

  const options = HIGH_PROTEIN_FOODS
    .filter(food => food.calories <= caloriesRemaining)
    .sort((a, b) => (b.protein / b.calories) - (a.protein / a.calories))
    .slice(0, 3);

  if (options.length === 0) {
    recommendationCard.classList.add("hidden");
    return;
  }

  recommendationCard.classList.remove("hidden");
  recommendationText.innerHTML = `
    <p>你今日蛋白質仲差 <strong>${round1(proteinRemaining)}g</strong>，
    但只剩 <strong>${round1(caloriesRemaining)} kcal</strong>。建議優先選：</p>
    <ul>
      ${options
        .map(
          food => `<li><strong>${food.name}</strong>：${food.calories} kcal，蛋白質 ${food.protein}g</li>`
        )
        .join("")}
    </ul>
  `;
}

function renderAll() {
  renderGoals();
  renderProgress();
  renderFoodList();
  renderRecommendation();
}

// ===== 6. 表單加入食物 =====
foodForm.addEventListener("submit", event => {
  event.preventDefault();

  const food = {
    name: fields.foodName.value.trim(),
    calories: Number(fields.calories.value),
    protein: Number(fields.protein.value),
    carbs: Number(fields.carbs.value),
    fat: Number(fields.fat.value),
    createdAt: new Date().toISOString()
  };

  const foods = getFoods();
  foods.push(food);
  saveFoods(foods);

  foodForm.reset();
  previewImage.classList.add("hidden");
  renderAll();
});

clearBtn.addEventListener("click", () => {
  const ok = confirm("確定要清空今日飲食紀錄？");
  if (!ok) return;

  saveFoods([]);
  renderAll();
});

// ===== 7. 相機 / 圖片預覽 =====
photoInput.addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;

  previewImage.src = URL.createObjectURL(file);
  previewImage.classList.remove("hidden");

  // 這裏是 AI OCR 串接位。
  // 免費 GitHub Pages 不應直接放 OpenAI API Key。
  // 正確做法：圖片 -> 你的後端 / serverless function -> OpenAI API -> 回傳 JSON。
  alert("圖片已載入。現階段請手動輸入營養數字；之後可在 app.js 的 scanNutritionLabelWithAI() 串接 OpenAI API。");

  // 範例：
  // const result = await scanNutritionLabelWithAI(file);
  // fillFormWithScanResult(result);
});

// 示範按鈕：模擬 AI 已辨識營養標籤
demoScanBtn.addEventListener("click", () => {
  fillFormWithScanResult({
    name: "示範蛋白飲品",
    calories: 180,
    protein: 25,
    carbs: 9,
    fat: 4
  });
});

function fillFormWithScanResult(result) {
  fields.foodName.value = result.name || "掃描食物";
  fields.calories.value = result.calories ?? "";
  fields.protein.value = result.protein ?? "";
  fields.carbs.value = result.carbs ?? "";
  fields.fat.value = result.fat ?? "";
}

// ===== 8. 未來串接 OpenAI API 的位置 =====
async function scanNutritionLabelWithAI(file) {
  // 重要：不要在 GitHub Pages 的前端 JavaScript 寫入 OpenAI API Key。
  // 安全做法：
  // 1. 建立一個 Cloudflare Worker / Vercel / Netlify Function
  // 2. API Key 放在後端環境變數
  // 3. 前端把圖片送去你的後端
  // 4. 後端再呼叫 OpenAI vision model，要求回傳 JSON：
  //
  // {
  //   "name": "食物名稱",
  //   "calories": 120,
  //   "protein": 20,
  //   "carbs": 5,
  //   "fat": 2
  // }
  //
  // return fetch("你的後端網址/scan", { method: "POST", body: formData })

  throw new Error("尚未串接 AI OCR 後端。");
}

// ===== 9. 小工具 =====
function round1(num) {
  return Math.round(Number(num) * 10) / 10;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// 啟動
renderAll();
