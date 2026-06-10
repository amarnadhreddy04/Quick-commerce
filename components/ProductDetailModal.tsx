import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import ProductCartControls from '@/components/ProductCartControls';
import ProductDetailGallery from '@/components/ProductDetailGallery';
import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { getProductStock, isOutOfStock } from '@/lib/productStock';
import type { Product } from '@/types';

type Props = {
  product: Product | null;
  onClose: () => void;
};

export default function ProductDetailModal({ product, onClose }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  if (!product) return null;

  const stock = getProductStock(product);
  const outOfStock = isOutOfStock(product);
  const discount = product.mrp ? product.mrp - product.price : 0;
  const description =
    product.description?.trim() ||
    'Fresh quality product delivered to your doorstep with Milkbasket morning delivery.';

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            Product Details
          </Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <ProductDetailGallery product={product} />

          <View style={styles.body}>
            <Text style={[styles.brand, { color: colors.textSecondary }]}>{product.brand}</Text>
            <Text style={[styles.name, { color: colors.text }]}>{product.name}</Text>
            <Text style={[styles.unit, { color: colors.textSecondary }]}>{product.unit}</Text>

            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: colors.text }]}>₹{product.price}</Text>
              {product.mrp ? (
                <Text style={[styles.mrp, { color: colors.textSecondary }]}>₹{product.mrp}</Text>
              ) : null}
              {discount > 0 ? (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>₹{discount} OFF</Text>
                </View>
              ) : null}
            </View>

            {product.tag ? (
              <View style={[styles.tagBadge, { backgroundColor: colors.wallet }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>{product.tag}</Text>
              </View>
            ) : null}

            {product.subscription ? (
              <View style={[styles.tagBadge, { backgroundColor: colors.wallet }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>Subscription available</Text>
              </View>
            ) : null}

            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
              <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>{description}</Text>
            </View>

            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Product details</Text>
              <DetailRow label="Brand" value={product.brand} colors={colors} />
              <DetailRow label="Unit" value={product.unit} colors={colors} />
              <DetailRow label="Price" value={`₹${product.price}`} colors={colors} />
              {product.mrp ? <DetailRow label="MRP" value={`₹${product.mrp}`} colors={colors} /> : null}
              <DetailRow
                label="Availability"
                value={outOfStock ? 'Out of stock' : `${stock} in stock`}
                colors={colors}
              />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={styles.footerInfo}>
            <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>
              {outOfStock ? 'Currently unavailable' : 'Add to basket'}
            </Text>
            <Text style={[styles.footerPrice, { color: colors.text }]}>₹{product.price}</Text>
          </View>
          <ProductCartControls product={product} showNotifyText />
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: (typeof Colors)['light'];
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  brand: {
    fontSize: 13,
    fontWeight: '600',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  unit: {
    fontSize: 14,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
  },
  mrp: {
    fontSize: 15,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#FBBF24',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  tagBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginTop: spacing.xs,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  footerInfo: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 12,
  },
  footerPrice: {
    fontSize: 18,
    fontWeight: '800',
  },
});
