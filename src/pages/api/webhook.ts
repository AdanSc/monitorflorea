import type { APIRoute } from 'astro';
import crypto from 'crypto';
import { triggerOrderUpdate } from '../../lib/pusher';

export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-wc-webhook-signature');
    const topic = request.headers.get('x-wc-webhook-topic') || '';
    const webhookSecret = import.meta.env.WOOCOMMERCE_WEBHOOK_SECRET || process.env.WOOCOMMERCE_WEBHOOK_SECRET;

    // Verificar firma si está configurada en las variables de entorno
    if (webhookSecret) {
      if (!signature) {
        return new Response(JSON.stringify({ success: false, error: 'Falta la firma del webhook.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const computedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody, 'utf8')
        .digest('base64');

      if (computedSignature !== signature) {
        console.warn('Firma del webhook de WooCommerce inválida.');
        return new Response(JSON.stringify({ success: false, error: 'Firma inválida.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const order = JSON.parse(rawBody);
    
    // Determinar el tipo de evento (created o updated)
    const event = topic.includes('created') ? 'created' : 'updated';
    
    console.log(`Recibido webhook de WooCommerce. Evento: ${event}, Pedido ID: ${order.id}`);

    // Transmitir a Pusher en tiempo real
    await triggerOrderUpdate(event, order);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error al procesar webhook de WooCommerce:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ message: 'El endpoint de Webhook está activo y esperando peticiones POST desde WooCommerce.' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
