import { Injectable } from '@angular/core';

export const USERS_STATE_STORAGE_KEY = 'users_state';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  public getItem(key: string): string | null {
    return localStorage.getItem(key);
  }

  public setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  public removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  public getJson<T>(key: string): T | null {
    const raw = this.getItem(key);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  public setJson<T>(key: string, value: T): void {
    this.setItem(key, JSON.stringify(value));
  }
}
