import type { APIRoute } from 'astro';
import { fetchOrders } from '../../lib/woocommerce';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || undefined;
    const search = url.searchParams.get('search') || undefined;
    const page = url.searchParams.get('page') || '1';
    
    const params: Record<string, string> = {
      page
    };
    
    if (status && status !== 'all') {
      params.status = status;
    }
    if (search) {
      params.search = search;
    }

    const orders = await fetchOrders(params);
    return new Response(JSON.stringify({ success: true, orders }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error: any) {
    console.error('Error al obtener pedidos:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
