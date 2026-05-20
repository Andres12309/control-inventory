import { useLocalSearchParams } from 'expo-router';

import ProductoForm from '@/components/inventario/ProductoForm';

export default function EditarProductoScreen() {
  const { codpro } = useLocalSearchParams<{ codpro: string }>();
  return <ProductoForm codpro={codpro} />;
}
