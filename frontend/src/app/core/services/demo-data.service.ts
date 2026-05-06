import { Injectable } from '@angular/core';
import { Task } from '../models/clan.models';

@Injectable({ providedIn: 'root' })
export class DemoDataService {
  readonly tasks: Task[] = [
    { id: '1', title: 'Diseño Base de Datos',   clan_owner: 'Data',     status: 'Completed',  is_qbr: true,  priority: 3 },
    { id: '2', title: 'API de Autenticación',    clan_owner: 'Core',     status: 'Blocked',    is_qbr: true,  priority: 5, dependency_id: '4' },
    { id: '3', title: 'Landing Page Q2',         clan_owner: 'Frontend', status: 'In Progress',is_qbr: false, priority: 2 },
    { id: '4', title: 'Configuración Vault',     clan_owner: 'Infra',    status: 'In Progress',is_qbr: true,  priority: 4 },
    { id: '5', title: 'Pipeline de Datos',       clan_owner: 'Data',     status: 'Not Started',is_qbr: true,  priority: 4, dependency_id: '1' },
    { id: '6', title: 'Auth Mobile SDK',         clan_owner: 'Mobile',   status: 'Blocked',    is_qbr: true,  priority: 5, dependency_id: '2' },
  ];

  parseCsv(content: string): Task[] {
    const lines   = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map((line, i) => {
      const vals: Record<string, string> = {};
      line.split(',').forEach((v, idx) => vals[headers[idx]] = v.trim());
      return {
        id:               vals['id'] ?? String(i + 1),
        title:            vals['title'] ?? '',
        clan_owner:       vals['clan_owner'] ?? '',
        status:           (vals['status'] as Task['status']) ?? 'Not Started',
        is_qbr:           vals['is_qbr'] === 'true',
        priority:         parseInt(vals['priority'] ?? '1', 10),
        dependency_id:    vals['dependency_id'] || undefined,
        effort_estimated: vals['effort_estimated'] ? parseFloat(vals['effort_estimated']) : undefined,
      };
    });
  }

  parseJson(content: string): Task[] {
    return JSON.parse(content) as Task[];
  }
}
