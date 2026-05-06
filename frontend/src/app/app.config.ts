import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/login/login.component';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter([
      { path: 'login', component: LoginComponent },
      {
        path: '',
        canActivate: [authGuard],
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'executive',
        canActivate: [authGuard],
        loadComponent: () => import('./features/executive/executive.component').then(m => m.ExecutiveComponent),
      },
      { path: '**', redirectTo: '' },
    ]),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
  ]
};
