import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

interface LoginResponse { token: string; clan: string; is_admin: boolean; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base   = environment.apiUrl;

  private readonly _token   = signal<string | null>(localStorage.getItem('clan_token'));
  private readonly _clan    = signal<string | null>(localStorage.getItem('clan_name'));
  private readonly _isAdmin = signal<boolean>(localStorage.getItem('clan_is_admin') === 'true');

  readonly isAuthenticated = computed(() => !!this._token());
  readonly currentClan     = computed(() => this._clan());
  readonly isAdmin         = computed(() => this._isAdmin());
  readonly token           = computed(() => this._token());

  login(clan: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/auth/login`, { clan, password }).pipe(
      tap(res => {
        localStorage.setItem('clan_token',    res.token);
        localStorage.setItem('clan_name',     res.clan);
        localStorage.setItem('clan_is_admin', String(res.is_admin));
        this._token.set(res.token);
        this._clan.set(res.clan);
        this._isAdmin.set(res.is_admin);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('clan_token');
    localStorage.removeItem('clan_name');
    localStorage.removeItem('clan_is_admin');
    this._token.set(null);
    this._clan.set(null);
    this._isAdmin.set(false);
    this.router.navigate(['/login']);
  }
}
