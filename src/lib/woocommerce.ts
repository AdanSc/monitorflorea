const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL || process.env.WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY || process.env.WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET || process.env.WOOCOMMERCE_CONSUMER_SECRET;

// Obtener token de autenticación básica de manera compatible con Node y Edge
function getAuthHeader() {
  if (!WOOCOMMERCE_URL || !CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new Error('Faltan las credenciales de WooCommerce en las variables de entorno.');
  }

  const credentials = `${CONSUMER_KEY}:${CONSUMER_SECRET}`;
  const base64 = typeof Buffer !== 'undefined'
    ? Buffer.from(credentials).toString('base64')
    : btoa(credentials);
  
  return `Basic ${base64}`;
}

// Normalizar la URL de WooCommerce
function getApiUrl(path: string, params: Record<string, string> = {}) {
  const baseUrl = WOOCOMMERCE_URL!.replace(/\/$/, '');
  const url = new URL(`${baseUrl}/wp-json/wc/v3/${path.replace(/^\//, '')}`);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  
  return url.toString();
}

export interface WooCommerceOrder {
  id: number;
  parent_id: number;
  number: string;
  status: string;
  currency: string;
  date_created: string;
  date_modified: string;
  discount_total: string;
  shipping_total: string;
  total: string;
  total_tax: string;
  billing: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  customer_note: string;
  meta_data?: Array<{
    id?: number;
    key: string;
    value: any;
  }>;
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    variation_id: number;
    quantity: number;
    tax_class: string;
    subtotal: string;
    subtotal_tax: string;
    total: string;
    total_tax: string;
    price: number;
    image?: {
      id?: number;
      src?: string;
    };
    meta_data?: Array<{
      id?: number;
      key: string;
      value: any;
      display_key?: string;
      display_value?: any;
    }>;
  }>;
}

export async function fetchOrders(params: Record<string, string> = {}): Promise<WooCommerceOrder[]> {
  const defaultParams = {
    orderby: 'date',
    order: 'desc',
    per_page: '30',
    ...params
  };

  const url = getApiUrl('orders', defaultParams);
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': getAuthHeader(),
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error de WooCommerce API (fetchOrders): ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

export async function updateOrderStatus(orderId: number, status: string): Promise<WooCommerceOrder> {
  const url = getApiUrl(`orders/${orderId}`);
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': getAuthHeader(),
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error de WooCommerce API (updateOrderStatus): ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}
