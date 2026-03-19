import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, of } from 'rxjs';
import { ApiService } from './api.service';

export interface UserData {
  uid: string;
  jwt: string;
  name: string;
  email: string;
  verified: boolean;
  master: boolean;
  admin: boolean;
}

interface UserState {
  users: UserData[];
  activeUid: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly api = inject(ApiService);
  private readonly storageKey = 'users_state';
  private readonly usersSubject = new BehaviorSubject<UserData[]>([]);
  private readonly activeUidSubject = new BehaviorSubject<string | null>(null);

  public readonly users$ = this.usersSubject.asObservable();
  public readonly activeUid$ = this.activeUidSubject.asObservable();

  constructor() {
    this.loadFromStorage();
  }

  public getUsers(): UserData[] {
    return this.usersSubject.value;
  }

  public getActiveUid(): string | null {
    return this.activeUidSubject.value;
  }

  public getActiveUser(): UserData | null {
    const activeUid = this.activeUidSubject.value;
    if (!activeUid) {
      return null;
    }

    return this.usersSubject.value.find((user) => user.uid === activeUid) ?? null;
  }

  public isLoggedIn(): boolean {
    return this.getActiveUser() !== null;
  }

  public hasMasterAccess(): boolean {
    const activeUser = this.getActiveUser();
    return activeUser ? (activeUser.master || activeUser.admin) : false;
  }

  public hasAdminAccess(): boolean {
    const activeUser = this.getActiveUser();
    return activeUser ? activeUser.admin : false;
  }

  public getUserByUid(uid: string): UserData | null {
    return this.usersSubject.value.find((user) => user.uid === uid) ?? null;
  }

  public saveUser(user: UserData, setAsActive = false): void {
    if (!this.isValidUser(user)) {
      return;
    }

    const users = [...this.usersSubject.value];
    const index = users.findIndex((item) => item.uid === user.uid);

    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }

    const shouldSetActive = setAsActive || !this.activeUidSubject.value;
    const activeUid = shouldSetActive ? user.uid : this.activeUidSubject.value;

    this.updateState(users, activeUid);
  }

  public setActiveUser(uid: string): boolean {
    const userExists = this.usersSubject.value.some((user) => user.uid === uid);
    if (!userExists) {
      return false;
    }

    this.updateState(this.usersSubject.value, uid);
    return true;
  }

  public removeUser(uid: string): void {
    const users = this.usersSubject.value.filter((user) => user.uid !== uid);
    const activeUid = this.activeUidSubject.value === uid ? users[0]?.uid ?? null : this.activeUidSubject.value;

    this.updateState(users, activeUid);
  }

  public loginPassword(user: string, password: string): Observable<boolean> {
    return this.api.post<unknown, { user: string; password: string }>(
      'login',
      { user, password }
    ).pipe(
      map(() => {
        // TODO: Procesar y guardar el payload real cuando se defina la respuesta del endpoint.
        return true;
      }),
      catchError(() => of(false))
    );
  }

  public logout(uid?: string): void {
    const targetUid = uid ?? this.activeUidSubject.value;
    if (!targetUid) {
      return;
    }

    const users = this.usersSubject.value.filter((user) => user.uid !== targetUid);
    const activeUid = this.activeUidSubject.value === targetUid ? users[0]?.uid ?? null : this.activeUidSubject.value;

    this.updateState(users, activeUid);
  }

  public clearActiveUser(): void {
    this.updateState(this.usersSubject.value, null);
  }

  public clearUsers(): void {
    this.updateState([], null);
  }

  private loadFromStorage(): void {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<UserState>;
      const users = Array.isArray(parsed.users)
        ? parsed.users.filter((user): user is UserData => this.isValidUser(user))
        : [];

      const activeUid =
        typeof parsed.activeUid === 'string' && users.some((user) => user.uid === parsed.activeUid)
          ? parsed.activeUid
          : users[0]?.uid ?? null;

      this.updateState(users, activeUid);
    } catch {
      this.updateState([], null);
    }
  }

  private updateState(users: UserData[], activeUid: string | null): void {
    const validActiveUid = activeUid && users.some((user) => user.uid === activeUid) ? activeUid : (users.length > 0 ? users[0].uid : null);
    const orderedUsers = this.orderUsersByLastActive(users, validActiveUid);
    const state: UserState = {
      users: orderedUsers,
      activeUid: validActiveUid,
    };

    this.usersSubject.next(orderedUsers);
    this.activeUidSubject.next(validActiveUid);
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  private orderUsersByLastActive(users: UserData[], activeUid: string | null): UserData[] {
    if (!activeUid) {
      return [...users];
    }

    const activeUser = users.find((user) => user.uid === activeUid);
    if (!activeUser) {
      return [...users];
    }

    return [activeUser, ...users.filter((user) => user.uid !== activeUid)];
  }

  private isValidUser(user: unknown): user is UserData {
    if (!user || typeof user !== 'object') {
      return false;
    }

    const candidate = user as Record<string, unknown>;

    return (
      typeof candidate['uid'] === 'string' &&
      typeof candidate['jwt'] === 'string' &&
      typeof candidate['name'] === 'string' &&
      typeof candidate['email'] === 'string' &&
      typeof candidate['verified'] === 'boolean' &&
      typeof candidate['master'] === 'boolean' &&
      typeof candidate['admin'] === 'boolean'
    );
  }
}