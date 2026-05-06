import { Injectable, signal, computed, inject } from '@angular/core';
import { ClanApiService } from './clan-api.service';
import { Task, TaskCreate, TaskUpdate, OrchestratorMetrics, AnalysisType } from '../models/clan.models';

export type LoadingState = 'idle' | 'loading-tasks' | 'loading-metrics' | 'loading-ai' | 'error';

@Injectable({ providedIn: 'root' })
export class DashboardStateService {
  private readonly api = inject(ClanApiService);

  readonly tasks          = signal<Task[]>([]);
  readonly metrics        = signal<OrchestratorMetrics | null>(null);
  readonly loadingState   = signal<LoadingState>('idle');
  readonly errorMessage   = signal<string>('');
  readonly activeAnalysis = signal<AnalysisType | null>(null);
  readonly qbrPeriod      = signal<string | null>(null);
  private readonly _cache = signal<Partial<Record<string, string>>>({});

  readonly hasData     = computed(() => this.tasks().length > 0);
  readonly isLoadingAI = computed(() => this.loadingState() === 'loading-ai');
  readonly aiContent   = computed(() => {
    const key = this._cacheKey();
    return key ? (this._cache()[key] ?? '') : '';
  });

  private _cacheKey(): string | null {
    const type   = this.activeAnalysis();
    const period = this.qbrPeriod();
    return type ? `${type}__${period ?? 'all'}` : null;
  }

  loadFromServer(): void {
    this.loadingState.set('loading-tasks');
    this.api.getTasks().subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.loadingState.set('idle');
        this._refreshMetrics();
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.loadingState.set('error');
      },
    });
  }

  setQbrPeriod(period: string | null): void {
    this.qbrPeriod.set(period);
    this._cache.set({});
    this.activeAnalysis.set(null);
    this._refreshMetrics();
  }

  createTask(task: TaskCreate): void {
    this.api.createTask(task).subscribe({
      next: (created) => {
        this.tasks.update(list => [...list, created]);
        this._cache.set({});
        this.activeAnalysis.set(null);
        this._refreshMetrics();
      },
      error: (err: Error) => this.errorMessage.set(err.message),
    });
  }

  updateTask(id: string, task: TaskUpdate): void {
    this.api.updateTask(id, task).subscribe({
      next: (updated) => {
        this.tasks.update(list => list.map(t => t.id === id ? updated : t));
        this._cache.set({});
        this.activeAnalysis.set(null);
        this._refreshMetrics();
      },
      error: (err: Error) => this.errorMessage.set(err.message),
    });
  }

  deleteTask(id: string): void {
    this.api.deleteTask(id).subscribe({
      next: () => {
        this.tasks.update(list => list.filter(t => t.id !== id));
        this._cache.set({});
        this.activeAnalysis.set(null);
        this._refreshMetrics();
      },
      error: (err: Error) => this.errorMessage.set(err.message),
    });
  }

  runAnalysis(type: AnalysisType): void {
    if (!this.hasData()) return;
    this.activeAnalysis.set(type);
    const key = this._cacheKey()!;
    if (this._cache()[key]) { this.loadingState.set('idle'); return; }

    this.loadingState.set('loading-ai');
    this.errorMessage.set('');

    this.api.analyze(type, this.qbrPeriod()).subscribe({
      next: (res) => {
        this.metrics.set(res.metrics);
        this._cache.update(c => ({ ...c, [key]: res.content }));
        this.loadingState.set('idle');
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.loadingState.set('error');
      },
    });
  }

  private _refreshMetrics(): void {
    this.api.getMetrics(this.qbrPeriod()).subscribe({
      next: (res) => this.metrics.set(res.metrics),
      error: () => {},
    });
  }
}
