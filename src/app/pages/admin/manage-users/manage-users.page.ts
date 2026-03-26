import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import {
  IonContent,
  IonSearchbar,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { compass, shieldCheckmark, alertCircleOutline, searchOutline } from 'ionicons/icons';
import { BehaviorSubject, Subject, catchError, debounceTime, distinctUntilChanged, take, takeUntil, of } from 'rxjs';
import { AdminPageTemplate } from '../../../templates/admin-page.template';
import { ApiService } from '../../../services/api.service';
import { PageHeaderService } from '../../../services/page-header.service';
import { PaginationComponent } from '../../../components/pagination/pagination.component';
import { LoaderComponent } from '../../../components/loader/loader.component';

addIcons({ compass, shieldCheckmark, alertCircleOutline, searchOutline });


addIcons({ compass, shieldCheckmark, alertCircleOutline });

// Using implicit object types (no explicit type aliases)

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonSearchbar,
    IonIcon,
    PaginationComponent,
    LoaderComponent,
  ],
  templateUrl: './manage-users.page.html',
  styleUrls: ['./manage-users.page.scss'],
})
export class ManageUsersPage extends AdminPageTemplate implements OnInit {
  private readonly api = inject(ApiService);
  private readonly pageHeaderService = inject(PageHeaderService);

  // State management (implicit object type)
  private stateSubject = new BehaviorSubject<any>({
    users: [],
    pagination: {
      page: 1,
      per_page: 20,
      total: 0,
      total_pages: 0,
    },
    loading: false,
    error: null,
  });

  public state$ = this.stateSubject.asObservable();

  // Filter/Sort parameters
  public searchDraft = '';
  public searchQuery = '';
  private searchInput$ = new Subject<string>();
  public sortBy = 'date_created';
  public sortDir: 'asc' | 'desc' = 'desc';
  public currentPage = 1;
  public perPage = 20;

  public get state(): any {
    return this.stateSubject.value;
  }

  override ionViewWillEnter(): void {
    super.ionViewWillEnter();
    this.pageHeaderService.setTitle('Gestión de usuarios', '/admin');
  }

  ngOnInit(): void {
    // Debounced search subscription
    // Use base class destroy$ for cleanup
    // @ts-ignore: Accessing private property from base class for subscription cleanup
    this.searchInput$
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil((this as any).destroy$)
      )
      .subscribe((value) => {
        this.searchQuery = value;
        this.currentPage = 1;
        this.loadUsers();
      });
    this.loadUsers();
  }


  public onSearchInput(ev: Event): void {
    const value = (ev.target as HTMLInputElement).value;
    this.searchInput$.next(value ?? '');
  }


  public onSort(column: string): void {
    if (column === 'avatar') {
      return; // Avatar cannot be sorted
    }

    if (this.sortBy === column) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDir = 'asc';
    }

    this.currentPage = 1;
    this.loadUsers();
  }

  public goToPage(page: number): void {
    if (page < 1 || page > this.state.pagination.total_pages) {
      return;
    }

    this.currentPage = page;
    this.loadUsers();
  }

  public retry(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  private loadUsers(onComplete?: () => void): void {
    this.updateState({ loading: true, error: null });

    const params = {
      page: this.currentPage,
      per_page: this.perPage,
      order_by: this.sortBy,
      order_dir: this.sortDir,
      q: this.searchQuery,
    };

    this.api
      .post('admin/user-list', params)
      .pipe(
        take(1),
        catchError((error: unknown) => {
          const httpError = error instanceof HttpErrorResponse ? error : null;

          if (httpError?.status === 401) {
            this.userService.logout();
            return of(null);
          }

          const message =
            httpError?.error?.message || 'Error al cargar los usuarios. Intenta de nuevo.';
          this.updateState({ error: message });
          return of(null);
        })
      )
      .subscribe((response: any) => {
        if (response) {
          // Update table data and pagination
          this.updateState({
            users: response.users,
            pagination: {
              page: response.pagination.page,
              per_page: response.pagination.per_page,
              total: response.pagination.total,
              total_pages: response.pagination.total_pages,
            },
          });

          // Synchronize sorting and query from server in case of discrepancies
          if (response.pagination) {
            if (response.pagination.order_by) {
              this.sortBy = response.pagination.order_by;
            }
            if (response.pagination.order_dir === 'asc' || response.pagination.order_dir === 'desc') {
              this.sortDir = response.pagination.order_dir;
            }
            if (typeof response.pagination.q === 'string') {
              this.searchQuery = response.pagination.q;
              this.searchDraft = response.pagination.q;
            }
          }
        }

        this.updateState({ loading: false });
        onComplete?.();
      });
  }

  private updateState(newState: Partial<any>): void {
    const current = this.stateSubject.value;
    this.stateSubject.next({ ...current, ...newState });
  }

  public getAvatarInitial(name: string): string {
    return name.charAt(0).toUpperCase();
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

  public getPageNumbers(): number[] {
    const total = this.state.pagination.total_pages || 1;
    const current = this.currentPage;
    const visible = 5; // max buttons to show
    const pages: number[] = [];

    let start = Math.max(1, current - Math.floor(visible / 2));
    let end = start + visible - 1;

    if (end > total) {
      end = total;
      start = Math.max(1, end - visible + 1);
    }

    for (let p = start; p <= end; p++) {
      pages.push(p);
    }

    return pages;
  }

  public showFirstButton(): boolean {
    const pages = this.getPageNumbers();
    return pages.length > 0 && pages[0] > 1;
  }

  public showLastButton(): boolean {
    const pages = this.getPageNumbers();
    const total = this.state.pagination.total_pages || 1;
    return pages.length > 0 && pages[pages.length - 1] < total;
  }
}
