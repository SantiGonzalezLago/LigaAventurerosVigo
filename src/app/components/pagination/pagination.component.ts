import { Component, EventEmitter, Input, Output, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
})
export class PaginationComponent implements OnInit {
  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Input() total = 0;
  @Input() itemsCount = 0;
  @Input() visible = 5;

  @Output() pageChange = new EventEmitter<number>();

  public getPageNumbers(): number[] {
    const total = this.totalPages || 1;
    const current = this.currentPage;
    const visible = this.visible;
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

  ngOnInit(): void {
    this.updateVisibleForViewport();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateVisibleForViewport();
  }

  private updateVisibleForViewport(): void {
    try {
      this.visible = window.innerWidth < 768 ? 3 : 5;
    } catch (e) {
      this.visible = 5;
    }
  }

  public showFirstButton(): boolean {
    const pages = this.getPageNumbers();
    return pages.length > 0 && pages[0] > 1;
  }

  public showLastButton(): boolean {
    const pages = this.getPageNumbers();
    const total = this.totalPages || 1;
    return pages.length > 0 && pages[pages.length - 1] < total;
  }

  public goTo(page: number): void {
    if (page < 1 || page > (this.totalPages || 1)) {
      return;
    }
    this.pageChange.emit(page);
  }
}
