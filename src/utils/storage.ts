import type { Bench, PatrolOrder } from '@/types';

const STORAGE_KEY = 'bench-archive-data';
const PATROL_STORAGE_KEY = 'bench-patrol-orders';

export function loadBenches(): Bench[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(benches));
  } catch (error) {
    console.error('Failed to save benches to localStorage:', error);
  }
}

export function clearBenches(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear benches from localStorage:', error);
  }
}

export function loadPatrolOrders(): PatrolOrder[] {
  try {
    const data = localStorage.getItem(PATROL_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load patrol orders from localStorage:', error);
  }
  return [];
}

export function savePatrolOrders(orders: PatrolOrder[]): void {
  try {
    localStorage.setItem(PATROL_STORAGE_KEY, JSON.stringify(orders));
  } catch (error) {
    console.error('Failed to save patrol orders to localStorage:', error);
  }
}
