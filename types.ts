export interface EmailTemplate {
  id: string;
  title: string;
  subject: string;
  preheader: string;
  mjml: string;
  html: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Recipient {
  email: string;
  vars: Record<string, string>;
}

export type SendStatus = 'queued' | 'sending' | 'sent' | 'failed';

export interface SendLog {
  id: string;
  recipient: string;
  templateId: string;
  status: SendStatus;
  timestamp: string;
  error?: string;
}

export interface UserProfile {
  email: string;
  name: string;
  avatar: string;
  connected: boolean;
  accessToken?: string;
  refreshToken?: string;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  EDITOR = 'EDITOR',
  GENERATOR = 'GENERATOR',
  SENDER = 'SENDER',
  LOGS = 'LOGS'
}
