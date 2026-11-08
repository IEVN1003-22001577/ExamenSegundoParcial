import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-pizzeria',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, HttpClientModule],
  templateUrl: './pizzeria.html'
})
export class Pizzeria {
  formPizzeria: FormGroup;
  listaDetalle: any[] = [];
  totalGeneral: number = 0;
  mensajeConfirmacion: string = '';

  // Variables para las ventas del día
  ventasDelDia: any[] = [];
  totalVentasDia: number = 0;

  // Variables para filtros y detalle
  filtroDia: string = '';
  filtroMes: string = '';
  ventasFiltradas: any[] = [];
  totalFiltrado: number = 0;
  detallePedidoSeleccionado: any[] = [];

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.formPizzeria = this.fb.group({
      nombre: ['', Validators.required],
      direccion: ['', Validators.required],
      telefono: ['', Validators.required],
      tamanio: ['Chica', Validators.required],
      ingredientes: this.fb.group({
        jamon: [false],
        pina: [false],
        champinones: [false]
      }),
      numPizzas: [1, [Validators.required, Validators.min(1)]]
    });
  }

  agregarPizza() {
    const val = this.formPizzeria.value;
    let precioBase = 0;

    if (val.tamanio === 'Chica') precioBase = 40;
    if (val.tamanio === 'Mediana') precioBase = 80;
    if (val.tamanio === 'Grande') precioBase = 120;

    let extraIngredientes = 0;
    const ingSeleccionados: string[] = [];
    if (val.ingredientes.jamon) { extraIngredientes += 10; ingSeleccionados.push('Jamón'); }
    if (val.ingredientes.pina) { extraIngredientes += 10; ingSeleccionados.push('Piña'); }
    if (val.ingredientes.champinones) { extraIngredientes += 10; ingSeleccionados.push('Champiñones'); }

    const subtotal = (precioBase + extraIngredientes) * val.numPizzas;

    const itemDetalle = {
      tamanio: val.tamanio,
      ingredientes: ingSeleccionados.length > 0 ? ingSeleccionados.join(', ') : 'Ninguno',
      numPizzas: val.numPizzas,
      subtotal: subtotal
    };

    this.listaDetalle.push(itemDetalle);
    this.calcularTotal();
  }

  quitarPizza(index: number) {
    this.listaDetalle.splice(index, 1);
    this.calcularTotal();
  }

  calcularTotal() {
    this.totalGeneral = this.listaDetalle.reduce((acc, item) => acc + item.subtotal, 0);
  }

  terminarPedido() {
    if (this.listaDetalle.length === 0) {
      alert('Agrega al menos una pizza al pedido');
      return;
    }

    const pedidoData = {
      nombre: this.formPizzeria.value.nombre,
      direccion: this.formPizzeria.value.direccion,
      telefono: this.formPizzeria.value.telefono,
      detalles: this.listaDetalle,
      total: this.totalGeneral
    };

    this.http.post('http://localhost:5000/api/pedidos', pedidoData).subscribe({
      next: (res: any) => {
        this.mensajeConfirmacion = '¡Pedido guardado y registrado con éxito en MySQL!';
        alert(this.mensajeConfirmacion);
        this.listaDetalle = [];
        this.totalGeneral = 0;
        this.formPizzeria.reset({ tamanio: 'Chica', numPizzas: 1 });
        
        // Refrescar automáticamente las ventas al terminar un pedido
        this.consultarVentasDia();
      },
      error: (err: any) => {
        console.error('Error al guardar:', err);
        alert('Hubo un error al conectar con el servidor de Flask.');
      }
    });
  }

  consultarVentasDia() {
    this.http.get('http://localhost:5000/api/ventas-dia').subscribe({
      next: (res: any) => {
        this.ventasDelDia = res.ventas;
        this.totalVentasDia = res.total_dia;
      },
      error: (err) => {
        console.error('Error al obtener ventas:', err);
        alert('Error al consultar las ventas del día.');
      }
    });
  }

  consultarPorFiltro() {
    let url = 'http://localhost:5000/api/ventas/filtrar?';
    if (this.filtroDia) url += `dia=${this.filtroDia}&`;
    if (this.filtroMes) url += `mes=${this.filtroMes}`;

    this.http.get(url).subscribe({
      next: (res: any) => {
        this.ventasFiltradas = res.ventas;
        this.totalFiltrado = res.total_filtrado;
      },
      error: (err) => console.error('Error al filtrar:', err)
    });
  }

  verDetalle(pedidoId: number) {
    this.http.get(`http://localhost:5000/api/pedidos/${pedidoId}/detalle`).subscribe({
      next: (res: any) => {
        this.detallePedidoSeleccionado = res.detalles;
      },
      error: (err) => console.error('Error al ver detalle:', err)
    });
  }
}