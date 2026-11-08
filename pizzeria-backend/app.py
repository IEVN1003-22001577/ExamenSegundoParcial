from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from datetime import datetime

app = Flask(__name__)
CORS(app)

db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'pizzeria_db'
}

@app.route('/api/pedidos', methods=['POST'])
def guardar_pedido():
    try:
        datos = request.get_json()
        
        nombre = datos.get('nombre')
        direccion = datos.get('direccion')
        telefono = datos.get('telefono')
        total = datos.get('total')
        detalles = datos.get('detalles', [])

        ahora = datetime.now()
        fecha_pedido = ahora.strftime('%Y-%m-%d')
        dia_semana = ahora.strftime('%A')
        mes = ahora.strftime('%B')

        conexion = mysql.connector.connect(**db_config)
        cursor = conexion.cursor()

        sql_pedido = """
            INSERT INTO pedidos (nombre, direccion, telefono, fecha_pedido, dia_semana, mes, total) 
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(sql_pedido, (nombre, direccion, telefono, fecha_pedido, dia_semana, mes, total))
        pedido_id = cursor.lastrowid

        for item in detalles:
            sql_detalle = """
                INSERT INTO detalle_pedidos (pedido_id, tamanio, ingredientes, num_pizzas, subtotal) 
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(sql_detalle, (
                pedido_id, 
                item['tamanio'], 
                item['ingredientes'], 
                item['numPizzas'], 
                item['subtotal']
            ))

        conexion.commit()
        cursor.close()
        conexion.close()

        return jsonify({'mensaje': '¡Pedido guardado con éxito!', 'id': pedido_id}), 201

    except Exception as e:
        print("Error en Flask:", e)
        return jsonify({'error': str(e)}), 500


@app.route('/api/ventas-dia', methods=['GET'])
def obtener_ventas_dia():
    try:
        conexion = mysql.connector.connect(**db_config)
        cursor = conexion.cursor(dictionary=True)
        
        sql = "SELECT id, nombre, total, fecha_pedido, dia_semana, mes FROM pedidos"
        cursor.execute(sql)
        ventas = cursor.fetchall()
        
        total_dia = sum(float(item['total']) for item in ventas)
        
        cursor.close()
        conexion.close()
        
        return jsonify({
            'ventas': ventas,
            'total_dia': total_dia
        }), 200

    except Exception as e:
        print("Error al consultar ventas:", e)
        return jsonify({'error': str(e)}), 500


@app.route('/api/ventas/filtrar', methods=['GET'])
def filtrar_ventas():
    try:
        dia = request.args.get('dia')
        mes = request.args.get('mes')
        
        conexion = mysql.connector.connect(**db_config)
        cursor = conexion.cursor(dictionary=True)
        
        sql = "SELECT id, nombre, total, fecha_pedido, dia_semana, mes FROM pedidos WHERE 1=1"
        params = []
        
        if dia:
            sql += " AND dia_semana = %s"
            params.append(dia)
        if mes:
            sql += " AND mes = %s"
            params.append(mes)
            
        cursor.execute(sql, tuple(params))
        ventas = cursor.fetchall()
        
        total_filtrado = sum(float(item['total']) for item in ventas)
        
        cursor.close()
        conexion.close()
        
        return jsonify({
            'ventas': ventas,
            'total_filtrado': total_filtrado
        }), 200

    except Exception as e:
        print("Error al filtrar ventas:", e)
        return jsonify({'error': str(e)}), 500


@app.route('/api/pedidos/<int:pedido_id>/detalle', methods=['GET'])
def ver_detalle_pedido(pedido_id):
    try:
        conexion = mysql.connector.connect(**db_config)
        cursor = conexion.cursor(dictionary=True)
        
        sql = "SELECT tamanio, ingredientes, num_pizzas, subtotal FROM detalle_pedidos WHERE pedido_id = %s"
        cursor.execute(sql, (pedido_id,))
        detalles = cursor.fetchall()
        
        cursor.close()
        conexion.close()
        
        return jsonify({'detalles': detalles}), 200

    except Exception as e:
        print("Error al consultar detalle:", e)
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)