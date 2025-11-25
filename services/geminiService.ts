import { GoogleGenAI, Type } from "@google/genai";
import { EmailTemplate } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Internal name for the template" },
    subject: { type: Type.STRING, description: "Email subject line" },
    preheader: { type: Type.STRING, description: "Preview text shown in inbox" },
    variables: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "List of variable names used (without brackets)" 
    },
    mjml: { type: Type.STRING, description: "The full MJML source code" },
    html: { type: Type.STRING, description: "The compiled HTML for preview" }
  },
  required: ["title", "subject", "preheader", "variables", "mjml", "html"]
};

// Model configuration - Using 2.5 Flash for speed and reliability
const MODEL_NAME = 'gemini-2.5-flash';

export const generateEmailTemplate = async (
  promptText: string
): Promise<Partial<EmailTemplate>> => {
  
  if (!process.env.API_KEY) {
    throw new Error("Missing API Key. Please configure API_KEY in your settings.");
  }

  const systemInstruction = `
    You are Sirz, a world-class email designer specialized in MJML.
    Your goal is to generate visually stunning, modern, and responsive email templates.
    
    Design Guidelines by Sirz:
    1. AESTHETICS: Create sophisticated layouts with clear visual hierarchy. Use whitespace effectively.
    2. IMAGES: You MUST include professional placeholder images. 
       - Use this format: https://placehold.co/{width}x{height}/{hex_bg}/{hex_fg}?text={Text}
       - **CRITICAL**: The very first image in the template MUST be the brand Logo. You MUST add alt="Logo" to this specific mj-image tag.
         Example: <mj-image width="150px" src="https://placehold.co/150x50/transparent/4f46e5?text=LOGO" alt="Logo" />
       - Example Hero: https://placehold.co/600x300/4f46e5/ffffff?text=Welcome+To+Our+Brand
       - Example Product: https://placehold.co/250x250/e2e8f0/475569?text=Product
       - Do not leave image 'src' attributes empty.
    3. COLORS: Use a harmonious color palette. If the user mentions a tone (e.g., 'trustworthy', 'exciting'), match the hex codes.
    4. BUTTONS: Every <mj-button> MUST have an href attribute. Use href="https://example.com" as a placeholder if not specified.
    5. SOCIAL MEDIA: Use <mj-social> and <mj-social-element> for footers.
       - Every <mj-social-element> MUST have an href attribute (e.g., href="https://twitter.com").
       - Example: <mj-social-element name="facebook" href="https://facebook.com"></mj-social-element>
    
    Technical Rules:
    1. Output MUST be valid JSON matching the schema.
    2. The 'mjml' field must contain valid, error-free MJML code.
    3. The 'html' field must contain the compiled HTML from that MJML.
    4. VARIABLE SYNTAX: Use square brackets [variableName] for dynamic variables. DO NOT use curly braces.
       - Example: "Hi [firstName]," or "Your code is [discountCode]"
    5. Identify all variables used and list them in the 'variables' array (e.g., ["firstName", "discountCode"]).
    6. Do not include markdown code blocks (like \`\`\`json) in the response, just the raw JSON string.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: promptText,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });

    if (!response.text) {
      throw new Error("No response generated from Gemini.");
    }

    const data = JSON.parse(response.text);
    return data;
  } catch (error: any) {
    console.error("Sirz AI Generation Error:", error);
    if (error.message?.includes('403') || error.message?.includes('API key')) {
      throw new Error("Invalid or missing API Key. Please check your settings.");
    }
    throw error;
  }
};

export const editEmailTemplate = async (
  currentMjml: string,
  userPrompt: string
): Promise<Partial<EmailTemplate>> => {
  
  if (!process.env.API_KEY) {
    throw new Error("Missing API Key.");
  }

  const systemInstruction = `
    You are Sirz, an expert MJML email editor. 
    You will be provided with an existing MJML template code and a user request to modify it.

    Your task is to:
    1. Apply the user's specific changes (e.g., change colors, rewrite text, add a section, fix layout).
    2. Keep the rest of the template structure intact unless asked to change it.
    3. Ensure the result is valid MJML.
    4. If the user changes text, ensure variables still use square brackets [variableName].
    5. Update the 'variables' list if new variables were added or removed.
    6. Ensure images follow the placeholder rules (placehold.co) if new ones are added.
    7. Ensure all buttons and social links have href attributes.

    Input Context:
    - User Request: "${userPrompt}"
    
    Return the FULL updated JSON object (title, subject, mjml, html, etc).
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Current MJML Code:\n${currentMjml}`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });

    if (!response.text) {
      throw new Error("No response generated");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Sirz AI Edit Error:", error);
    throw error;
  }
};