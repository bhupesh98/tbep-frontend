import type { ColumnDef } from '@tanstack/react-table';

/**
 * Props for the data table in the popup
 * @interface PopUpDataTableProps<E,F>
 */
export interface PopUpDataTableProps<E, F> {
  /**
   * Title of the dialog
   */
  dialogTitle?: string;

  /**
   * Data to be displayed in the table
   * @inheritdoc SelectedNodeProperty
   */
  data: [E[], F[]];

  /**
   * Loading state of the data table
   */
  loading?: [boolean, boolean];

  /**
   * Columns for the data table
   */
  columns: [ColumnDef<E>[], ColumnDef<F>[]];

  /**
   * State of the popup
   */
  open: boolean;

  /**
   * Function to set the open state of the popup
   */
  setOpen: (open: boolean) => void;

  /**
   * Array of tabs title
   */
  tabsTitle?: [string, string];

  /**
   * Array of column names to filter
   * One column name for each table
   */
  filterColumnNames?: [string | string[], string | string[]];

  /**
   * Description of the dialog
   */
  description: React.ReactNode;
}
