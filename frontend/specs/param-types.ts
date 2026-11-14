import type { BusinessType, OperationType } from "../src/lib/financial-types";

/** Optional date range query parameters. */
export interface DateRangeFilter {
  /** Optional inclusive start date in YYYY-MM-DD format; omit for no lower bound. */
  start_date?: string;
  /** Optional inclusive end date in YYYY-MM-DD format; omit for no upper bound. */
  end_date?: string;
}

/** Query parameters for the alerts endpoint. */
export interface AlertsParams extends DateRangeFilter {
  /** Optional increase ratio; defaults to 0.3. API: >= 0; PM interface: 0.01 to 1.0. */
  threshold?: number;
  /** Optional period grouping: day, week or month; defaults to month. */
  group_by?: "day" | "week" | "month";
  /** Optional business type: B2B or B2C; omit to include both. */
  business_type?: BusinessType;
}

/** Query parameters for the top categories endpoint. */
export interface TopCategoriesParams extends DateRangeFilter {
  /** Optional operation type: income or outcome; defaults to outcome. B2B/B2C uses income. */
  operation_type?: OperationType;
  /** Optional maximum count: integer from 1 to 20; defaults to 5, as requested by B2B/B2C. */
  limit?: number;
  /** Optional business type: B2B or B2C; omit to include both. */
  business_type?: BusinessType;
}