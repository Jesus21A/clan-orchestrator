import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Task, TaskCreate, TaskUpdate, AnalyzeResponse, OrchestratorMetrics, AnalysisType } from '../models/clan.models';

@Injectable({ providedIn: 'root' })
export class ClanApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.base}/tasks`);
  }

  createTask(task: TaskCreate): Observable<Task> {
    return this.http.post<Task>(`${this.base}/tasks`, task);
  }

  updateTask(id: string, task: TaskUpdate): Observable<Task> {
    return this.http.put<Task>(`${this.base}/tasks/${id}`, task);
  }

  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/tasks/${id}`);
  }

  getMetrics(qbrPeriod?: string | null): Observable<{ metrics: OrchestratorMetrics }> {
    let params = new HttpParams();
    if (qbrPeriod) params = params.set('qbr_period', qbrPeriod);
    return this.http.get<{ metrics: OrchestratorMetrics }>(`${this.base}/metrics`, { params });
  }

  analyze(analysisType: AnalysisType, qbrPeriod?: string | null): Observable<AnalyzeResponse> {
    return this.http.post<AnalyzeResponse>(`${this.base}/analyze`, {
      analysis_type: analysisType,
      qbr_period: qbrPeriod ?? null,
    });
  }
}
