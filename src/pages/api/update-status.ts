import type { APIRoute } from 'astro';
import { updateOrderStatus } from '../../lib/woocommerce';
import { triggerOrderUpdate } from '../../lib/pusher';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return new Response(JSON.stringify({ success: false, error: 'Faltan parámetros obligatorios (orderId y status).' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updatedOrder = await updateOrderStatus(Number(orderId), status);
    
    // Transmitir la actualización por Pusher a todos los clientes conectados en tiempo real
    await triggerOrderUpdate('updated', updatedOrder);

    return new Response(JSON.stringify({ success: true, order: updatedOrder }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error al actualizar el pedido:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
