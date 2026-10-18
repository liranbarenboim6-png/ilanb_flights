export type Category = 'cancellation'|'delay'|'refund'|'baggage'|'extra_charge'|'misleading'|'booking'|'agency'|'package'|'service'|'other';
export type Status = 'new'|'reviewing'|'reviewed'|'missing_info'|'recurring'|'legal_review'|'in_progress'|'closed';
export type Role = 'administrator'|'reviewer';
export type CompanyType = 'airline'|'agency'|'hotel'|'booking_site'|'package_operator'|'other';
export interface ReportInput {
  primaryCategory: Category; secondaryCategories: Category[];
  companies: { name:string; companyType:CompanyType; role:string }[];
  bookingChannel: 'direct'|'intermediary'; intermediaryName?:string;
  bookingDate?:string; incidentDate:string; bookingReference?:string;
  passengerCount:number;
  flight: { flightNumber?:string; originAirport?:string; destinationAirport?:string; scheduledDeparture?:string; actualDeparture?:string; scheduledArrival?:string; actualArrival?:string };
  description:string; expectedService?:string; actualOutcome?:string;
  companyContacted:boolean; companyContactDate?:string; companyResponse?:string; resolved:boolean; resolution?:string;
  purchaseAmount?:number; extraChargeAmount?:number; requestedRefundAmount?:number; receivedRefundAmount?:number; additionalClaimedLoss?:number; currency:'ILS'|'USD'|'EUR'|'GBP'|'other';
  dynamicAnswers: Record<string, string|number|boolean>;
  reporter: {fullName:string; email:string; phone:string; isPassenger:boolean; relationship?:string};
  consents: {privacy:boolean; legalContact:boolean; updates:boolean};
  honeypot?:string; startedAt:number; idempotencyKey:string;
}
export interface EvidenceRecord { id:string; originalFilename:string; fileType:string; fileSize:number; storagePath:string; createdAt:string }
export interface Activity { id:string; adminUserId:string; activityType:string; note:string; createdAt:string }
export interface ReportRecord extends ReportInput {
  id:string; publicReference:string; status:Status; createdAt:string; updatedAt:string;
  evidence:EvidenceRecord[]; activities:Activity[]; duplicateOf?:string; relatedReportIds:string[];
}
export interface AdminSession {id:string; email:string; role:Role; mode:'emulator'|'firebase'; aal?:string}
export interface CompanySummary {id:string; name:string; normalizedName:string; companyType:CompanyType; country?:string; reportCount:number; byCategory:{category:Category;count:number}[]}
export interface DashboardStats {total:number; newReports:number; inReview:number; companyCount:number; byCategory:{category:Category;count:number}[]; byCompany:{name:string;count:number}[]; monthly:{month:string;count:number}[]}

