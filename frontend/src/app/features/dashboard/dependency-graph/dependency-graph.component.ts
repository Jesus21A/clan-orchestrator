import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../../../core/models/clan.models';

interface NodePos { task: Task; x: number; y: number; effectiveStatus: string; }
interface Edge { x1: number; y1: number; x2: number; y2: number; blocked: boolean; }

const NODE_W = 190; const NODE_H = 58; const COL_GAP = 260; const ROW_GAP = 78;

const STATUS_COLORS: Record<string, { fill: string; border: string; text: string }> = {
  'Completed':   { fill: '#f0fff4', border: '#276749', text: '#276749' },
  'In Progress': { fill: '#ebf4ff', border: '#1a56db', text: '#1a56db' },
  'Blocked':     { fill: '#fff5f5', border: '#c53030', text: '#c53030' },
  'Not Started': { fill: '#fafaf8', border: '#ccc',    text: '#888' },
};

@Component({
  selector: 'app-dependency-graph',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="graph-panel">
      <div class="graph-panel__header">
        <h3>Grafo de dependencias</h3>
        <div class="legend">
          <span class="legend-item" *ngFor="let s of legendItems">
            <span class="legend-dot" [style.background]="s.color"></span>{{ s.label }}
          </span>
        </div>
        <button class="close-btn" (click)="close.emit()">✕</button>
      </div>
      <div class="graph-scroll">
        <svg [attr.width]="svgWidth()" [attr.height]="svgHeight()" class="graph-svg">
          <!-- Edges -->
          <g *ngFor="let e of edges()">
            <path [attr.d]="edgePath(e)"
                  [attr.stroke]="e.blocked ? '#c53030' : '#ccc'"
                  [attr.stroke-dasharray]="e.blocked ? '5,4' : 'none'"
                  stroke-width="2" fill="none" marker-end="url(#arrow)" />
          </g>
          <!-- Arrow marker -->
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#ccc" />
            </marker>
          </defs>
          <!-- Nodes -->
          <g *ngFor="let n of nodes()" class="node"
             [attr.transform]="'translate(' + n.x + ',' + n.y + ')'">
            <rect [attr.width]="NODE_W" [attr.height]="NODE_H" rx="10"
                  [attr.fill]="nodeStyle(n).fill"
                  [attr.stroke]="nodeStyle(n).border"
                  stroke-width="1.5" />
            <text x="10" y="20" font-size="11" font-weight="600"
                  [attr.fill]="nodeStyle(n).text" class="node-id">
              {{ n.task.id }}
            </text>
            <foreignObject x="10" y="26" [attr.width]="NODE_W - 20" height="26">
              <div xmlns="http://www.w3.org/1999/xhtml" class="node-title">
                {{ n.task.title }}
              </div>
            </foreignObject>
            <circle *ngIf="n.task.is_qbr" [attr.cx]="NODE_W - 12" cy="12" r="5"
                    fill="#1a56db" opacity="0.8" />
          </g>
        </svg>
      </div>
    </div>
  `,
  styleUrl: './dependency-graph.component.scss'
})
export class DependencyGraphComponent {
  @Input() tasks: Task[] = [];
  @Output() close = new EventEmitter<void>();

  readonly NODE_W = NODE_W;
  readonly NODE_H = NODE_H;

  readonly legendItems = [
    { label: 'Completada',   color: '#276749' },
    { label: 'En progreso',  color: '#1a56db' },
    { label: 'Bloqueada',    color: '#c53030' },
    { label: 'Sin iniciar',  color: '#ccc' },
    { label: '● QBR',        color: '#1a56db' },
  ];

  private isBlocked(task: Task): boolean {
    if (task.status === 'Completed') return false;
    if (!task.dependency_id) return false;
    const dep = this.tasks.find(t => t.id === task.dependency_id);
    return !!dep && dep.status !== 'Completed';
  }

  private effectiveStatus(task: Task): string {
    return this.isBlocked(task) ? 'Blocked' : task.status;
  }

  readonly nodes = computed(() => {
    if (!this.tasks.length) return [] as NodePos[];
    const statusMap = new Map(this.tasks.map(t => [t.id, t]));

    // Calculate depth per task
    const depth = new Map<string, number>();
    const getDepth = (id: string, visited = new Set<string>()): number => {
      if (depth.has(id)) return depth.get(id)!;
      if (visited.has(id)) return 0;
      visited.add(id);
      const task = statusMap.get(id);
      if (!task?.dependency_id || !statusMap.has(task.dependency_id)) {
        depth.set(id, 0); return 0;
      }
      const d = getDepth(task.dependency_id, visited) + 1;
      depth.set(id, d); return d;
    };
    this.tasks.forEach(t => getDepth(t.id));

    // Group by column (depth)
    const cols = new Map<number, Task[]>();
    this.tasks.forEach(t => {
      const d = depth.get(t.id) ?? 0;
      if (!cols.has(d)) cols.set(d, []);
      cols.get(d)!.push(t);
    });

    const nodes: NodePos[] = [];
    cols.forEach((colTasks, col) => {
      colTasks.forEach((task, row) => {
        nodes.push({
          task,
          x: 20 + col * COL_GAP,
          y: 20 + row * ROW_GAP,
          effectiveStatus: this.effectiveStatus(task),
        });
      });
    });
    return nodes;
  });

  readonly edges = computed((): Edge[] => {
    const nodeMap = new Map(this.nodes().map(n => [n.task.id, n]));
    return this.tasks
      .filter(t => t.dependency_id && nodeMap.has(t.dependency_id))
      .map(t => {
        const from = nodeMap.get(t.dependency_id!)!;
        const to   = nodeMap.get(t.id)!;
        return {
          x1: from.x + NODE_W, y1: from.y + NODE_H / 2,
          x2: to.x,            y2: to.y + NODE_H / 2,
          blocked: this.isBlocked(t),
        };
      });
  });

  readonly svgWidth  = computed(() => Math.max(600, ...this.nodes().map(n => n.x + NODE_W + 40)));
  readonly svgHeight = computed(() => Math.max(300, ...this.nodes().map(n => n.y + NODE_H + 40)));

  edgePath(e: Edge): string {
    const cx = (e.x1 + e.x2) / 2;
    return `M${e.x1},${e.y1} C${cx},${e.y1} ${cx},${e.y2} ${e.x2},${e.y2}`;
  }

  nodeStyle(n: NodePos) {
    return STATUS_COLORS[n.effectiveStatus] ?? STATUS_COLORS['Not Started'];
  }
}
