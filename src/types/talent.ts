export interface Talent {
  "Full Name": string;
  "Email ": string;
  "Phone": number | string;
  "City": string;
  "Instagram": string;
  "Gender": string;
  "Age": string;
  "Height": string;
  "Status": string;
  "Notes": string;
  "Talent Manager": string;
  "Progress": string;
  "rowIndex": number;
}

export interface TalentProfile extends Talent {
  // Additional fields from Talent_Details sheet
  // Basic Info
  "Basic Info - Name"?: string;
  "Basic Info - Age"?: string;
  "Basic Info - Gender"?: string;
  "Basic Info - Height"?: string;
  "Basic Info - Phone"?: string;
  "Basic Info - Email"?: string;
  "Basic Info - City"?: string;
  
  // Measurements
  "Measurements - Chest"?: string;
  "Measurements - Waist"?: string;
  "Measurements - Hips"?: string;
  "Measurements - Shoe"?: string;
  "Measurements - Hair Color"?: string;
  "Measurements - Hair Length"?: string;
  "Measurements - Eye Color"?: string;
  
  // Skills
  "Skills - Languages"?: string;
  "Skills - Acting"?: string;
  "Skills - Dancing"?: string;
  "Skills - Singing"?: string;
  "Skills - Modeling"?: string;
  "Skills - Other Skills"?: string;
  
  // Work Preferences
  "Work Preferences - Comfortable Shoots"?: string;
  "Work Preferences - Uncomfortable Shoots"?: string;
  "Work Preferences - Travel"?: string;
  "Work Preferences - Out of City"?: string;
  
  // Comfort & Consent
  "Comfort - Swimwear"?: string;
  "Comfort - Lingerie"?: string;
  "Comfort - Ethnic"?: string;
  "Comfort - Western"?: string;
  "Comfort - Hair Cut"?: string;
  "Comfort - Hair Color"?: string;
  "Comfort - Bodypaint"?: string;
  "Comfort - Tattoo"?: string;
  
  // Polaroids
  "Polaroid 1"?: string;
  "Polaroid 2"?: string;
  "Polaroid 3"?: string;
  "Polaroid 4"?: string;
  "Polaroid 5"?: string;
  "Polaroid 6"?: string;
}

export type StatusValue = "New" | "Meeting Required" | "KYC Required" | "Onboarded" | "Rejected";

export const STATUS_VALUES: StatusValue[] = ["New", "Meeting Required", "KYC Required", "Onboarded", "Rejected"];

export const MANAGERS = ["Aryan", "Saloni Kale", "Jhalak", "Prashant", "Anvitha", "Khadija"];

export const ACTION_STATUSES: StatusValue[] = ["Meeting Required", "KYC Required", "Onboarded", "Rejected"];
