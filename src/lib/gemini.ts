import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const transcribeAudio = async (base64Data: string, mimeType: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        {
          text: "請將這段錄音內容完整轉錄成文字逐字稿。請保持原意，修正明顯的口誤，但不要刪減核心內容。請直接輸出逐字稿內容，不要有額外的開場白或結尾。",
        },
      ],
    });

    return response.text;
  } catch (error) {
    console.error("Transcription Error:", error);
    throw error;
  }
};

export const organizeByStyle = async (transcript: string, style: 'bullets' | 'importance') => {
  const styles = {
    bullets: "請將以下逐字稿整理成簡明的「條列式筆記」。區分出不同的討論主題，每點都要清晰易讀。",
    importance: "請將以下逐字稿內容「依重要程度」進行區分。請列出：1. 極重要 (決策與行動項) 2. 重要 (關鍵討論資訊) 3. 次要 (背景資訊與補充)。"
  };

  const prompt = `
你是一個專業的文案整理專家。
任務：${styles[style]}

========================
📌 逐字稿內容：
${transcript}
========================

請保持專業、精練，不要包含無意義的口語詞。
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Organize Error:", error);
    throw error;
  }
};

export const translateText = async (content: string, targetLang: string) => {
  const prompt = `
請將以下內容翻譯成「${targetLang}」。
要求：保持專業商務語氣，確保翻譯自然流暢，符合該語言的表達習慣。

========================
📌 待翻譯內容：
${content}
========================
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Translation Error:", error);
    throw error;
  }
};

export const analyzeTranscript = async (transcript: string) => {
  const prompt = `
你是一個專業的「會議錄音分析與多語言整理AI助理」。
請根據我提供的逐字稿，進行完整整理與分析。

========================
📌 輸入內容：
${transcript}
========================

請完成以下任務：

# 1️⃣ 中文摘要
請用 5～8 句話整理整段內容重點，保留核心資訊，不要冗長。

---

# 2️⃣ 重點條列
請整理 5～10 點重點，每點要簡短清楚，使用條列方式。

格式：
- 重點1
- 重點2
...

---

# 3️⃣ 行動項目（Tasks / To-do）
如果內容是會議或討論，請整理「可執行事項」，例如：
- 誰要做什麼
- 下一步行動
- 時間安排（如果有）

如果沒有行動項目，請寫：「無明確行動項目」

---

# 4️⃣ 關鍵字（Keywords）
請列出 5～10 個關鍵字（用逗號分隔）

---

# 5️⃣ 英文翻譯（English Summary）
請將摘要翻譯成自然英文（不是逐字翻譯，要像商業英文摘要）

---

# 6️⃣ 日文翻譯（Japanese Summary）
請翻譯成自然日文（正式書面語）

---

# 7️⃣ 韓文翻譯（Korean Summary）
請翻譯成正式韓文摘要

---

# 8️⃣ 超精簡版本（TL;DR）
用 1～2 句話總結整段內容（適合快速閱讀）

---

# ⚠️ 規則：
- 不要亂猜內容，如果不確定請標註「不明」
- 不要加入額外資訊
- 保持專業、清楚、條理化
- 使用標題與分段格式
- 中文要自然，不要機器翻譯感
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
