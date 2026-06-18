import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';

interface DbData {
  projects: Record<string, any>;
  drawing_sheets: Record<string, any>;
  rebar_items: Record<string, any>;
}

let data: DbData | null = null;
const dbFile = config.dbPath.replace('.db', '.json');

function load(): DbData {
  if (data) return data;
  if (fs.existsSync(dbFile)) {
    data = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
  } else {
    data = { projects: {}, drawing_sheets: {}, rebar_items: {} };
  }
  return data!;
}

function save(): void {
  const d = load();
  fs.writeFileSync(dbFile, JSON.stringify(d, null, 2));
}

export const db = {
  // Projects
  getProjects(): any[] {
    const d = load();
    return Object.values(d.projects).sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  getProject(id: string): any | null {
    return load().projects[id] || null;
  },

  createProject(project: any): void {
    load().projects[project.id] = { ...project, created_at: project.created_at || new Date().toISOString(), updated_at: new Date().toISOString() };
    save();
  },

  deleteProject(id: string): boolean {
    const d = load();
    if (!d.projects[id]) return false;
    delete d.projects[id];
    // Cascade delete
    for (const [sid, sheet] of Object.entries(d.drawing_sheets)) {
      if ((sheet as any).project_id === id) delete d.drawing_sheets[sid];
    }
    for (const [rid, item] of Object.entries(d.rebar_items)) {
      if ((item as any).project_id === id) delete d.rebar_items[rid];
    }
    save();
    return true;
  },

  // Drawing Sheets
  getSheets(projectId: string): any[] {
    return Object.values(load().drawing_sheets)
      .filter((s: any) => s.project_id === projectId)
      .sort((a: any, b: any) => a.page_number - b.page_number);
  },

  getSheet(id: string): any | null {
    return load().drawing_sheets[id] || null;
  },

  createSheet(sheet: any): void {
    load().drawing_sheets[sheet.id] = sheet;
    save();
  },

  updateSheet(id: string, updates: any): void {
    const d = load();
    if (d.drawing_sheets[id]) {
      Object.assign(d.drawing_sheets[id], updates);
      save();
    }
  },

  // Rebar Items
  getRebarItems(projectId: string): any[] {
    return Object.values(load().rebar_items)
      .filter((r: any) => r.project_id === projectId)
      .sort((a: any, b: any) => (a.bar_mark || '').localeCompare(b.bar_mark || ''));
  },

  getRebarItem(id: string): any | null {
    return load().rebar_items[id] || null;
  },

  createRebarItem(item: any): void {
    load().rebar_items[item.id] = { ...item, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    save();
  },

  updateRebarItem(id: string, updates: any): any | null {
    const d = load();
    if (!d.rebar_items[id]) return null;
    Object.assign(d.rebar_items[id], updates, { updated_at: new Date().toISOString(), source: 'manual' });
    save();
    return d.rebar_items[id];
  },

  deleteRebarItem(id: string): boolean {
    const d = load();
    if (!d.rebar_items[id]) return false;
    delete d.rebar_items[id];
    save();
    return true;
  },

  // Counts
  getProjectSheetCount(projectId: string): number {
    return Object.values(load().drawing_sheets).filter((s: any) => s.project_id === projectId).length;
  },

  getProjectItemCount(projectId: string): number {
    return Object.values(load().rebar_items).filter((r: any) => r.project_id === projectId).length;
  },
};
