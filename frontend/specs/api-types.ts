import type { BusinessType, Category, OperationType } from "../src/lib/financial-types";

/** Available filter values and the dataset date range. */
export interface FacetsResponse {
  /** Available operation types: income or outcome. */
  operation_types: OperationType[];
  /** Available business types: B2B or B2C. */
  business_types: BusinessType[];
  /** Available categories: suppliers, sales, operational, administrative or others. */
  categories: Category[];
  /** Earliest available date in YYYY-MM-DD format. */
  min_date: string;
  /** Latest available date in YYYY-MM-DD format. */
  max_date: string;
}

/** An outcome alert returned by the API. */
export interface AlertEntry {
  /** Period label: YYYY-MM-DD, YYYY-Www or YYYY-MM, according to the grouping. */
  period: string;
  /** Total outcome amount for the period. */
  outcome_total: number;
  /** Historical average outcome across available preceding periods, not necessarily three. */
  baseline_average: number;
  /** Increase over the baseline as a ratio; multiply by 100 to display a percentage. */
  increase_ratio: number;
}

/** Direct array response from the alerts endpoint. */
export type AlertsResponse = AlertEntry[];

/** A category total returned by the top categories endpoint. */
export interface CategoryEntry {
  /** Category: suppliers, sales, operational, administrative or others. */
  category: Category;
  /** Operation type included in the total: income or outcome. */
  operation_type: OperationType;
  /** Total amount for the category and operation type. */
  total_amount: number;
}

/** Direct array response from the top categories endpoint. */
export type TopCategoriesResponse = CategoryEntry[];