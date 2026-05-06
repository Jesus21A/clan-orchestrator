import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CLANS } from '../../core/models/clan.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-shell">
      <div class="login-card">
        <div class="login-card__brand">
          <span class="brand-icon">◈</span>
          <h1>Clan Orchestrator</h1>
          <p>Inicia sesión con las credenciales de tu clan</p>
        </div>

        <form class="login-form" (ngSubmit)="submit()">
          <div class="field">
            <label>Clan</label>
            <select [(ngModel)]="clan" name="clan">
              <option value="admin">Admin</option>
              <option *ngFor="let c of clans" [value]="c">{{ c }}</option>
            </select>
          </div>
          <div class="field">
            <label>Contraseña</label>
            <input type="password" [(ngModel)]="password" name="password"
                   placeholder="••••••••" autocomplete="current-password" />
          </div>

          <div class="error-msg" *ngIf="error()">{{ error() }}</div>

          <button type="submit" class="btn-login" [disabled]="loading()">
            {{ loading() ? 'Ingresando...' : 'Ingresar' }}
          </button>
        </form>

        <div class="login-card__hint">
          <strong>Credenciales de prueba:</strong><br>
          Admin: <code>admin</code> / <code>admin2025</code>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-shell {
      min-height: 100vh; background: #f5f5f3;
      display: flex; align-items: center; justify-content: center;
    }
    .login-card {
      background: #fff; border: 1px solid #e8e6e0; border-radius: 20px;
      padding: 2.5rem 2rem; width: 100%; max-width: 400px;
      display: flex; flex-direction: column; gap: 1.5rem;
    }
    .login-card__brand { text-align: center; }
    .brand-icon { font-size: 2rem; color: #1a56db; }
    h1 { font-size: 1.3rem; font-weight: 700; color: #111; margin: 0.5rem 0 0.25rem; }
    p  { font-size: 0.82rem; color: #888; margin: 0; }
    .login-form { display: flex; flex-direction: column; gap: 1rem; }
    .field { display: flex; flex-direction: column; gap: 5px; }
    label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
            letter-spacing: 0.05em; color: #888; }
    input, select {
      padding: 0.6rem 0.85rem; border: 1px solid #e0e0dc; border-radius: 10px;
      font-size: 0.88rem; color: #222; font-family: inherit;
      &:focus { outline: none; border-color: #1a56db; }
    }
    .error-msg { font-size: 0.8rem; color: #c53030; text-align: center; }
    .btn-login {
      padding: 0.7rem; background: #1a56db; color: #fff;
      border: none; border-radius: 10px; font-size: 0.9rem;
      font-weight: 600; cursor: pointer; margin-top: 0.25rem;
      &:hover:not(:disabled) { background: #1447b8; }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }
    .login-card__hint {
      font-size: 0.75rem; color: #aaa; text-align: center; line-height: 1.6;
      code { background: #f5f5f3; padding: 1px 5px; border-radius: 4px; color: #555; }
    }
  `]
})
export class LoginComponent {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  readonly clans   = CLANS;
  clan     = 'Microfinanzas';
  password = '';
  loading  = signal(false);
  error    = signal('');

  submit(): void {
    if (!this.password.trim()) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.clan, this.password).subscribe({
      next: () => this.router.navigate(['/']),
      error: () => {
        this.error.set('Contraseña incorrecta');
        this.loading.set(false);
      }
    });
  }
}
