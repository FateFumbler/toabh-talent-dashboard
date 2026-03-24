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

export interface TalentDetails {
  // Matching key
  "Phone Number": string;
  "Email Address": string;
  
  // Basic Info
  "Full Name": string;
  "Gender": string;
  "Age": string;
  "Date of Birth": string;
  "Nationality": string;
  "City & State": string;
  
  // Physical Attributes - use exact Google Sheet column names
  "Height (in feet & inches)": string;
  "Chest/Bust (in inches)": string;
  "Waist (in inches)": string;
  "Hips (in inches)": string;
  "Shoe Size (UK)": string;
  "Hair Color": string;
  "Eye Color": string;
  "Skin Tone": string;
  
  // Social & Media
  "Instagram Link": string;
  "YouTube Channel": string;
  "IMDb": string;
  
  // Experience
  "Prior modelling/acting experience": string;
  "Previous Agency": string;
  "Acting Workshop Attended": string;
  "CINTAA/Union Card": string;
  "Languages Known": string;
  "Dance Forms": string;
  "Extra-Curricular": string;
  
  // Work Preferences
  "Scope of Work Interested In": string;
  "Open for placement abroad": string;
  "Valid Passport": string;
  "Can drive 2-wheeler": string;
  "Can drive 4-wheeler": string;
  "Can Swim": string;
  "Gamer": string;
  
  // Comfort/Consent
  "Lingerie/bikini shoots": string;
  "Bold content for web/films": string;
  "Condom brand promotions": string;
  "Alcohol brand shoots": string;
  "Reality TV shows": string;
  "Daily soaps": string;
  "Mother/father roles": string;
  "Haircut": string;
  "Hair color changes": string;
  
  // Documents
  "Upload Polaroids (Required)": string;
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

export const MANAGERS: string[] = []; // Populated at runtime from Talent_Master

export const ACTION_STATUSES: StatusValue[] = ["Meeting Required", "KYC Required", "Onboarded", "Rejected"];
