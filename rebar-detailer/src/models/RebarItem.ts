import { z } from 'zod';

export const BarSizes = [3, 4, 5, 6, 7, 8, 9, 10, 11, 14, 18] as const;
export type BarSize = (typeof BarSizes)[number];

export const ShapeCodes = ['00', '11', '12', '13', '21', '22', '23', '31', '32', '41', '44', '51', '52', '56', '63', '67', '75', '77', '98', '99'] as const;
export type ShapeCode = (typeof ShapeCodes)[number];

export const HookTypes = ['90', '135', '180'] as const;
export type HookType = (typeof HookTypes)[number];

export const CoatingTypes = ['none', 'epoxy', 'galvanized'] as const;
export type CoatingType = (typeof CoatingTypes)[number];

export const SourceTypes = ['claude', 'ocr', 'manual'] as const;
export type SourceType = (typeof SourceTypes)[number];

export const RebarItemSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  sheetId: z.string(),
  barMark: z.string(),
  barSize: z.number().refine((n) => BarSizes.includes(n as BarSize)),
  shapeCode: z.string().default('00'),
  totalLength: z.number().optional(),
  dimensions: z.object({
    a: z.number().optional(),
    b: z.number().optional(),
    c: z.number().optional(),
    d: z.number().optional(),
    e: z.number().optional(),
    hookType: z.enum(HookTypes).optional(),
  }).default({}),
  quantity: z.number().int().min(1).default(1),
  spacing: z.number().optional(),
  structuralElement: z.string().default(''),
  zone: z.string().optional(),
  grade: z.number().default(60),
  coating: z.enum(CoatingTypes).default('none'),
  notes: z.string().optional(),
  confidence: z.number().min(0).max(1).default(1),
  source: z.enum(SourceTypes).default('manual'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type RebarItem = z.infer<typeof RebarItemSchema>;

export const CreateRebarItemSchema = RebarItemSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateRebarItem = z.infer<typeof CreateRebarItemSchema>;
