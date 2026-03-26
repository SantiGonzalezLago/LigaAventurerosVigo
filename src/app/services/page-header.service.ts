import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PageHeaderService {
  private readonly titleSubject = new BehaviorSubject<string | null>(null);
  private readonly backLinkSubject = new BehaviorSubject<string | null>(null);

  public readonly title$ = this.titleSubject.asObservable();
  public readonly backLink$ = this.backLinkSubject.asObservable();

  public setTitle(title?: string | null | undefined, backLink?: string | null | undefined): void {
    const pageTitle = typeof title === 'string' ? title.trim() : null;
    const normalizedBackLink = typeof backLink === 'string' ? backLink.trim() : null;
    this.titleSubject.next(pageTitle);
    this.backLinkSubject.next(normalizedBackLink);
  }
}
