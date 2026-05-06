import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ClanApiService } from '../../core/services/clan-api.service';
import { AuthService } from '../../core/services/auth.service';
import { AiPanelComponent } from '../dashboard/ai-panel/ai-panel.component';
import { MetricsBarComponent } from '../dashboard/metrics-bar/metrics-bar.component';
import { OrchestratorMetrics, Task, CLANS } from '../../core/models/clan.models';

interface ClanCard {
  clan: string;
  total: number;
  completed: number;
  blocked: number;
  qbrPct: number;
  avgProgress: number;
}

@Component({
  selector: 'app-executive',
  standalone: true,
  imports: [CommonModule, AiPanelComponent, MetricsBarComponent],
  template: `
    <div class="exec-shell">
      <header class="exec-bar">
        <div class="exec-bar__brand">
          <span class="icon">◈</span>
          <div>
            <h1>Vista Ejecutiva</h1>
            <p>Estado consolidado — solo lectura</p>
          </div>
        </div>
        <button class="btn-back" (click)="router.navigate(['/'])">← Dashboard</button>
      </header>

      <!-- Métricas globales -->
      <app-metrics-bar [metrics]="metrics()" [loading]="loading()" />

      <!-- Tarjetas por clan -->
      <div class="clan-cards" *ngIf="clanCards().length">
        <div class="clan-card" *ngFor="let c of clanCards()"
             [class.has-blocked]="c.blocked > 0">
          <div class="clan-card__name">{{ c.clan }}</div>
          <div class="clan-card__qbr">
            <span class="big-num" [class.big-num--ok]="c.qbrPct >= 70"
                  [class.big-num--warn]="c.qbrPct < 70 && c.qbrPct >= 40"
                  [class.big-num--risk]="c.qbrPct < 40">
              {{ c.qbrPct }}%
            </span>
            <span class="label">alineación QBR</span>
          </div>
          <div class="clan-card__bar">
            <div class="bar-track">
              <div class="bar-fill" [style.width.%]="c.avgProgress"
                   [class.fill--ok]="c.avgProgress >= 70"></div>
            </div>
            <span class="bar-label">{{ c.avgProgress }}% avance prom.</span>
          </div>
          <div class="clan-card__stats">
            <span>{{ c.completed }}/{{ c.total }} completas</span>
            <span class="blocked-badge" *ngIf="c.blocked > 0">
              {{ c.blocked }} bloqueada{{ c.blocked > 1 ? 's' : '' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Panel Claude solo lectura -->
      <div class="exec-ai">
        <app-ai-panel
          [content]="aiContent()"
          [loading]="loadingAI()"
          [error]="aiError()"
          [hasData]="!!metrics()"
          [activeAnalysis]="'qbr'"
          (analyze)="runAnalysis()" />
      </div>
    </div>
  `,
  styleUrl: './executive.component.scss'
})
export class ExecutiveComponent implements OnInit {
  readonly router = inject(Router);
  readonly auth   = inject(AuthService);
  private readonly api = inject(ClanApiService);

  readonly loading   = signal(true);
  readonly loadingAI = signal(false);
  readonly aiContent = signal('');
  readonly aiError   = signal('');
  readonly metrics   = signal<OrchestratorMetrics | null>(null);
  readonly tasks     = signal<Task[]>([]);

  readonly clanCards = (() => {
    const self = this;
    return () => {
      const taskList = self.tasks();
      if (!taskList.length) return [] as ClanCard[];
      const statusMap = new Map(taskList.map(t => [t.id, t]));
      const isBlocked = (t: Task) => {
        if (t.status === 'Completed' || !t.dependency_id) return false;
        const dep = statusMap.get(t.dependency_id);
        return !!dep && dep.status !== 'Completed';
      };
      return [...new Set(taskList.map(t => t.clan_owner))].map(clan => {
        const ct = taskList.filter(t => t.clan_owner === clan);
        const qbrTasks = ct.filter(t => t.is_qbr);
        const qbrDone  = qbrTasks.filter(t => t.status === 'Completed');
        return {
          clan,
          total: ct.length,
          completed: ct.filter(t => t.status === 'Completed').length,
          blocked: ct.filter(t => isBlocked(t)).length,
          qbrPct: qbrTasks.length ? Math.round(qbrDone.length / qbrTasks.length * 100) : 0,
          avgProgress: ct.length ? Math.round(ct.reduce((s, t) => s + t.progress_pct, 0) / ct.length) : 0,
        } as ClanCard;
      });
    };
  })();

  ngOnInit(): void {
    this.api.getTasks().subscribe({
      next: tasks => {
        this.tasks.set(tasks);
        this.loading.set(false);
        this.runAnalysis();
      },
      error: () => this.loading.set(false),
    });
    this.api.getMetrics().subscribe({ next: res => this.metrics.set(res.metrics), error: () => {} });
  }

  runAnalysis(): void {
    this.loadingAI.set(true);
    this.aiContent.set('');
    this.aiError.set('');
    this.api.analyze('qbr').subscribe({
      next: res => { this.aiContent.set(res.content); this.loadingAI.set(false); },
      error: (err: Error) => { this.aiError.set(err.message); this.loadingAI.set(false); },
    });
  }
}
