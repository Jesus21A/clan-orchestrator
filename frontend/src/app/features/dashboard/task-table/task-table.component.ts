import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardStateService } from '../../../core/services/dashboard-state.service';
import { AuthService } from '../../../core/services/auth.service';
import { Task, TaskCreate, CLANS, QBR_PERIODS, ProgressSnapshot } from '../../../core/models/clan.models';

const EMPTY_FORM = (): TaskCreate => ({
  title: '', clan_owner: 'Microfinanzas', status: 'Not Started',
  is_qbr: false, priority: 3, progress_pct: 0,
  dependency_id: null, assignee: null, due_date: null,
  effort_estimated: null, effort_actual: null, notes: null, qbr_period: null,
});

// ── Planner CSV column mapping ────────────────────────────────────────────────
function parsePlannerCsv(csv: string): TaskCreate[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  const col = (name: string) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));

  const iTaskName  = col('Task Name');
  const iBucket    = col('Bucket Name');
  const iProgress  = col('Progress');
  const iPriority  = col('Priority');
  const iAssigned  = col('Assigned To');
  const iDueDate   = col('Due Date');
  const iNotes     = col('Notes');

  const plannerPriority: Record<string, number> = {
    'urgent': 5, 'important': 4, 'medium': 3, 'low': 2, '': 1
  };
  const plannerStatus: Record<string, TaskCreate['status']> = {
    'not started': 'Not Started', 'in progress': 'In Progress', 'completed': 'Completed'
  };
  const progressPct: Record<string, number> = {
    'not started': 0, 'in progress': 50, 'completed': 100
  };

  return lines.slice(1).map(line => {
    const cells = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) ?? line.split(',');
    const cell  = (i: number) => (cells[i] ?? '').replace(/^"|"$/g, '').trim();
    const prog  = cell(iProgress).toLowerCase();
    return {
      title:            cell(iTaskName) || 'Sin título',
      clan_owner:       cell(iBucket)  || 'Microfinanzas',
      status:           plannerStatus[prog] ?? 'Not Started',
      is_qbr:           false,
      priority:         plannerPriority[cell(iPriority).toLowerCase()] ?? 1,
      progress_pct:     progressPct[prog] ?? 0,
      assignee:         cell(iAssigned) || null,
      due_date:         cell(iDueDate) || null,
      notes:            cell(iNotes)   || null,
      dependency_id:    null,
      effort_estimated: null,
      effort_actual:    null,
      qbr_period:       null,
    } as TaskCreate;
  }).filter(t => t.title !== 'Sin título' || true);
}

@Component({
  selector: 'app-task-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="table-card">
      <div class="table-card__header">
        <div class="header-left">
          <h2>Actividades por clan</h2>
          <span class="count-badge" *ngIf="tasks().length">{{ tasks().length }} tareas</span>
        </div>
        <div class="header-right">
          <button class="btn-ghost" (click)="toggleAll()" *ngIf="clanGroups().length">
            {{ allExpanded() ? '− Colapsar todo' : '+ Expandir todo' }}
          </button>
          <input type="file" #plannerInput accept=".csv" style="display:none"
                 (change)="importPlanner($event)" />
          <button class="btn-ghost" (click)="plannerInput.click()" title="Importar CSV de Microsoft Planner">
            ↑ Importar Planner
          </button>
          <button class="btn-new" (click)="openNew()">+ Nueva tarea</button>
        </div>
      </div>

      <!-- Form nueva / editar -->
      <div class="task-form" *ngIf="showForm()">
        <div class="task-form__title">{{ editingId() ? 'Editar tarea' : 'Nueva tarea' }}</div>
        <div class="task-form__grid">
          <div class="field field--wide">
            <label>Título</label>
            <input [(ngModel)]="form.title" placeholder="Nombre de la tarea" />
          </div>
          <div class="field" *ngIf="auth.isAdmin()">
            <label>Clan</label>
            <select [(ngModel)]="form.clan_owner">
              <option *ngFor="let c of clans" [value]="c">{{ c }}</option>
            </select>
          </div>
          <div class="field">
            <label>Responsable</label>
            <input [(ngModel)]="form.assignee" placeholder="Nombre" />
          </div>
          <div class="field">
            <label>Estado</label>
            <select [(ngModel)]="form.status">
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div class="field">
            <label>Avance % <strong>{{ form.progress_pct }}%</strong></label>
            <input type="range" min="0" max="100" [(ngModel)]="form.progress_pct" />
          </div>
          <div class="field">
            <label>Fecha límite</label>
            <input type="date" [(ngModel)]="form.due_date" />
          </div>
          <div class="field">
            <label>Prioridad</label>
            <select [(ngModel)]="form.priority">
              <option [value]="5">5 — Crítica QBR</option>
              <option [value]="4">4 — Alta</option>
              <option [value]="3">3 — Media</option>
              <option [value]="2">2 — Baja</option>
              <option [value]="1">1 — Mínima</option>
            </select>
          </div>
          <div class="field">
            <label>¿Es QBR?</label>
            <label class="toggle">
              <input type="checkbox" [(ngModel)]="form.is_qbr" />
              <span>{{ form.is_qbr ? 'Sí' : 'No' }}</span>
            </label>
          </div>
          <div class="field" *ngIf="form.is_qbr">
            <label>Período QBR</label>
            <select [(ngModel)]="form.qbr_period">
              <option [ngValue]="null">Sin período</option>
              <option *ngFor="let p of periods" [value]="p">{{ p }}</option>
            </select>
          </div>
          <div class="field">
            <label>Depende de</label>
            <select [(ngModel)]="form.dependency_id">
              <option [ngValue]="null">Sin dependencia</option>
              <option *ngFor="let t of tasks()" [value]="t.id"
                      [disabled]="t.id === editingId()">
                {{ t.id }} — {{ t.title | slice:0:28 }}
              </option>
            </select>
          </div>
          <div class="field">
            <label>Esfuerzo estimado (h)</label>
            <input type="number" min="0" [(ngModel)]="form.effort_estimated" placeholder="0" />
          </div>
          <div class="field">
            <label>Esfuerzo real (h)</label>
            <input type="number" min="0" [(ngModel)]="form.effort_actual" placeholder="0" />
          </div>
          <div class="field field--wide">
            <label>Notas</label>
            <textarea [(ngModel)]="form.notes" rows="2"
                      placeholder="Contexto adicional, bloqueos, acuerdos..."></textarea>
          </div>
        </div>
        <div class="task-form__actions">
          <button class="btn-save" (click)="saveTask()" [disabled]="!form.title.trim()">
            {{ editingId() ? 'Guardar cambios' : 'Crear tarea' }}
          </button>
          <button class="btn-cancel" (click)="cancelForm()">Cancelar</button>
        </div>
      </div>

      <div class="empty-state" *ngIf="!tasks().length && !showForm()">
        <div class="empty-state__icon">◫</div>
        <p>Crea la primera tarea o importa desde Planner</p>
      </div>

      <!-- Grupos por clan -->
      <div class="clan-groups" *ngIf="tasks().length">
        <div class="clan-group" *ngFor="let group of clanGroups()">
          <div class="clan-header" (click)="toggleClan(group.clan)">
            <div class="clan-header__left">
              <span class="clan-chevron">{{ collapsed().has(group.clan) ? '▶' : '▼' }}</span>
              <span class="clan-name">{{ group.clan }}</span>
              <span class="clan-badges">
                <span class="mini-badge mini-badge--total">{{ group.tasks.length }}</span>
                <span class="mini-badge mini-badge--blocked" *ngIf="group.blockedCount > 0">
                  {{ group.blockedCount }} bloqueada{{ group.blockedCount > 1 ? 's' : '' }}
                </span>
                <span class="mini-badge mini-badge--qbr" *ngIf="group.qbrCount > 0">
                  {{ group.qbrCount }} QBR
                </span>
              </span>
            </div>
            <div class="clan-header__right">
              <div class="clan-progress-bar">
                <div class="clan-progress-bar__fill" [style.width.%]="group.avgProgress"></div>
              </div>
              <span class="clan-avg">{{ group.avgProgress }}%</span>
            </div>
          </div>

          <div class="clan-body" *ngIf="!collapsed().has(group.clan)">
            <table>
              <thead>
                <tr>
                  <th>Tarea</th>
                  <th>Responsable</th>
                  <th>Vence</th>
                  <th>Avance</th>
                  <th>Estado</th>
                  <th class="center">QBR</th>
                  <th class="center">Prio</th>
                  <th class="center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let task of group.tasks"
                    [class.row--blocked]="isBlocked(task)"
                    [class.row--editing]="editingId() === task.id">
                  <td>
                    <div class="task-name">{{ task.title }}</div>
                    <div class="task-dep" *ngIf="task.dependency_id">
                      ↳ {{ resolveDep(task.dependency_id) }}
                    </div>
                    <div class="task-notes" *ngIf="task.notes">💬 {{ task.notes }}</div>
                    <div class="task-period" *ngIf="task.qbr_period">{{ task.qbr_period }}</div>
                  </td>
                  <td class="text-muted">{{ task.assignee || '—' }}</td>
                  <td class="text-muted" [class.overdue]="isOverdue(task.due_date)">
                    {{ formatDate(task.due_date) }}
                  </td>
                  <td>
                    <div class="progress-wrap">
                      <div class="progress-bar">
                        <div class="progress-bar__fill"
                             [style.width.%]="task.progress_pct"
                             [class.fill--done]="task.progress_pct === 100"
                             [class.fill--warn]="task.progress_pct < 30 && task.is_qbr && !isBlocked(task)"></div>
                      </div>
                      <span class="progress-pct">{{ task.progress_pct }}%</span>
                    </div>
                    <svg *ngIf="sparklinePoints(task) as pts"
                         [attr.width]="52" height="16" class="sparkline">
                      <polyline [attr.points]="pts" fill="none" stroke="#1a56db"
                                stroke-width="1.5" stroke-linecap="round" />
                    </svg>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="statusClass(task)">
                      {{ effectiveStatus(task) }}
                    </span>
                  </td>
                  <td class="center">
                    <span class="qbr-dot" *ngIf="task.is_qbr"></span>
                  </td>
                  <td class="center">
                    <span class="priority" [ngClass]="'priority--' + task.priority">{{ task.priority }}</span>
                  </td>
                  <td class="center actions">
                    <button class="icon-btn" title="Editar" (click)="openEdit(task)">✎</button>
                    <button class="icon-btn icon-btn--danger" title="Eliminar"
                            (click)="deleteTask(task.id)"
                            [disabled]="!canEdit(task)">✕</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './task-table.component.scss'
})
export class TaskTableComponent {
  private readonly state = inject(DashboardStateService);
  readonly auth  = inject(AuthService);

  readonly tasks     = this.state.tasks;
  readonly clans     = CLANS;
  readonly periods   = QBR_PERIODS;
  readonly showForm  = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly collapsed = signal<Set<string>>(new Set());

  form: TaskCreate = EMPTY_FORM();

  readonly clanGroups = computed(() => {
    const taskList = this.tasks();
    const clansWithTasks = [...new Set(taskList.map(t => t.clan_owner))];
    return clansWithTasks.map(clan => {
      const tasks = taskList.filter(t => t.clan_owner === clan);
      return {
        clan, tasks,
        blockedCount: tasks.filter(t => this.isBlocked(t)).length,
        qbrCount:     tasks.filter(t => t.is_qbr).length,
        avgProgress:  tasks.length
          ? Math.round(tasks.reduce((s, t) => s + t.progress_pct, 0) / tasks.length)
          : 0,
      };
    });
  });

  readonly allExpanded = computed(() => this.collapsed().size === 0);

  toggleClan(clan: string): void {
    this.collapsed.update(set => {
      const next = new Set(set);
      next.has(clan) ? next.delete(clan) : next.add(clan);
      return next;
    });
  }

  toggleAll(): void {
    if (this.allExpanded()) {
      this.collapsed.set(new Set(this.clanGroups().map(g => g.clan)));
    } else {
      this.collapsed.set(new Set());
    }
  }

  canEdit(task: Task): boolean {
    return this.auth.isAdmin() || this.auth.currentClan() === task.clan_owner;
  }

  openNew(): void {
    const clan = this.auth.isAdmin() ? 'Microfinanzas' : (this.auth.currentClan() ?? 'Microfinanzas');
    this.form = { ...EMPTY_FORM(), clan_owner: clan };
    this.editingId.set(null);
    this.showForm.set(true);
  }

  openEdit(task: Task): void {
    if (!this.canEdit(task)) return;
    this.form = {
      title: task.title, clan_owner: task.clan_owner,
      status: task.status === 'Blocked' ? 'In Progress' : task.status as any,
      is_qbr: task.is_qbr, priority: task.priority,
      progress_pct: task.progress_pct, dependency_id: task.dependency_id ?? null,
      assignee: task.assignee ?? null, due_date: task.due_date ?? null,
      effort_estimated: task.effort_estimated ?? null, effort_actual: task.effort_actual ?? null,
      notes: task.notes ?? null, qbr_period: task.qbr_period ?? null,
    };
    this.editingId.set(task.id);
    this.showForm.set(true);
  }

  saveTask(): void {
    const id = this.editingId();
    if (id) this.state.updateTask(id, this.form);
    else    this.state.createTask(this.form);
    this.cancelForm();
  }

  cancelForm(): void {
    this.showForm.set(false); this.editingId.set(null); this.form = EMPTY_FORM();
  }

  deleteTask(id: string): void {
    if (confirm('¿Eliminar esta tarea?')) this.state.deleteTask(id);
  }

  importPlanner(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const csv = e.target?.result as string;
      const tasks = parsePlannerCsv(csv);
      if (!tasks.length) { alert('No se encontraron tareas en el CSV'); return; }
      if (confirm(`Se importarán ${tasks.length} tareas desde Planner. ¿Continuar?`)) {
        tasks.forEach(t => this.state.createTask(t));
      }
    };
    reader.readAsText(file);
    (event.target as HTMLInputElement).value = '';
  }

  // ── Helpers ───────────────────────────────────────────────────
  isBlocked(task: Task): boolean {
    if (task.status === 'Completed' || !task.dependency_id) return false;
    const dep = this.tasks().find(t => t.id === task.dependency_id);
    return !!dep && dep.status !== 'Completed';
  }

  effectiveStatus(task: Task): string {
    return this.isBlocked(task) ? 'Blocked' : task.status;
  }

  statusClass(task: Task): string {
    const map: Record<string, string> = {
      'Completed': 'badge--completed', 'In Progress': 'badge--progress',
      'Blocked': 'badge--blocked',     'Not Started': 'badge--neutral',
    };
    return map[this.effectiveStatus(task)] ?? 'badge--neutral';
  }

  resolveDep(depId: string): string {
    const dep = this.tasks().find(t => t.id === depId);
    return dep ? `${depId} — ${dep.title.slice(0, 25)}` : depId;
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return '—';
    return new Date(date + 'T00:00:00').toLocaleDateString('es', { day: '2-digit', month: 'short' });
  }

  isOverdue(date: string | null | undefined): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  sparklinePoints(task: Task): string | null {
    const history = task.history;
    if (!history || history.length < 2) return null;
    const last = history.slice(-6);
    const W = 50; const H = 14;
    const maxP = Math.max(...last.map(h => h.progress_pct), 1);
    return last.map((h, i) => {
      const x = (i / (last.length - 1)) * W;
      const y = H - (h.progress_pct / maxP) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }
}
