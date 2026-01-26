export enum TechCategory {
  SENSORS = 'Sensors',
  CONNECTIVITY = 'Connectivity',
  OUTPUT = 'Output',
  POWER = 'Power',
  ALGORITHMS = 'Algorithms',
}

export interface TechStackItem {
  category: TechCategory;
  items: string[];
}

export interface ExistingProduct {
  name: string;
  category: string;
  techStack: string[];
}

export interface CompanyProfile {
  name: string;
  description: string;
  techStack: TechStackItem[];
  existingProducts: ExistingProduct[];
}

export interface ScoutedProduct {
  name: string;
  price?: string;
  amazonRating?: string;
  description: string;
  matchScore: number; // 0-100
  reasoning: string;
  requiredTech: string[];
  missingTech?: string[];
  url?: string;
  isNewRelease: boolean;
}

export interface AgentReport {
  id: string;
  date: string;
  products: ScoutedProduct[];
  summary: string;
}

export interface AppConfig {
  geminiKey: string;
  emailServiceId?: string;
  emailTemplateId?: string;
  emailPublicKey?: string;
}
