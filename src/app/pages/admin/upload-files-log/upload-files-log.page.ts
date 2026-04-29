import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { BehaviorSubject, Subject, catchError, debounceTime, distinctUntilChanged, of, take, takeUntil } from 'rxjs';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonModal, IonSearchbar, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircleOutline, closeOutline, searchOutline } from 'ionicons/icons';
import { AdminPageTemplate } from '../../../templates/admin-page.template';
import { ApiService } from '../../../services/api.service';
import { PageHeaderService } from '../../../services/page-header.service';
import { LoaderComponent } from '../../../components/loader/loader.component';
import { PaginationComponent } from '../../../components/pagination/pagination.component';
import { ErrorStateComponent } from '../../../components/error-state/error-state.component';

addIcons({ alertCircleOutline, closeOutline, searchOutline });

@Component({
  selector: 'app-upload-files-log',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonSearchbar,
    IonItem,
    IonInput,
    IonIcon,
    LoaderComponent,
    PaginationComponent,
    ErrorStateComponent,
  ],
  templateUrl: './upload-files-log.page.html',
  styleUrls: ['./upload-files-log.page.scss'],
})
export class UploadFilesLogPage extends AdminPageTemplate implements OnInit {
  private readonly api = inject(ApiService);
  private readonly pageHeaderService = inject(PageHeaderService);
  private readonly sanitizer = inject(DomSanitizer);

  private readonly stateSubject = new BehaviorSubject<any>({
    logs: [],
    pagination: {
      page: 1,
      per_page: 20,
      total: 0,
      total_pages: 0,
      order_by: 'timestamp',
      order_dir: 'desc',
      q: '',
      date_from: null,
      date_to: null,
    },
    loading: false,
    error: null,
  });

  public readonly state$ = this.stateSubject.asObservable();

  public searchDraft = '';
  public searchQuery = '';
  private readonly searchInput$ = new Subject<string>();

  public dateFrom = '';
  public dateTo = '';

  public sortBy = 'timestamp';
  public sortDir: 'asc' | 'desc' = 'desc';
  public currentPage = 1;
  public perPage = 20;
  public isPreviewModalOpen = false;
  public previewFileName = '';
  public previewFileUrl = '';
  public previewImageUrl = '';
  public previewIsImage = false;
  public previewSafeUrl: SafeResourceUrl | null = null;

  public get state() {
    return this.stateSubject.value;
  }

  override ionViewWillEnter(): void {
    super.ionViewWillEnter();
    this.pageHeaderService.setTitle('Log de subidas de ficheros', '/admin');
  }

  ngOnInit(): void {
    this.searchInput$
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil((this as any).destroy$)
      )
      .subscribe((value) => {
        this.searchQuery = value.trim();
        this.currentPage = 1;
        this.loadLogs();
      });

    this.loadLogs();
  }

  public onSearchInput(ev: Event): void {
    const value = (ev.target as HTMLInputElement).value ?? '';
    this.searchInput$.next(value);
  }

  public onDateFromChange(ev: any): void {
    this.dateFrom = ev?.detail?.value ?? '';
    this.applyFilters();
  }

  public onDateToChange(ev: any): void {
    this.dateTo = ev?.detail?.value ?? '';
    this.applyFilters();
  }

  public applyFilters(): void {
    this.currentPage = 1;
    this.loadLogs();
  }

  public onSort(column: string): void {
    if (this.sortBy === column) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDir = 'asc';
    }

    this.currentPage = 1;
    this.loadLogs();
  }

  public isSorted(column: string): boolean {
    return this.sortBy === column;
  }

  public getSortIcon(column: string): string {
    if (!this.isSorted(column)) {
      return '';
    }

    return this.sortDir === 'asc' ? '↑' : '↓';
  }

  public goToPage(page: number): void {
    if (page < 1 || page > this.state.pagination.total_pages) {
      return;
    }

    this.currentPage = page;
    this.loadLogs();
  }

  public retry(): void {
    this.currentPage = 1;
    this.loadLogs();
  }

  public canPreviewFile(log: any): boolean {
    const url = typeof log?.url === 'string' ? log.url.trim() : '';
    return !!log?.exists && !!url;
  }

  public openFilePreview(log: any): void {
    if (!this.canPreviewFile(log)) {
      return;
    }

    const normalizedUrl = this.normalizePreviewUrl(log.url);
    if (!normalizedUrl) {
      return;
    }

    this.previewFileName = typeof log.file_name === 'string' ? log.file_name : 'Fichero';
    this.previewFileUrl = normalizedUrl;
    this.previewIsImage = this.isImagePreviewUrl(normalizedUrl);
    this.previewImageUrl = this.previewIsImage ? normalizedUrl : '';
    this.previewSafeUrl = this.previewIsImage
      ? null
      : this.sanitizer.bypassSecurityTrustResourceUrl(normalizedUrl);
    this.isPreviewModalOpen = true;
  }

  public closeFilePreview(): void {
    this.isPreviewModalOpen = false;
    this.previewFileName = '';
    this.previewFileUrl = '';
    this.previewImageUrl = '';
    this.previewIsImage = false;
    this.previewSafeUrl = null;
  }

  public openPreviewInNewTab(): void {
    if (!this.previewFileUrl) {
      return;
    }

    window.open(this.previewFileUrl, '_blank', 'noopener,noreferrer');
  }

  private normalizePreviewUrl(rawUrl: unknown): string | null {
    const value = typeof rawUrl === 'string' ? rawUrl.trim() : '';
    if (!value) {
      return null;
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(value, window.location.origin);
    } catch {
      return null;
    }

    const allowedProtocols = new Set(['http:', 'https:', 'blob:']);
    if (!allowedProtocols.has(parsedUrl.protocol)) {
      return null;
    }

    return parsedUrl.toString();
  }

  public isImagePreviewUrl(rawUrl: unknown): boolean {
    const normalizedUrl = this.normalizePreviewUrl(rawUrl);
    if (!normalizedUrl) {
      return false;
    }

    const path = normalizedUrl.split('#')[0]?.split('?')[0]?.toLowerCase() ?? '';
    return /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/.test(path);
  }

  public getShortFileName(fileName: any): string {
    const name = typeof fileName === 'string' ? fileName : '';
    if (name.length <= 20) {
      return name;
    }

    return `${name.slice(0, 20)}...`;
  }

  public formatBytes(value: any): string {
    const bytes = Number(value);

    if (!Number.isFinite(bytes) || bytes < 0) {
      return '0 B';
    }

    if (bytes === 0) {
      return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const amount = bytes / 1024 ** exponent;
    const fixed = exponent === 0 ? 0 : amount >= 100 ? 0 : 1;

    return `${amount.toFixed(fixed)} ${units[exponent]}`;
  }

  private loadLogs(): void {
    this.updateState({ loading: true, error: null });

    this.api
      .post<any>('admin/upload-log', {
        page: this.currentPage,
        per_page: this.perPage,
        order_by: this.sortBy,
        order_dir: this.sortDir,
        q: this.searchQuery,
        date_from: this.dateFrom || '',
        date_to: this.dateTo || '',
      })
      .pipe(
        take(1),
        catchError((error: unknown) => {
          const httpError = error instanceof HttpErrorResponse ? error : null;

          if (httpError?.status === 401) {
            this.userService.logout();
            return of(null);
          }

          const message =
            typeof httpError?.error?.message === 'string' && httpError.error.message.trim()
              ? httpError.error.message
              : 'No se ha podido cargar el log de subidas.';

          this.updateState({ error: message, loading: false });
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }

        this.updateState({
          logs: response.logs ?? [],
          pagination: response.pagination,
          loading: false,
        });

        if (response.pagination) {
          this.sortBy = response.pagination.order_by;
          this.sortDir = response.pagination.order_dir;
          this.searchQuery = response.pagination.q ?? '';
          this.searchDraft = response.pagination.q ?? '';
          this.dateFrom = response.pagination.date_from ?? '';
          this.dateTo = response.pagination.date_to ?? '';
          this.currentPage = response.pagination.page ?? this.currentPage;
        }
      });
  }

  private updateState(newState: Partial<any>): void {
    this.stateSubject.next({
      ...this.state,
      ...newState,
    });
  }
}
