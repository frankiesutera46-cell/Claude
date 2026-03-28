export type SheetStatus = 'pending' | 'processing' | 'complete' | 'error';

export interface DrawingSheet {
  id: string;
  projectId: string;
  filename: string;
  originalPath: string;
  imagePath?: string;
  pageNumber: number;
  status: SheetStatus;
  errorMessage?: string;
  createdAt: string;
}
