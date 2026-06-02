import type { APIRoute } from 'astro';
import crypto from 'crypto';
import { triggerOrderUpdate } from '../../lib/pusher';

export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-wc-webhook-signature');
    const topic = request.headers.get('x-wc-webhook-topic') || '';
    const webhookSecret = import.meta.env.WOOCOMMERCE_WEBHOOK_SECRET || process.env.WOOCOMMERCE_WEBHOOK_SECRET;

    console.log(`[DEBUG Webhook] Topic: "${topic}". Headers recibidos:`, Object.fromEntries(request.headers));
    console.log(`[DEBUG Webhook] Body:`, rawBody);

    const isPing = topic === 'webhook.ping' || rawBody.includes('webhook_id=');

    if (isPing) {
      console.log('Recibido ping de WooCommerce. Bypassing validación de firma para permitir el guardado.');
      return new Response(JSON.stringify({ success: true, message: 'Ping recibido' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar firma si está configurada en las variables de entorno
    if (webhookSecret) {
      if (!signature) {
        console.error('Webhook: Falta la firma (header x-wc-webhook-signature).');
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
        console.error(`Webhook Error de Firma:`);
        console.error(`- Recibida (header): ${signature}`);
        console.error(`- Calculada:         ${computedSignature}`);
        console.error(`- Secreto usado:     ${webhookSecret.substring(0, 3)}... (longitud: ${webhookSecret.length})`);
        console.error(`- Body recibido:     ${rawBody}`);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Firma inválida.',
          details: { received: signature, computed: computedSignature }
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }



    let order: any;
    try {
      order = JSON.parse(rawBody);
    } catch (e) {
      console.error('Error al parsear el body del webhook:', rawBody);
      return new Response(JSON.stringify({ success: false, error: 'Body inválido' }), { status: 400 });
    }
    
    // Determinar el tipo de evento (created o updated)
    const event = topic.includes('created') ? 'created' : 'updated';
    
    console.log(`Recibido webhook de WooCommerce. Evento: ${event}, Pedido ID: ${order?.id}`);

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
