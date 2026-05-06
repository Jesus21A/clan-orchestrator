import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'Error desconocido';
      if (error.status === 0) {
        message = 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo en http://localhost:8000';
      } else if (error.status === 500) {
        message = error.error?.detail ?? 'Error interno del servidor';
      } else if (error.status === 502) {
        message = error.error?.detail ?? 'Error al contactar Claude API';
      }
      return throwError(() => new Error(message));
    })
  );
};
