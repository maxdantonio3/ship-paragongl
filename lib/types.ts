export type CompanyStatus = "Cold" | "Warm" | "Quoting" | "Customer";
export type ActivityType = "Email" | "Call" | "In-Person Visit" | "Quoted" | "Work Received" | "Other";

export interface Company {
  id: string;
  name: string;
  status: CompanyStatus;
  industry: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  google_maps_link: string | null;
  google_place_id: string | null;
  google_maps_raw: Record<string, unknown> | null;
  latitude: number | null;
  longitude: number | null;
  notes_summary: string | null;
  date_added: string;
  last_contacted_date: string | null;
  next_follow_up_date: string | null;
  branch_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  name: string;
  created_at: string;
}

export interface Contact {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  company_id: string;
  contact_id: string | null;
  activity_type: ActivityType;
  activity_date: string;
  notes: string | null;
  follow_up_date: string | null;
  created_at: string;
}

export interface Note {
  id: string;
  company_id: string;
  content: string;
  created_at: string;
}

export interface CompanyStats {
  company_id: string;
  total_contacts: number;
  email_count: number;
  call_count: number;
  visit_count: number;
  other_count: number;
  total_activities: number;
}

export interface CompanyWithStats extends Company {
  company_stats: CompanyStats | null;
  contacts?: { count: number }[];
}

export interface UserSettings {
  user_id: string;
  default_follow_up_days: number;
  email_digest_enabled: boolean;
  email_digest_frequency: "daily" | "weekly";
  email_digest_day_of_week: number | null;
  email_digest_time: string;
  email_digest_timezone: string;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_USER_SETTINGS: Omit<UserSettings, "user_id" | "created_at" | "updated_at"> = {
  default_follow_up_days: 7,
  email_digest_enabled: false,
  email_digest_frequency: "daily",
  email_digest_day_of_week: 1,
  email_digest_time: "09:00",
  email_digest_timezone: "America/New_York",
};

export const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HT)" },
  { value: "UTC", label: "UTC" },
];

export type LoadStatus =
  | "Quoted"
  | "Ordered"
  | "Pickup Scheduled"
  | "Picked Up"
  | "Delivery Scheduled"
  | "Delivered"
  | "Cancelled";

export const LOAD_STATUSES: LoadStatus[] = [
  "Quoted",
  "Ordered",
  "Pickup Scheduled",
  "Picked Up",
  "Delivery Scheduled",
  "Delivered",
  "Cancelled",
];

export type LoadSize = "Full" | "Partial";
export const LOAD_SIZES: LoadSize[] = ["Full", "Partial"];
export const EQUIPMENT_LENGTHS = ["26'", "48'", "53'"] as const;
export type EquipmentLength = (typeof EQUIPMENT_LENGTHS)[number];

export interface Location {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  public_notes: string | null;
  private_notes: string | null;
  location_type_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommodityType {
  id: string;
  name: string;
  created_at: string;
}

export interface PieceType {
  id: string;
  name: string;
  created_at: string;
}

export interface LoadLineItemType {
  id: string;
  name: string;
  created_at: string;
}

export interface Load {
  id: string;
  load_number: number;
  customer_id: string | null;
  carrier_id: string | null;
  equipment_type_id: string | null;
  equipment_length: string | null;
  commodity_type_id: string | null;
  pickup_location_id: string | null;
  delivery_location_id: string | null;
  pickup_date: string | null;
  pickup_date_end: string | null;
  pickup_time_start: string | null;
  pickup_time_end: string | null;
  delivery_date: string | null;
  delivery_date_end: string | null;
  delivery_time_start: string | null;
  delivery_time_end: string | null;
  status: LoadStatus;
  commodity: string | null;
  weight: number | null;
  pieces: number | null;
  load_size: LoadSize | null;
  declared_value: number | null;
  po_number: string | null;
  bol_number: string | null;
  freight_charge_terms: "Prepaid" | "Collect" | "3rd Party" | null;
  carrier_pay_status: PayStatus | null;
  pgl_pay_status: PayStatus | null;
  driver_name: string | null;
  driver_phone: string | null;
  customer_rate: number | null;
  carrier_cost: number | null;
  margin: number | null;
  public_notes: string | null;
  private_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type LoadDocumentType = "Load Confirmation" | "POD" | "Carrier Invoice" | "Other";
export const LOAD_DOCUMENT_TYPES: LoadDocumentType[] = ["Load Confirmation", "POD", "Carrier Invoice", "Other"];

export interface LoadDocument {
  id: string;
  load_id: string;
  document_type: LoadDocumentType;
  description: string | null;
  file_name: string;
  file_path: string;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface LoadReference {
  id: string;
  load_id: string;
  label: string;
  value: string;
  sort_order: number;
}

export interface LoadHandlingUnit {
  id: string;
  load_id: string;
  piece_type_id: string | null;
  quantity: number;
  sort_order: number;
}

export interface LoadLineItem {
  id: string;
  load_id: string;
  type_id: string | null;
  side: "income" | "expense";
  quantity: number;
  amount: number;
  notes: string | null;
  include_on_paperwork: boolean;
  sort_order: number;
}

export type TmsBillingCycle = "Per Load" | "Weekly" | "Bi-Weekly" | "Monthly";
export const TMS_BILLING_CYCLES: TmsBillingCycle[] = ["Per Load", "Weekly", "Bi-Weekly", "Monthly"];
export type TmsPaymentMethod = "ACH" | "Check" | "QuickBooks Portal";
export const TMS_PAYMENT_METHODS: TmsPaymentMethod[] = ["ACH", "Check", "QuickBooks Portal"];
export type PayStatus = "Invoiced" | "Paid" | "N/A";
export const PAY_STATUSES: PayStatus[] = ["Invoiced", "Paid", "N/A"];

export interface TmsCustomerContact {
  id: string;
  tms_customer_id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export interface TmsCustomer {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  billing_cycle: TmsBillingCycle | null;
  payment_method: TmsPaymentMethod | null;
  credit_limit: number | null;
  accounting_contact_name: string | null;
  accounting_contact_email: string | null;
  accounting_contact_phone: string | null;
  notes: string | null;
  imported_from_company_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoadStop {
  id: string;
  load_id: string;
  stop_type: "Pickup" | "Delivery";
  sequence: number;
  location_id: string | null;
  date_start: string | null;
  date_end: string | null;
  time_start: string | null;
  time_end: string | null;
  notes: string | null;
  contact_name: string | null;
  contact_phone: string | null;
}

export interface LoadNote {
  id: string;
  load_id: string;
  content: string;
  created_at: string;
}

export type CarrierStatus = "Active" | "Inactive" | "Do Not Use";
export type CarrierContactPosition = "Owner" | "Dispatch" | "Accounting" | "Management" | "Driver";
export type CarrierDocumentType = "Carrier Packet" | "MC Certificate" | "W-9" | "COI" | "NOA / ACH" | "Other";

export interface CompanyStatusHistory {
  id: string;
  company_id: string;
  from_status: CompanyStatus | null;
  to_status: CompanyStatus;
  changed_at: string;
}

export const CARRIER_STATUSES: CarrierStatus[] = ["Active", "Inactive", "Do Not Use"];
export const CARRIER_CONTACT_POSITIONS: CarrierContactPosition[] = [
  "Owner",
  "Dispatch",
  "Accounting",
  "Management",
  "Driver",
];
export const CARRIER_DOCUMENT_TYPES: CarrierDocumentType[] = [
  "Carrier Packet",
  "MC Certificate",
  "W-9",
  "COI",
  "NOA / ACH",
  "Other",
];

export type CarrierPaymentMethod = "Factoring" | "ACH";
export const CARRIER_PAYMENT_METHODS: CarrierPaymentMethod[] = ["Factoring", "ACH"];

export interface FactoringCompany {
  id: string;
  name: string;
  created_at: string;
}

export interface Carrier {
  id: string;
  name: string;
  mc_number: string | null;
  dot_number: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
  phone: string | null;
  email: string | null;
  tax_id: string | null;
  insurance_expiration: string | null;
  status: CarrierStatus;
  payment_method: CarrierPaymentMethod | null;
  factoring_company_id: string | null;
  public_notes: string | null;
  private_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EquipmentType {
  id: string;
  name: string;
  created_at: string;
}

export interface CarrierContact {
  id: string;
  carrier_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  position: CarrierContactPosition;
  created_at: string;
  updated_at: string;
}

export interface CarrierDocument {
  id: string;
  carrier_id: string;
  document_type: CarrierDocumentType;
  description: string | null;
  file_name: string;
  file_path: string;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface LocationType {
  id: string;
  name: string;
  created_at: string;
}

export interface LocationContact {
  id: string;
  location_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface CarrierNote {
  id: string;
  carrier_id: string;
  content: string;
  created_at: string;
}

export interface CarrierStats {
  carrier_id: string;
  total_loads: number;
  last_used: string | null;
  avg_rating: number | null;
  rating_count: number;
}

export interface CarrierRating {
  id: string;
  carrier_id: string;
  load_id: string | null;
  stars: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface NotepadEntry {
  id: string;
  content: string;
  done: boolean;
  created_at: string;
}

export interface NotepadFreeform {
  content: string;
  updated_at: string;
}

export const DAY_OF_WEEK_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export const COMPANY_STATUSES: CompanyStatus[] = [
  "Cold",
  "Warm",
  "Quoting",
  "Customer",
];

export const ACTIVITY_TYPES: ActivityType[] = [
  "Email",
  "Call",
  "In-Person Visit",
  "Quoted",
  "Work Received",
  "Other",
];
