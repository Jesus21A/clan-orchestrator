import { Component, inject, HostListener, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DashboardStateService } from '../../core/services/dashboard-state.service';
import { AuthService } from '../../core/services/auth.service';
import { AnalysisType, QBR_PERIODS } from '../../core/models/clan.models';
import { MetricsBarComponent } from './metrics-bar/metrics-bar.component';
import { TaskTableComponent } from './task-table/task-table.component';
import { AiPanelComponent } from './ai-panel/ai-panel.component';
import { DependencyGraphComponent } from './dependency-graph/dependency-graph.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MetricsBarComponent, TaskTableComponent,
            AiPanelComponent, DependencyGraphComponent],
  template: `
    <div class="dashboard-shell">
      <header class="top-bar">
        <div class="top-bar__brand">
          <span class="top-bar__icon">◈</span>
          <div>
            <h1>Clan Orchestrator</h1>
            <p>Monitoreo de dependencias y alineación QBR</p>
          </div>
        </div>

        <div class="top-bar__center">
          <label class="qbr-label">QBR:</label>
          <select class="qbr-select" [ngModel]="state.qbrPeriod()"
                  (ngModelChange)="state.setQbrPeriod($event || null)">
            <option value="">Todos los períodos</option>
            <option *ngFor="let p of periods" [value]="p">{{ p }}</option>
          </select>
        </div>

        <div class="top-bar__actions">
          <button class="btn btn--ghost" (click)="showGraph.set(!showGraph())">
            {{ showGraph() ? '✕ Cerrar grafo' : '⬡ Ver grafo' }}
          </button>
          <button class="btn btn--ghost" (click)="router.navigate(['/executive'])">
            ◎ Vista ejecutiva
          </button>
          <div class="user-badge">
            <span class="user-badge__name">{{ auth.currentClan() }}</span>
            <button class="btn-logout" (click)="auth.logout()">Salir</button>
          </div>
        </div>
      </header>

      <app-metrics-bar
        [metrics]="state.metrics()"
        [loading]="state.loadingState() === 'loading-metrics'" />

      <app-dependency-graph
        *ngIf="showGraph()"
        [tasks]="state.tasks()"
        (close)="showGraph.set(false)" />

      <div class="content-grid" [style.grid-template-columns]="'1fr ' + sidebarWidth + 'px'">
        <div class="content-grid__main">
          <app-task-table />
        </div>
        <div class="content-grid__sidebar">
          <div class="resize-handle" (mousedown)="onResizeStart($event)"></div>
          <app-ai-panel
            [content]="state.aiContent()"
            [loading]="state.isLoadingAI()"
            [error]="state.errorMessage()"
            [hasData]="state.hasData()"
            [activeAnalysis]="state.activeAnalysis()"
            (analyze)="state.runAnalysis($event)" />
        </div>
      </div>
    </div>
  `,
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  readonly state   = inject(DashboardStateService);
  readonly auth    = inject(AuthService);
  readonly router  = inject(Router);
  readonly periods = QBR_PERIODS;
  readonly showGraph = signal(false);

  sidebarWidth = 360;
  private dragging = false;
  private startX = 0;
  private startWidth = 0;

  ngOnInit(): void { this.state.loadFromServer(); }

  onResizeStart(e: MouseEvent): void {
    this.dragging = true; this.startX = e.clientX; this.startWidth = this.sidebarWidth;
    e.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (!this.dragging) return;
    this.sidebarWidth = Math.max(280, Math.min(720, this.startWidth + (this.startX - e.clientX)));
  }

  @HostListener('document:mouseup')
  onMouseUp(): void { this.dragging = false; }
}
