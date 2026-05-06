import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AnalysisType } from '../../../core/models/clan.models';

interface ActionBtn {
  type: AnalysisType;
  label: string;
  icon: string;
  accent: boolean;
}

@Component({
  selector: 'app-ai-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ai-panel">
      <div class="ai-panel__header">
        <div class="ai-panel__avatar">✦</div>
        <div>
          <div class="ai-panel__title">Claude Intelligence</div>
          <div class="ai-panel__sub">Análisis estratégico en tiempo real</div>
        </div>
      </div>

      <div class="ai-panel__output" [class.ai-panel__output--loading]="loading">
        <ng-container *ngIf="loading">
          <div class="ai-panel__spinner">
            <span class="spinner-dot"></span>
            <span class="spinner-dot"></span>
            <span class="spinner-dot"></span>
          </div>
          <p class="ai-panel__loading-text">Consultando a Claude...</p>
        </ng-container>

        <div class="ai-panel__error" *ngIf="!loading && error">
          <span class="error-icon">⚠</span>
          <p>{{ error }}</p>
        </div>

        <div class="ai-panel__placeholder" *ngIf="!loading && !error && !content">
          <p>{{ hasData ? 'Selecciona un análisis para comenzar.' : 'Carga datos primero para activar el análisis.' }}</p>
        </div>

        <div class="ai-panel__content" *ngIf="!loading && !error && content"
             [innerHTML]="htmlContent"></div>
      </div>

      <div class="ai-panel__actions">
        <button
          *ngFor="let btn of buttons"
          class="action-btn"
          [class.action-btn--accent]="btn.accent"
          [class.action-btn--active]="activeAnalysis === btn.type && !loading"
          [disabled]="!hasData || loading"
          (click)="analyze.emit(btn.type)">
          <span>{{ btn.icon }}</span>
          {{ btn.label }}
        </button>
      </div>
    </div>
  `,
  styleUrl: './ai-panel.component.scss'
})
export class AiPanelComponent {
  @Input() content    = '';
  @Input() loading    = false;
  @Input() error      = '';
  @Input() hasData    = false;
  @Input() activeAnalysis: AnalysisType | null = null;

  @Output() analyze = new EventEmitter<AnalysisType>();

  private readonly sanitizer = inject(DomSanitizer);

  get htmlContent(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.parseMarkdown(this.content));
  }

  private parseMarkdown(text: string): string {
    const lines = text.split('\n');
    const html: string[] = [];

    for (const raw of lines) {
      let line = raw;

      // Skip raw table rows and separators
      if (/^\s*\|/.test(line) || /^\s*[-|]{3,}/.test(line)) continue;

      // ## headers → section style
      if (/^#{1,3}\s+/.test(line)) {
        line = line.replace(/^#{1,3}\s+/, '');
        line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html.push(`<div class="md-section"><strong class="md-heading">${line}</strong></div>`);
        continue;
      }

      // Numbered section headers: "1. **Title**"
      if (/^\d+\.\s+\*\*/.test(line)) {
        line = line.replace(/^(\d+\.\s+)\*\*(.+?)\*\*/, '<span class="md-num">$1</span><strong class="md-heading">$2</strong>');
        line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html.push(`<div class="md-section">${line}</div>`);
        continue;
      }

      // Bullet points (-, •, *)
      if (/^\s*[-•*]\s+/.test(line)) {
        line = line.replace(/^\s*[-•*]\s+/, '');
        line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        line = line.replace(/`(.+?)`/g, '<code>$1</code>');
        html.push(`<div class="md-bullet">• ${line}</div>`);
        continue;
      }

      // Empty line or --- → spacer
      if (line.trim() === '' || /^---+$/.test(line.trim())) {
        html.push('<div class="md-gap"></div>');
        continue;
      }

      // Normal line with inline bold and code
      line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      line = line.replace(/`(.+?)`/g, '<code>$1</code>');
      html.push(`<div class="md-line">${line}</div>`);
    }

    return html.join('');
  }

  readonly buttons: ActionBtn[] = [
    { type: 'qbr',        label: 'Analizar estado QBR',       icon: '◎', accent: true  },
    { type: 'bottleneck', label: 'Detectar cuellos de botella', icon: '⚡', accent: false },
    { type: 'plan',       label: 'Generar plan de acción',     icon: '✦', accent: false },
  ];
}
