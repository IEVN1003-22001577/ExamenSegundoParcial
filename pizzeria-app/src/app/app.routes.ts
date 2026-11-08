import { Routes } from '@angular/router';
import { Pizzeria } from './pizzeria/pizzeria';

export const routes: Routes = [
  { path: '', component: Pizzeria },
  { path: '**', redirectTo: '' }
];