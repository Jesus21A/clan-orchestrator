import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrchestratorMetrics } from '../../../core/models/clan.models';

@Component({
  selector: 'app-metrics-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="metrics-bar">
      <div class="metric-card">
        <span class="metric-card__label">Alineación QBR</span>
        <span class="metric-card__value metric-card__value--blue">
          {{ loading ? '—' : (metrics?.qbr_alignment_pct | number:'1.0-0') + '%' }}
        </span>
        <div class="metric-card__bar" *ngIf="!loading && metrics">
          <div class="metric-card__bar-fill metric-card__bar-fill--blue"
               [style.width.%]="metrics.qbr_alignment_pct"></div>
        </div>
      </div>

      <div class="metric-card">
        <span class="metric-card__label">Tareas totales</span>
        <span class="metric-card__value">{{ loading ? '—' : metrics?.total_tasks }}</span>
      </div>

      <div class="metric-card">
        <span class="metric-card__label">Bloqueos activos</span>
        <span class="metric-card__value"
              [class.metric-card__value--danger]="(metrics?.blocked_count ?? 0) > 0">
          {{ loading ? '—' : metrics?.blocked_count }}
        </span>
      </div>

      <div class="metric-card">
        <span class="metric-card__label">Dependencias rotas</span>
        <span class="metric-card__value"
              [class.metric-card__value--warning]="(metrics?.blocked_tasks?.length ?? 0) > 0">
          {{ loading ? '—' : (metrics?.blocked_tasks?.length ?? 0) }}
        </span>
      </div>
    </div>
  `,
  styleUrl: './metrics-bar.component.scss'
})
export class MetricsBarComponent {
  @Input() metrics: OrchestratorMetrics | null = null;
  @Input() loading = false;
}
