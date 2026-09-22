import type { Bench, Member, PatrolOrder } from '@/types';

const BENCH_STORAGE_KEY = 'bench-archive-data';
const MEMBER_STORAGE_KEY = 'bench-archive-members';
const PATROL_STORAGE_KEY = 'bench-archive-patrols';

/* ---------------- 长椅档案 ---------------- */

export function loadBenches(): Bench[] {
  try {
    const data = localStorage.getItem(BENCH_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load benches from localStorage:', error);
  }
  return [];
}

export function saveBenches(benches: Bench[]): void {
  try {
    localStorage.setItem(BENCH_STORAGE_KEY, JSON.stringify(benches));
  } catch (error) {
    console.error('Failed to save benches to localStorage:', error);
  }
}

export function clearBenches(): void {
  try {
    localStorage.removeItem(BENCH_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear benches from localStorage:', error);
  }
}

/* ---------------- 巡护成员 ---------------- */

export function loadMembers(): Member[] {
  try {
    const data = localStorage.getItem(MEMBER_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load members from localStorage:', error);
  }
  return [];
}

export function saveMembers(members: Member[]): void {
  try {
    localStorage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(members));
  } catch (error) {
    console.error('Failed to save members to localStorage:', error);
  }
}

/* ---------------- 巡护单 ---------------- */

export function loadPatrols(): PatrolOrder[] {
  try {
    const data = localStorage.getItem(PATROL_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load patrols from localStorage:', error);
  }
  return [];
}

export function savePatrols(patrols: PatrolOrder[]): void {
  try {
    localStorage.setItem(PATROL_STORAGE_KEY, JSON.stringify(patrols));
  } catch (error) {
    console.error('Failed to save patrols to localStorage:', error);
  }
}
