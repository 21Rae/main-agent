import { EmailTemplate, Recipient, SendLog, UserProfile } from "../types";

// Local Storage Keys
const TEMPLATES_KEY = 'gemini_mail_templates';
const LOGS_KEY = 'gemini_mail_logs';
const USER_KEY = 'gemini_mail_user';

// --- Template Management ---

export const getTemplates = (): EmailTemplate[] => {
  const data = localStorage.getItem(TEMPLATES_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveTemplate = (template: EmailTemplate): void => {
  const templates = getTemplates();
  const index = templates.findIndex(t => t.id === template.id);
  if (index >= 0) {
    templates[index] = { ...template, updatedAt: new Date().toISOString() };
  } else {
    templates.push({ ...template, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
};

export const deleteTemplate = (id: string): void => {
  const templates = getTemplates().filter(t => t.id !== id);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
};

// --- Logs Management ---

export const getLogs = (): SendLog[] => {
  const data = localStorage.getItem(LOGS_KEY);
  return data ? JSON.parse(data) : [];
};

export const addLog = (log: SendLog): void => {
  const logs = getLogs();
  logs.unshift(log); // Newest first
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, 2000))); // Keep last 2000
};

// --- Sending Logic (Simulated) ---

export const processEmailContent = (html: string, vars: Record<string, string>): string => {
  let processed = html;
  Object.keys(vars).forEach(key => {
    // Escape special regex characters in the key just in case
    const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Regex for [variableName]
    const regex = new RegExp(`\\[${safeKey}\\]`, 'g');
    processed = processed.replace(regex, vars[key] || `[${key}]`);
  });
  return processed;
};

export const simulateSendBatch = async (
  template: EmailTemplate,
  recipients: Recipient[],
  onProgress: (sentCount: number, logs: SendLog[]) => void
) => {
  let processed = 0;
  
  // Rate limiter simulation: 1 email per ~500ms
  for (const recipient of recipients) {
    await new Promise(resolve => setTimeout(resolve, 500)); 

    // Simulate Gmail API Call
    // const rawMessage = ... (Base64 encoding)
    // await fetch('https://gmail.googleapis.com/...', ...)

    // Variable Substitution
    const personalizedHtml = processEmailContent(template.html, recipient.vars);
    
    // Check if critical variables are missing (simple validation)
    const missingVars = template.variables.filter(v => !recipient.vars[v]);
    
    let success = true;
    let errorMsg: string | undefined = undefined;

    if (Math.random() > 0.98) {
      success = false;
      errorMsg = 'Gmail API: Rate Limit Exceeded';
    } else if (missingVars.length > 0) {
      // We allow sending with missing vars, but in reality, they would show as [firstName] in the email
    }

    const log: SendLog = {
      id: crypto.randomUUID(),
      recipient: recipient.email,
      templateId: template.id,
      status: success ? 'sent' : 'failed',
      timestamp: new Date().toISOString(),
      error: errorMsg
    };

    addLog(log);
    processed++;
    onProgress(processed, [log]);
  }
};

// --- User / OAuth Simulation ---

export const mockConnectGmail = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Simulate popup and auth delay
    setTimeout(() => {
      const mockUser: UserProfile = {
        email: 'demo.user@gmail.com',
        name: 'Demo User',
        avatar: 'https://ui-avatars.com/api/?name=Demo+User&background=0D8ABC&color=fff',
        connected: true,
        accessToken: 'mock_access_token_xyz',
        refreshToken: 'mock_refresh_token_123'
      };
      localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
      resolve(true);
    }, 1500);
  });
};

export const getMockUser = (): UserProfile | null => {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
};

export const disconnectGmail = () => {
  localStorage.removeItem(USER_KEY);
};