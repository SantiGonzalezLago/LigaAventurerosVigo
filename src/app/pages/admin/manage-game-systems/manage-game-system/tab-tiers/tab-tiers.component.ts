import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { IonButton, IonInput, IonItem } from '@ionic/angular/standalone';
import { take } from 'rxjs';
import { ApiService } from '../../../../../services/api.service';
import { LoaderComponent } from '../../../../../components/loader/loader.component';

const TIER_COLORS = ['#4a9eff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1', '#13c2c2'];

@Component({
  selector: 'app-tab-tiers',
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonItem, IonInput, LoaderComponent],
  templateUrl: './tab-tiers.component.html',
  styleUrls: ['./tab-tiers.component.scss'],
})
export class TabTiersComponent implements OnChanges {
  private readonly api = inject(ApiService);
  private readonly toastController = inject(ToastController);

  @Input() systemId: number | null = null;

  readonly ROW_HEIGHT = 56;
  readonly GRID_GAP = 4;

  loading = false;
  saving = false;
  editMode = false;
  loadError: string | null = null;
  hasShownLevelConflictToast = false;

  private readonly tierKeyByRef = new WeakMap<object, string>();
  private nextTierKey = 1;
  private levelDraftByKey: {
    [key: string]: {
      min_level: number;
      max_level: number;
      timeoutId: ReturnType<typeof setTimeout> | null;
    };
  } = {};

  tiers: { id?: number; system_id?: number; name: string; min_level: number; max_level: number; active: boolean }[] = [];
  draftTiers: { id?: number; system_id?: number; name: string; min_level: number; max_level: number; active: boolean }[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['systemId']?.currentValue != null) {
      this.loadTiers();
    }
  }

  get activeDrafts() {
    return [...this.draftTiers.filter(t => t.active)].sort((a, b) => a.min_level - b.min_level);
  }

  get inactiveDrafts() {
    return this.draftTiers.filter(t => !t.active);
  }

  get displayMaxLevel(): number {
    const active = this.draftTiers.filter(t => t.active);
    if (!active.length) return 0;
    const maxes = active
      .map(t => Math.max(t.min_level || 0, t.max_level || 0))
      .filter(v => v > 0 && !isNaN(v));
    return maxes.length > 0 ? Math.max(...maxes) : 0;
  }

  get levels(): number[] {
    return Array.from({ length: this.displayMaxLevel }, (_, i) => i + 1);
  }

  get gridTemplateRows(): string {
    if (this.displayMaxLevel <= 0) {
      return '';
    }
    if (this.editMode) {
      return `repeat(${this.displayMaxLevel}, minmax(${this.ROW_HEIGHT}px, auto))`;
    }
    return `repeat(${this.displayMaxLevel}, ${this.ROW_HEIGHT}px)`;
  }

  get validationError(): string | null {
    const active = this.activeDrafts;
    for (const t of active) {
      if (!t.name.trim()) return 'Todos los tiers activos deben tener nombre';
      if (!t.min_level || t.min_level < 1) return 'El nivel mínimo debe ser al menos 1';
      if (!t.max_level || t.max_level < t.min_level) return 'El nivel máximo debe ser ≥ al mínimo';
    }
    for (let i = 0; i < active.length - 1; i++) {
      if (active[i].max_level >= active[i + 1].min_level) {
        return `"${active[i].name || 'Tier'}" y "${active[i + 1].name || 'Tier'}" se solapan`;
      }
      if (active[i].max_level + 1 < active[i + 1].min_level) {
        return `Hay un hueco entre el nivel ${active[i].max_level} y ${active[i + 1].min_level}`;
      }
    }
    return null;
  }

  tierGridRow(tier: { min_level: number; max_level: number }): string {
    const min = Math.max(1, Math.floor(tier.min_level) || 1);
    const max = Math.max(min, Math.floor(tier.max_level) || min);
    return `${min} / ${max + 1}`;
  }

  tierLevelLabel(tier: { min_level: number; max_level: number }): string {
    if (tier.min_level === tier.max_level) {
      return `Nivel ${tier.min_level}`;
    }
    return `Nivel ${tier.min_level} - ${tier.max_level}`;
  }

  tierBgColor(index: number): string {
    return TIER_COLORS[index % TIER_COLORS.length] + '22';
  }

  tierBorderColor(index: number): string {
    return TIER_COLORS[index % TIER_COLORS.length];
  }

  trackTier(tier: (typeof this.draftTiers)[number]): string {
    if (tier.id !== undefined && tier.id !== null) {
      return `id_${tier.id}`;
    }
    return this.getTierKey(tier);
  }

  toggleEditMode(): void {
    if (this.editMode) {
      this.draftTiers = this.tiers.map(t => ({ ...t }));
      this.clearAllLevelDrafts();
      this.editMode = false;
    } else {
      this.draftTiers = this.tiers.map(t => ({ ...t }));
      this.clearAllLevelDrafts();
      this.hasShownLevelConflictToast = false;
      this.editMode = true;
    }
  }

  addTier(): void {
    const active = this.activeDrafts;
    const nextMin = active.length > 0 ? active[active.length - 1].max_level + 1 : 1;
    this.draftTiers.push({ name: '', min_level: nextMin, max_level: nextMin, active: true });
  }

  removeTier(tier: (typeof this.draftTiers)[number]): void {
    this.applyPendingLevelChange(tier, false);
    this.clearLevelDraftForTier(tier);
    const idx = this.draftTiers.indexOf(tier);
    if (idx !== -1) this.draftTiers.splice(idx, 1);
  }

  setTierActive(tier: (typeof this.draftTiers)[number], active: boolean): void {
    this.applyPendingLevelChange(tier, false);
    tier.active = active;
  }

  getLevelDraftValue(tier: (typeof this.draftTiers)[number], field: 'min_level' | 'max_level'): number {
    const draft = this.ensureLevelDraftForTier(tier);
    return draft[field];
  }

  onLevelInputChange(
    tier: (typeof this.draftTiers)[number],
    field: 'min_level' | 'max_level',
    value: string | number | null
  ): void {
    const draft = this.ensureLevelDraftForTier(tier);
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      draft[field] = parsed;
    }

    if (draft.timeoutId !== null) {
      clearTimeout(draft.timeoutId);
    }

    draft.timeoutId = setTimeout(() => {
      this.applyPendingLevelChange(tier, true);
    }, 1000);
  }

  onLevelInputBlur(tier: (typeof this.draftTiers)[number]): void {
    this.applyPendingLevelChange(tier, true);
  }

  saveTiers(): void {
    if (!this.systemId) return;
    this.flushAllPendingLevelChanges();
    const err = this.validationError;
    if (err) {
      void this.showToast(err, 'warning');
      return;
    }
    this.saving = true;

    const payload = this.draftTiers.map(t => ({
      ...(t.id !== undefined ? { id: t.id } : {}),
      name: t.name.trim(),
      min_level: Math.round(t.min_level),
      max_level: Math.round(t.max_level),
      active: t.active,
    }));

    this.api.post<
      { message: string; tiers: { id?: number; system_id?: number; name: string; min_level: number; max_level: number; active: boolean }[] },
      { tiers: typeof payload }
    >(`game-systems/${this.systemId}/tiers/update`, { tiers: payload })
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          this.saving = false;
          this.tiers = res.tiers ?? [];
          this.draftTiers = this.tiers.map(t => ({ ...t }));
          this.clearAllLevelDrafts();
          this.editMode = false;
          void this.showToast('Tiers guardados correctamente', 'success');
        },
        error: (err: unknown) => {
          this.saving = false;
          const msg = err instanceof HttpErrorResponse
            ? (err.error?.message ?? 'Error al guardar')
            : 'Error al guardar';
          void this.showToast(msg, 'danger');
        },
      });
  }

  private loadTiers(): void {
    if (!this.systemId) return;
    this.loading = true;
    this.loadError = null;
    this.editMode = false;
    this.hasShownLevelConflictToast = false;
    this.clearAllLevelDrafts();

    this.api.get<{ message: string; tiers: { id?: number; system_id?: number; name: string; min_level: number; max_level: number; active: boolean }[] }>(`game-systems/${this.systemId}/tiers`)
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.tiers = res.tiers ?? [];
          this.draftTiers = this.tiers.map(t => ({ ...t }));
          this.clearAllLevelDrafts();
        },
        error: (err: unknown) => {
          this.loading = false;
          this.loadError = err instanceof HttpErrorResponse
            ? (err.error?.message ?? 'Error al cargar los tiers')
            : 'Error al cargar los tiers';
        },
      });
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({ message, color, duration: 3000, position: 'bottom' });
    await toast.present();
  }

  private getTierKey(tier: (typeof this.draftTiers)[number]): string {
    const tierAsObject = tier as object;
    const existing = this.tierKeyByRef.get(tierAsObject);
    if (existing) {
      return existing;
    }

    const key = `tier_${this.nextTierKey}`;
    this.nextTierKey += 1;
    this.tierKeyByRef.set(tierAsObject, key);
    return key;
  }

  private ensureLevelDraftForTier(tier: (typeof this.draftTiers)[number]): {
    min_level: number;
    max_level: number;
    timeoutId: ReturnType<typeof setTimeout> | null;
  } {
    const key = this.getTierKey(tier);
    const existing = this.levelDraftByKey[key];
    if (existing) {
      return existing;
    }

    this.levelDraftByKey[key] = {
      min_level: tier.min_level,
      max_level: tier.max_level,
      timeoutId: null,
    };

    return this.levelDraftByKey[key];
  }

  private applyPendingLevelChange(tier: (typeof this.draftTiers)[number], showOverlapToast: boolean): void {
    const key = this.getTierKey(tier);
    const draft = this.levelDraftByKey[key];
    if (!draft) {
      return;
    }

    if (draft.timeoutId !== null) {
      clearTimeout(draft.timeoutId);
      draft.timeoutId = null;
    }

    const nextMin = Math.max(1, Math.floor(Number(draft.min_level)) || 1);
    const nextMax = Math.max(nextMin, Math.floor(Number(draft.max_level)) || nextMin);

    const currentMin = Math.max(1, Math.floor(Number(tier.min_level)) || 1);
    const currentMax = Math.max(currentMin, Math.floor(Number(tier.max_level)) || currentMin);

    if (nextMin === currentMin && nextMax === currentMax) {
      draft.min_level = currentMin;
      draft.max_level = currentMax;
      return;
    }

    const candidateActive = this.activeDrafts.map(activeTier => {
      if (activeTier === tier) {
        return {
          min_level: nextMin,
          max_level: nextMax,
        };
      }
      return {
        min_level: activeTier.min_level,
        max_level: activeTier.max_level,
      };
    });

    const overlapError = this.getOverlapError(candidateActive);
    if (overlapError) {
      draft.min_level = currentMin;
      draft.max_level = currentMax;

      if (showOverlapToast) {
        void this.showToast(overlapError, 'warning');
      }
      return;
    }

    tier.min_level = nextMin;
    tier.max_level = nextMax;
    draft.min_level = nextMin;
    draft.max_level = nextMax;
  }

  private getOverlapError(activeTiers: { min_level: number; max_level: number }[]): string | null {
    const sorted = [...activeTiers].sort((a, b) => a.min_level - b.min_level);
    for (let i = 0; i < sorted.length - 1; i += 1) {
      if (sorted[i].max_level >= sorted[i + 1].min_level) {
        return 'Ese cambio causa un solapamiento de niveles';
      }
    }
    return null;
  }

  private clearLevelDraftForTier(tier: (typeof this.draftTiers)[number]): void {
    const key = this.getTierKey(tier);
    const draft = this.levelDraftByKey[key];
    if (!draft) {
      return;
    }

    if (draft.timeoutId !== null) {
      clearTimeout(draft.timeoutId);
    }
    delete this.levelDraftByKey[key];
  }

  private flushAllPendingLevelChanges(): void {
    for (const tier of this.draftTiers) {
      this.applyPendingLevelChange(tier, false);
    }
  }

  private clearAllLevelDrafts(): void {
    for (const key of Object.keys(this.levelDraftByKey)) {
      const draft = this.levelDraftByKey[key];
      if (draft.timeoutId !== null) {
        clearTimeout(draft.timeoutId);
      }
    }
    this.levelDraftByKey = {};
  }
}
