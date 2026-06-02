import Pusher from 'pusher';

const appId = import.meta.env.PUSHER_APP_ID || process.env.PUSHER_APP_ID;
const key = import.meta.env.PUBLIC_PUSHER_KEY || process.env.PUBLIC_PUSHER_KEY;
const secret = import.meta.env.PUSHER_SECRET || process.env.PUSHER_SECRET;
const cluster = import.meta.env.PUBLIC_PUSHER_CLUSTER || process.env.PUBLIC_PUSHER_CLUSTER;

let pusherInstance: Pusher | null = null;

if (appId && key && secret && cluster) {
  pusherInstance = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true
  });
} else {
  console.warn('Pusher no está configurado en las variables de entorno. Las actualizaciones en tiempo real instantáneas están desactivadas.');
}

export async function triggerOrderUpdate(event: 'created' | 'updated', order: any) {
  if (!pusherInstance) {
    return;
  }

  try {
    await pusherInstance.trigger('orders-channel', `order-${event}`, {
      id: order.id,
      number: order.number,
      status: order.status,
      total: order.total,
      billing: {
        first_name: order.billing?.first_name || '',
        last_name: order.billing?.last_name || '',
      },
      date_created: order.date_created,
      line_items: order.line_items?.map((item: any) => ({
        name: item.name,
        quantity: item.quantity
      })) || [],
      order: order
    });
    console.log(`Evento 'order-${event}' transmitido a Pusher para el pedido #${order.id}`);
  } catch (error) {
    console.error('Error al enviar el evento a Pusher:', error);
  }
}
