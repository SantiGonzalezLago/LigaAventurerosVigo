import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export type QueryParams = Record<string, string | number | boolean | null | undefined>;
export type RequestHeaders = Record<string, string | string[]>;
export type UploadFiles = Record<string, File | Blob | Array<File | Blob>>;
export type UploadData = Record<string, string | number | boolean | null | undefined | object>;

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl = `${environment.api.replace(/\/+$/, '')}/v1`;

  constructor(private readonly http: HttpClient) {}

  public get<T>(
    endpoint: string,
    params?: QueryParams,
    headers?: RequestHeaders
  ): Observable<T> {
    return this.http.get<T>(this.buildUrl(endpoint), {
      params: this.toHttpParams(params),
      headers: this.toHttpHeaders(headers),
    });
  }

  public post<T, TBody = unknown>(
    endpoint: string,
    body: TBody,
    params?: QueryParams,
    headers?: RequestHeaders
  ): Observable<T> {
    console.log('POST', this.buildUrl(endpoint), { body, params, headers });
    return this.http.post<T>(this.buildUrl(endpoint), body, {
      params: this.toHttpParams(params),
      headers: this.toHttpHeaders(headers),
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

    return this.http.post<T>(this.buildUrl(endpoint), formData, {
      params: this.toHttpParams(params),
      headers: this.toHttpHeaders(headers),
    });
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
