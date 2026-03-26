import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, catchError, distinctUntilChanged, map, Observable, of, take } from 'rxjs';
import { ApiService } from './api.service';
import { StorageService, USERS_STATE_STORAGE_KEY } from './storage.service';

export interface UserData {
  uid: string;
  jwt: string;
  name: string;
  email: string;
  avatar: string | null;
  verified: boolean;
  master: boolean;
  admin: boolean;
}

interface UserState {
  users: UserData[];
  activeUid: string | null;
}

export interface LoginResult {
  success: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly api = inject(ApiService);
  private readonly storage = inject(StorageService);
  private readonly storageKey = USERS_STATE_STORAGE_KEY;
  private readonly usersSubject = new BehaviorSubject<UserData[]>([]);
  private readonly activeUidSubject = new BehaviorSubject<string | null>(null);
  private googleClientId: string | null = null;

  public readonly users$ = this.usersSubject.asObservable();
  public readonly activeUid$ = this.activeUidSubject.asObservable().pipe(distinctUntilChanged());

  constructor() {
    this.loadFromStorage();

    const activeUid = this.activeUidSubject.value;
    if (activeUid) {
      this.refreshUser(activeUid).pipe(take(1)).subscribe();
    }
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
    this.refreshUser(uid).pipe(take(1)).subscribe();
    return true;
  }

  public refreshUser(uid: string): Observable<void> {
    const user = this.getUserByUid(uid);
    if (!user) {
      return of(undefined);
    }

    return this.api.get<{ message: string; user: UserData }>('me').pipe(
      map((response) => {
        if (this.isValidUser(response.user)) {
          this.saveUser(response.user);
        }
      }),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
          this.logout(uid);
        }

        return of(undefined);
      })
    );
  }

  public removeUser(uid: string): void {
    const users = this.usersSubject.value.filter((user) => user.uid !== uid);
    const activeUid = this.activeUidSubject.value === uid ? users[0]?.uid ?? null : this.activeUidSubject.value;

    this.updateState(users, activeUid);
  }

  public loginPassword(user: string, password: string): Observable<LoginResult> {
    return this.api.post<{ message: string; user: UserData }, { user: string; password: string }>(
      'login',
      { user, password }
    ).pipe(
      map((response) => {
        if (!this.isValidUser(response.user)) {
          return {
            success: false,
            message: 'Respuesta de usuario inválida',
          };
        }

        this.saveUser(response.user, true);

        return { success: true };
      }),
      catchError((error: unknown) => of({
        success: false,
        message: this.extractErrorMessage(error),
      }))
    );
  }

  public getGoogleClientId(forceRefresh = false): Observable<string> {
    if (!forceRefresh && this.googleClientId) {
      return of(this.googleClientId);
    }

    return this.api.get<{ message: string; google_client_id?: string }>('login/google').pipe(
      map((response) => {
        const clientId = typeof response.google_client_id === 'string' ? response.google_client_id.trim() : '';

        if (!clientId) {
          throw new Error('Google OAuth no está configurado');
        }

        this.googleClientId = clientId;
        return clientId;
      })
    );
  }

  public loginGoogle(idToken: string): Observable<LoginResult> {
    const normalizedToken = idToken.trim();
    if (!normalizedToken) {
      return of({
        success: false,
        message: 'El token de Google es obligatorio',
      });
    }

    return this.api.post<{ message: string; user: UserData }, { id_token: string }>(
      'login/google',
      { id_token: normalizedToken }
    ).pipe(
      map((response) => {
        if (!this.isValidUser(response.user)) {
          return {
            success: false,
            message: 'Respuesta de usuario inválida',
          };
        }

        this.saveUser(response.user, true);

        return { success: true };
      }),
      catchError((error: unknown) => of({
        success: false,
        message: this.extractErrorMessage(error),
      }))
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
    const parsed = this.storage.getJson<Partial<UserState>>(this.storageKey);
    if (!parsed) {
      return;
    }

    const users = Array.isArray(parsed.users)
      ? parsed.users.filter((user): user is UserData => this.isValidUser(user))
      : [];

    const activeUid =
      typeof parsed.activeUid === 'string' && users.some((user) => user.uid === parsed.activeUid)
        ? parsed.activeUid
        : users[0]?.uid ?? null;

    this.updateState(users, activeUid);
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
    this.storage.setJson(this.storageKey, state);
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
      (typeof candidate['avatar'] === 'string' || candidate['avatar'] === null) &&
      typeof candidate['verified'] === 'boolean' &&
      typeof candidate['master'] === 'boolean' &&
      typeof candidate['admin'] === 'boolean'
    );
  }

  private extractErrorMessage(error: unknown): string | undefined {
    if (!(error instanceof HttpErrorResponse)) {
      return undefined;
    }

    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (!error.error || typeof error.error !== 'object') {
      return undefined;
    }

    const payload = error.error as Record<string, unknown>;
    const errorText = payload['error'];

    if (typeof errorText === 'string' && errorText.trim()) {
      return errorText;
    }

    const message = payload['message'];

    return typeof message === 'string' && message.trim() ? message : undefined;
  }
}