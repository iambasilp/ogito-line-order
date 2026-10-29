import type { MarketStudyObservation } from '@/types';

export interface VariantRowItem {
  id: string; // client-side temporary unique ID for stable React keys
  _id?: string; // MongoDB persisted _id when editing an existing survey
  variant: string; // Flavour / variant / label (e.g. "Regular", "Vanilla", "Ragi")
  weight: string; // Weight / volume (e.g. "500 g", "1 kg", "1 Litre")
  packagingType: string; // Packaging type (e.g. "Pouch", "Box", "Tub", "Cone")
  landingPrice: number | ''; // Landing price in INR
  sellingPrice: number | ''; // Selling price in INR
  mrp: number | ''; // MRP in INR
  promotionNotes?: string; // Specific promo scheme notes
  notes?: string; // Variant notes
  createdAt?: string;
  showNotes?: boolean; // UI flag to show notes sub-row
}

export interface ProductGroupItem {
  id: string; // client-side unique ID
  catalogueProductId?: string; // Reference to catalogue item if selected
  catalogueProductName: string; // Catalogue product or custom product name
  brandName: string; // Common brand name entered ONCE per product group
  isExpanded: boolean; // Accordion toggle state
  variants: VariantRowItem[]; // Sub-variants under this product
}

/**
 * Generate a unique client-side key for React items
 */
export function generateUiId(prefix = 'item'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Deterministic group key to group observations by product identity + brand.
 * 
 * Hierarchy Rule:
 * 1. Product identity is determined by catalogueProductId when present.
 * 2. If catalogueProductId is missing, fallback to trimmed, case-insensitive catalogueProductName.
 * 3. Brand identity is determined by trimmed, case-insensitive brandName.
 * 
 * Distinct catalogue products (e.g. Macaroni vs Fusilli) produce DIFFERENT keys.
 * Distinct brands for the same product (e.g. PASTIO vs Bambino) produce DIFFERENT keys.
 * Same product and same brand with multiple variants/sizes/packaging produce the SAME key.
 */
export function getProductGroupKey(
  catalogueProductId?: string,
  catalogueProductName?: string,
  brandName?: string
): string {
  const prodKey = catalogueProductId && String(catalogueProductId).trim()
    ? `id:${String(catalogueProductId).trim()}`
    : `name:${(catalogueProductName || 'General Product').trim().toLowerCase()}`;

  const brandKey = (brandName || '').trim().toLowerCase();
  return `${prodKey}:::brand:${brandKey}`;
}

/**
 * Groups a flat array of MarketStudyObservation objects into ProductGroupItem[]
 * for the UI form. Preserves all existing IDs, packaging types, weights, prices,
 * and notes without dropping or merging distinct products.
 */
export function groupObservationsIntoProducts(
  observations: MarketStudyObservation[]
): ProductGroupItem[] {
  if (!Array.isArray(observations) || observations.length === 0) {
    return [];
  }

  const groupMap = new Map<
    string,
    {
      catalogueProductId?: string;
      catalogueProductName: string;
      brandName: string;
      variants: VariantRowItem[];
    }
  >();

  observations.forEach((obs, index) => {
    const prodId = obs.catalogueProductId ? String(obs.catalogueProductId).trim() : undefined;
    const prodName = (obs.catalogueProductName || 'General Product').trim();
    const brand = (obs.brandName || '').trim();

    const groupKey = getProductGroupKey(prodId, prodName, brand);

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        catalogueProductId: prodId,
        catalogueProductName: prodName,
        brandName: brand,
        variants: []
      });
    }

    const hasNotes = Boolean((obs.promotionNotes && obs.promotionNotes.trim()) || (obs.notes && obs.notes.trim()));

    groupMap.get(groupKey)!.variants.push({
      id: generateUiId(`var-${obs._id || index}`),
      _id: obs._id ? String(obs._id) : undefined,
      variant: obs.variant || '',
      weight: obs.weight || '',
      packagingType: obs.packagingType || '',
      landingPrice: obs.landingPrice !== undefined && obs.landingPrice !== null ? obs.landingPrice : '',
      sellingPrice: obs.sellingPrice !== undefined && obs.sellingPrice !== null ? obs.sellingPrice : '',
      mrp: obs.mrp !== undefined && obs.mrp !== null ? obs.mrp : '',
      promotionNotes: obs.promotionNotes || '',
      notes: obs.notes || '',
      createdAt: obs.createdAt ? String(obs.createdAt) : undefined,
      showNotes: hasNotes
    });
  });

  const result: ProductGroupItem[] = [];
  groupMap.forEach((val) => {
    result.push({
      id: generateUiId('group'),
      catalogueProductId: val.catalogueProductId,
      catalogueProductName: val.catalogueProductName,
      brandName: val.brandName,
      isExpanded: true,
      variants: val.variants
    });
  });

  return result;
}

/**
 * Transforms grouped ProductGroupItem[] back into flat MarketStudyObservation[]
 * matching the exact database schema and API contracts.
 */
export function flattenProductGroupsIntoObservations(
  productGroups: ProductGroupItem[]
): MarketStudyObservation[] {
  if (!Array.isArray(productGroups)) return [];

  const flattened: MarketStudyObservation[] = [];

  for (const group of productGroups) {
    const prodId = group.catalogueProductId || undefined;
    const prodName = group.catalogueProductName.trim() || 'General Product';
    const brand = group.brandName.trim();

    for (const v of group.variants) {
      const landing = v.landingPrice === '' ? 0 : Number(v.landingPrice) || 0;
      const selling = v.sellingPrice === '' ? 0 : Number(v.sellingPrice) || 0;
      const mrp = v.mrp === '' ? 0 : Number(v.mrp) || 0;

      flattened.push({
        _id: v._id || undefined, // Preserves existing MongoDB _id if present
        catalogueProductId: prodId,
        catalogueProductName: prodName,
        brandName: brand,
        variant: (v.variant || '').trim(),
        weight: (v.weight || '').trim(),
        packagingType: (v.packagingType || '').trim(),
        landingPrice: Math.max(0, landing),
        sellingPrice: Math.max(0, selling),
        mrp: Math.max(0, mrp),
        promotionNotes: (v.promotionNotes || '').trim(),
        notes: (v.notes || '').trim(),
        createdAt: v.createdAt || new Date().toISOString()
      });
    }
  }

  return flattened;
}

/**
 * Creates an independent duplicate of an existing variant row.
 * Clears the persisted MongoDB _id and assigns a fresh client-side id
 * so that saving does NOT cause duplicate key collisions.
 */
export function duplicateVariantRow(source: VariantRowItem): VariantRowItem {
  return {
    ...source,
    id: generateUiId('var-clone'),
    _id: undefined, // Fresh observation to be created
    createdAt: new Date().toISOString()
  };
}

/**
 * Creates a brand-new blank variant row with default values.
 */
export function createBlankVariantRow(initialWeight = '', defaultPackaging = 'Pouch'): VariantRowItem {
  return {
    id: generateUiId('var-new'),
    _id: undefined,
    variant: '',
    weight: initialWeight,
    packagingType: defaultPackaging,
    landingPrice: '',
    sellingPrice: '',
    mrp: '',
    promotionNotes: '',
    notes: '',
    createdAt: new Date().toISOString(),
    showNotes: false
  };
}

/**
 * Creates a brand-new product group with 1 empty initial variant.
 */
export function createNewProductGroup(
  catalogueProductId?: string,
  catalogueProductName = 'General Product',
  initialBrand = '',
  defaultPackaging = 'Pouch'
): ProductGroupItem {
  return {
    id: generateUiId('group-new'),
    catalogueProductId,
    catalogueProductName,
    brandName: initialBrand,
    isExpanded: true,
    variants: [createBlankVariantRow('', defaultPackaging)]
  };
}

/**
 * Profit and margin metrics calculation
 * Gross Profit = Selling Price - Landing Price
 * Margin (%) = ((Selling Price - Landing Price) / Selling Price) * 100
 */
export function calculateVariantMetrics(
  sellingPrice: number | '',
  landingPrice: number | '',
  mrp: number | ''
) {
  const selling = typeof sellingPrice === 'number' && !isNaN(sellingPrice) ? sellingPrice : 0;
  const landing = typeof landingPrice === 'number' && !isNaN(landingPrice) ? landingPrice : 0;
  const mrpVal = typeof mrp === 'number' && !isNaN(mrp) ? mrp : 0;

  const profit = selling > 0 && landing > 0 ? selling - landing : 0;
  const marginPercent = selling > 0 && landing > 0
    ? Number(((profit / selling) * 100).toFixed(1))
    : 0;

  const mrpDiff = mrpVal > 0 && selling > 0 ? mrpVal - selling : 0;
  const isSellingAboveMrp = mrpVal > 0 && selling > 0 && selling > mrpVal;
  const isLandingAboveSelling = selling > 0 && landing > 0 && landing > selling;

  return {
    profit,
    marginPercent,
    mrpDiff,
    isSellingAboveMrp,
    isLandingAboveSelling
  };
}

/**
 * Comprehensive survey validation before submission
 */
export function validateSurveySubmission(params: {
  customerName: string;
  collectedBy: string;
  status: 'draft' | 'completed';
  productGroups: ProductGroupItem[];
}): { isValid: boolean; error?: string } {
  const { customerName, collectedBy, status, productGroups } = params;

  if (!customerName.trim()) {
    return { isValid: false, error: 'Please select or enter a Customer / Shop Name.' };
  }

  if (!collectedBy.trim()) {
    return { isValid: false, error: 'Please provide a Surveyor / Collected By name.' };
  }

  const allVariants = productGroups.flatMap((g) => g.variants);

  // Drafts can be saved with partial records, provided shop is identified
  if (status === 'draft') {
    return { isValid: true };
  }

  // Completed surveys require at least 1 product and 1 variant
  if (productGroups.length === 0 || allVariants.length === 0) {
    return {
      isValid: false,
      error: 'Please add at least one product and variant to complete the survey.'
    };
  }

  for (let g = 0; g < productGroups.length; g++) {
    const grp = productGroups[g];
    const groupName = grp.catalogueProductName.trim() || `Product #${g + 1}`;

    if (!grp.brandName.trim()) {
      return {
        isValid: false,
        error: `Please select or enter a Brand Name for "${groupName}".`
      };
    }

    if (grp.variants.length === 0) {
      return {
        isValid: false,
        error: `Product "${groupName}" must contain at least one variant.`
      };
    }

    for (let v = 0; v < grp.variants.length; v++) {
      const vr = grp.variants[v];
      const variantDesc = vr.variant ? `"${vr.variant}"` : `#${v + 1}`;

      if (!vr.weight.trim()) {
        return {
          isValid: false,
          error: `Please enter Weight / Volume for "${groupName}" (${grp.brandName}) Variant ${variantDesc}.`
        };
      }

      const landing = vr.landingPrice === '' ? 0 : Number(vr.landingPrice);
      const selling = vr.sellingPrice === '' ? 0 : Number(vr.sellingPrice);
      const mrp = vr.mrp === '' ? 0 : Number(vr.mrp);

      if (isNaN(landing) || landing < 0) {
        return {
          isValid: false,
          error: `Invalid Landing Price for "${groupName}" (${grp.brandName}) Variant ${variantDesc}. Prices cannot be negative.`
        };
      }

      if (isNaN(selling) || selling < 0) {
        return {
          isValid: false,
          error: `Invalid Selling Price for "${groupName}" (${grp.brandName}) Variant ${variantDesc}. Prices cannot be negative.`
        };
      }

      if (isNaN(mrp) || mrp < 0) {
        return {
          isValid: false,
          error: `Invalid MRP for "${groupName}" (${grp.brandName}) Variant ${variantDesc}. Prices cannot be negative.`
        };
      }

      if (selling <= 0) {
        return {
          isValid: false,
          error: `Please enter a valid Selling Price (> 0) for "${groupName}" (${grp.brandName}) Variant ${variantDesc}.`
        };
      }
    }
  }

  return { isValid: true };
}
