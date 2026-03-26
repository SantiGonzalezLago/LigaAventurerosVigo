import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { StorageService, USERS_STATE_STORAGE_KEY } from './storage.service';

export type QueryParams = Record<string, string | number | boolean | null | undefined>;
export type RequestHeaders = Record<string, string | string[]>;
export type UploadFiles = Record<string, File | Blob | Array<File | Blob>>;
export type UploadData = Record<string, string | number | boolean | null | undefined | object>;

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl = `${environment.api.replace(/\/+$/, '')}/v1`;
  private readonly storageKey = USERS_STATE_STORAGE_KEY;
  private readonly storage = inject(StorageService);

  constructor(private readonly http: HttpClient) {}

  public get<T>(
    endpoint: string,
    params?: QueryParams,
    headers?: RequestHeaders
  ): Observable<T> {
    const url = this.buildUrl(endpoint);

    return this.http.get<T>(url, {
      params: this.toHttpParams(params),
      headers: this.toHttpHeaders(this.resolveRequestHeaders(headers, url)),
    });
  }

  public post<T, TBody = unknown>(
    endpoint: string,
    body: TBody,
    params?: QueryParams,
    headers?: RequestHeaders
  ): Observable<T> {
    const url = this.buildUrl(endpoint);

    return this.http.post<T>(url, body, {
      params: this.toHttpParams(params),
      headers: this.toHttpHeaders(this.resolveRequestHeaders(headers, url)),
    });
  }

  public postWithFiles<T, TBody extends UploadData = UploadData>(
    endpoint: string,
    body: TBody,
    files: UploadFiles,
    params?: QueryParams,
    headers?: RequestHeaders
  ): Observable<T> {
    const formData = new FormData();

    for (const [key, value] of Object.entries(body)) {
      this.appendData(formData, key, value);
    }

    for (const [fieldName, fieldValue] of Object.entries(files)) {
      if (Array.isArray(fieldValue)) {
        fieldValue.forEach((file) => formData.append(fieldName, file));
      } else {
        formData.append(fieldName, fieldValue);
      }
    }

    const url = this.buildUrl(endpoint);

    return this.http.post<T>(url, formData, {
      params: this.toHttpParams(params),
      headers: this.toHttpHeaders(this.resolveRequestHeaders(headers, url)),
    });
  }

  private resolveRequestHeaders(headers: RequestHeaders | undefined, url: string): RequestHeaders | undefined {
    if (!this.isInternalApiUrl(url) || this.hasAuthorizationHeader(headers)) {
      return headers;
    }

    const jwt = this.getActiveUserJwt();
    if (!jwt) {
      return headers;
    }

    return {
      ...(headers ?? {}),
      Authorization: `Bearer ${jwt}`,
    };
  }

  private isInternalApiUrl(url: string): boolean {
    return url.startsWith(this.baseUrl);
  }

  private hasAuthorizationHeader(headers?: RequestHeaders): boolean {
    if (!headers) {
      return false;
    }

    return Object.keys(headers).some((key) => key.toLowerCase() === 'authorization');
  }

  private getActiveUserJwt(): string | null {
    const parsed = this.storage.getJson<{
      users?: Array<{ uid?: unknown; jwt?: unknown }>;
      activeUid?: unknown;
    }>(this.storageKey);

    if (!parsed) {
      return null;
    }

    const users = Array.isArray(parsed.users) ? parsed.users : [];
    if (users.length === 0) {
      return null;
    }

    const activeUid = typeof parsed.activeUid === 'string' ? parsed.activeUid : null;
    const activeUser = activeUid
      ? users.find((user) => typeof user.uid === 'string' && user.uid === activeUid)
      : users[0];

    const jwt = activeUser?.jwt;
    return typeof jwt === 'string' && jwt.trim() ? jwt : null;
  }

  private buildUrl(endpoint: string): string {
    if (/^https?:\/\//i.test(endpoint)) {
      return endpoint;
    }

    const cleanEndpoint = endpoint.replace(/^\/+/, '');
    return `${this.baseUrl}/${cleanEndpoint}`;
  }

  private toHttpParams(params?: QueryParams): HttpParams | undefined {
    if (!params) {
      return undefined;
    }

    let httpParams = new HttpParams();

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) {
        continue;
      }

      httpParams = httpParams.set(key, String(value));
    }

    return httpParams;
  }

  private toHttpHeaders(headers?: RequestHeaders): HttpHeaders | undefined {
    if (!headers) {
      return undefined;
    }

    let httpHeaders = new HttpHeaders();

    for (const [key, value] of Object.entries(headers)) {
      httpHeaders = httpHeaders.set(key, value);
    }

    return httpHeaders;
  }

  private appendData(formData: FormData, key: string, value: UploadData[string]): void {
    if (value === undefined || value === null) {
      return;
    }

    if (typeof value === 'object') {
      formData.append(key, JSON.stringify(value));
      return;
    }

    formData.append(key, String(value));
  }
}
