import {
  Construction, Trash2, Lightbulb, Paintbrush, Droplets, MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';

export interface CategoryDef {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'Road Damage', icon: Construction, label: 'Road Damage' },
  { id: 'Waste Issue', icon: Trash2, label: 'Waste Issue' },
  { id: 'Street Light', icon: Lightbulb, label: 'Street Light' },
  { id: 'Vandalism', icon: Paintbrush, label: 'Vandalism' },
  { id: 'Water Leak', icon: Droplets, label: 'Water Leak' },
  { id: 'Other Issue', icon: MoreHorizontal, label: 'Other Issue' },
];

export const CATEGORY_IDS = CATEGORIES.map(c => c.id);

export const STATUS_OPTIONS = ['Pending', 'Investigating', 'In Progress', 'Resolved'] as const;
export type IssueStatus = (typeof STATUS_OPTIONS)[number];

export const SEVERITY_OPTIONS = ['Low', 'Moderate', 'Critical'] as const;
export type IssueSeverity = (typeof SEVERITY_OPTIONS)[number];
