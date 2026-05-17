async function generateJson({ system, prompt, fallback, schemaHint }) {
  if (!process.env.OPENAI_API_KEY) {
    return fallback;
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: system }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: `${prompt}\nReturn only valid JSON.${schemaHint ? `\nSchema hint: ${schemaHint}` : ""}` }]
          }
        ]
      })
    });

    if (!response.ok) {
      return fallback;
    }

    const data = await response.json();
    const text = data.output_text || "";
    if (!text) {
      return fallback;
    }
    return JSON.parse(text);
  } catch (error) {
    console.error("[Tripo:openai:generateJson]", error);
    return fallback;
  }
}

async function moderateText(content) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: content
      })
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("[Tripo:openai:moderate]", error);
    return null;
  }
}

module.exports = {
  generateJson,
  moderateText
};
