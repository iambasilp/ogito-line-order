import {
  getProductGroupKey,
  resolveObservationProductIdentity,
  groupObservationsIntoProducts,
  flattenProductGroupsIntoObservations,
  duplicateVariantRow,
  createBlankVariantRow,
  createNewProductGroup,
  calculateVariantMetrics,
  validateSurveySubmission
} from '../components/marketStudy/surveyGroupingUtils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

console.log('================================================================');
console.log('RUNNING SURVEY GROUPING & PRODUCT IDENTITY VERIFICATION TESTS');
console.log('================================================================\n');

// -------------------------------------------------------------
// Test 1: Actual 6 Observations from Current Survey / Screenshots
// -------------------------------------------------------------
console.log('[Test 1: Actual 6 Observations from User Screenshot]');
const actualSixObservations: any[] = [
  // Obs 1: Macaroni under pasta / PASTIO
  {
    _id: 'mongo-obs-1',
    catalogueProductName: 'pasta',
    brandName: 'PASTIO',
    variant: 'Macaroni',
    weight: '500 g',
    packagingType: 'Pouch',
    landingPrice: 40,
    sellingPrice: 50,
    mrp: 55,
    notes: 'Shop favourite'
  },
  // Obs 2: Fusilli under pasta / PASTIO
  {
    _id: 'mongo-obs-2',
    catalogueProductName: 'pasta',
    brandName: 'PASTIO',
    variant: 'Fusilli',
    weight: '500 g',
    packagingType: 'Pouch',
    landingPrice: 42,
    sellingPrice: 52,
    mrp: 58
  },
  // Obs 3: Ragi Macaroni under pasta / PASTIO
  {
    _id: 'mongo-obs-3',
    catalogueProductName: 'pasta',
    brandName: 'PASTIO',
    variant: 'Ragi Macaroni',
    weight: '500 g',
    packagingType: 'Pouch',
    landingPrice: 50,
    sellingPrice: 65,
    mrp: 70
  },
  // Obs 4: Macaroni under pasta / TOPMIE
  {
    _id: 'mongo-obs-4',
    catalogueProductName: 'pasta',
    brandName: 'TOPMIE',
    variant: 'Macaroni',
    weight: '500 g',
    packagingType: 'Pouch',
    landingPrice: 38,
    sellingPrice: 48,
    mrp: 52
  },
  // Obs 5: Normal Vermicelli under Vermicelli / PASTIO
  {
    _id: 'mongo-obs-5',
    catalogueProductName: 'Vermicelli',
    brandName: 'PASTIO',
    variant: 'Normal Vermicelli',
    weight: '400 g',
    packagingType: 'Pouch',
    landingPrice: 30,
    sellingPrice: 38,
    mrp: 42
  },
  // Obs 6: french fries / ASZINO
  {
    _id: 'mongo-obs-6',
    catalogueProductName: 'french fries',
    brandName: 'ASZINO',
    variant: '',
    weight: '1 kg',
    packagingType: 'Pouch',
    landingPrice: 120,
    sellingPrice: 150,
    mrp: 165
  }
];

const resolvedGroups = groupObservationsIntoProducts(actualSixObservations);

assert(resolvedGroups.length === 6, 'Separates into exactly 6 distinct product groups (NOT 4 generic groups)');

// 1. PASTIO Macaroni
const pastioMac = resolvedGroups.find(
  (g) => g.catalogueProductName === 'Macaroni' && g.brandName === 'PASTIO'
);
assert(Boolean(pastioMac), 'PASTIO Macaroni is its own distinct product group');
assert(pastioMac?.variants[0]._id === 'mongo-obs-1', 'Preserved mongo-obs-1 on PASTIO Macaroni');
assert(pastioMac?.variants[0].weight === '500 g', 'Preserved weight 500 g on Macaroni');

// 2. PASTIO Fusilli
const pastioFus = resolvedGroups.find(
  (g) => g.catalogueProductName === 'Fusilli' && g.brandName === 'PASTIO'
);
assert(Boolean(pastioFus), 'PASTIO Fusilli is its own distinct product group (separated from Macaroni)');
assert(pastioFus?.variants[0]._id === 'mongo-obs-2', 'Preserved mongo-obs-2 on PASTIO Fusilli');

// 3. PASTIO Ragi Macaroni
const pastioRagi = resolvedGroups.find(
  (g) => g.catalogueProductName === 'Ragi Macaroni' && g.brandName === 'PASTIO'
);
assert(Boolean(pastioRagi), 'PASTIO Ragi Macaroni is its own distinct product group (separated from Macaroni)');
assert(pastioRagi?.variants[0]._id === 'mongo-obs-3', 'Preserved mongo-obs-3 on PASTIO Ragi Macaroni');

// 4. TOPMIE Macaroni
const topmieMac = resolvedGroups.find(
  (g) => g.catalogueProductName === 'Macaroni' && g.brandName === 'TOPMIE'
);
assert(Boolean(topmieMac), 'TOPMIE Macaroni is distinct from PASTIO Macaroni');
assert(topmieMac?.variants[0]._id === 'mongo-obs-4', 'Preserved mongo-obs-4 on TOPMIE Macaroni');

// 5. PASTIO Vermicelli
const pastioVerm = resolvedGroups.find(
  (g) => g.catalogueProductName === 'Vermicelli' && g.brandName === 'PASTIO'
);
assert(Boolean(pastioVerm), 'PASTIO Vermicelli is correctly preserved as its own product');
assert(pastioVerm?.variants[0].variant === 'Normal Vermicelli', 'Preserved Normal Vermicelli variant label');

// 6. ASZINO French fries
const aszinoFries = resolvedGroups.find(
  (g) => g.catalogueProductName.toLowerCase() === 'french fries' && g.brandName === 'ASZINO'
);
assert(Boolean(aszinoFries), 'ASZINO French fries is correctly preserved as its own product');

// Roundtrip test
const flattenedSix = flattenProductGroupsIntoObservations(resolvedGroups);
assert(flattenedSix.length === 6, 'All 6 observations preserved on flattening');
const roundtripGrouped = groupObservationsIntoProducts(flattenedSix);
assert(roundtripGrouped.length === 6, 'Re-grouping saved data produces identical 6 product groups (deterministic)');

// -------------------------------------------------------------
// Test 2: Multiple Sizes of the Same Actual Product
// -------------------------------------------------------------
console.log('\n[Test 2: Multiple Sizes of the Same Actual Product]');
const multiSizeObservations: any[] = [
  {
    _id: 'size-250',
    catalogueProductName: 'pasta',
    brandName: 'PASTIO',
    variant: 'Macaroni',
    weight: '250 g',
    packagingType: 'Pouch',
    landingPrice: 22,
    sellingPrice: 28,
    mrp: 30
  },
  {
    _id: 'size-500',
    catalogueProductName: 'pasta',
    brandName: 'PASTIO',
    variant: 'Macaroni',
    weight: '500 g',
    packagingType: 'Pouch',
    landingPrice: 40,
    sellingPrice: 50,
    mrp: 55
  },
  {
    _id: 'size-1kg',
    catalogueProductName: 'pasta',
    brandName: 'PASTIO',
    variant: 'Macaroni',
    weight: '1 kg',
    packagingType: 'Box',
    landingPrice: 75,
    sellingPrice: 95,
    mrp: 105
  },
  // And a Fusilli
  {
    _id: 'fus-500',
    catalogueProductName: 'pasta',
    brandName: 'PASTIO',
    variant: 'Fusilli',
    weight: '500 g',
    packagingType: 'Pouch',
    landingPrice: 42,
    sellingPrice: 52,
    mrp: 58
  }
];

const multiSizeGrouped = groupObservationsIntoProducts(multiSizeObservations);
assert(multiSizeGrouped.length === 2, 'Groups into 2 products: Macaroni and Fusilli');

const macGroup = multiSizeGrouped.find((g) => g.catalogueProductName === 'Macaroni');
assert(macGroup?.variants.length === 3, 'Macaroni product group contains all 3 sizes (250g, 500g, 1kg)');
assert(macGroup?.variants[0].weight === '250 g', 'Size 1 is 250 g');
assert(macGroup?.variants[1].weight === '500 g', 'Size 2 is 500 g');
assert(macGroup?.variants[2].weight === '1 kg', 'Size 3 is 1 kg');
assert(macGroup?.variants[2].packagingType === 'Box', '1 kg retains Box packaging type');

const fusGroup = multiSizeGrouped.find((g) => g.catalogueProductName === 'Fusilli');
assert(fusGroup?.variants.length === 1, 'Fusilli has 1 variant');

// -------------------------------------------------------------
// Test 3: Catalogue Matching with Predefined Catalogue Items
// -------------------------------------------------------------
console.log('\n[Test 3: Catalogue Matching Priority]');
const mockCatalogue: any[] = [
  { _id: 'cat-mac-id', name: 'Macaroni', isActive: true },
  { _id: 'cat-fus-id', name: 'Fusilli', isActive: true },
  { _id: 'cat-ragi-id', name: 'Ragi Macaroni', isActive: true }
];

const obsWithCatalogue = groupObservationsIntoProducts(actualSixObservations, mockCatalogue);
const catMacGroup = obsWithCatalogue.find((g) => g.catalogueProductName === 'Macaroni');
assert(catMacGroup?.catalogueProductId === 'cat-mac-id', 'Linked to catalogue item ID cat-mac-id');

const catFusGroup = obsWithCatalogue.find((g) => g.catalogueProductName === 'Fusilli');
assert(catFusGroup?.catalogueProductId === 'cat-fus-id', 'Linked to catalogue item ID cat-fus-id');

// -------------------------------------------------------------
// Test 4: Editing Price Changes Only Intended Observation
// -------------------------------------------------------------
console.log('\n[Test 4: Editing Price Affects Only Intended Observation]');
const editableGroup = createNewProductGroup('cat-mac-id', 'Macaroni', 'PASTIO', 'Pouch');
editableGroup.variants[0].weight = '500 g';
editableGroup.variants[0].sellingPrice = 50;
editableGroup.variants[0].landingPrice = 40;

const secondRow = createBlankVariantRow('1 kg', 'Pouch');
secondRow.sellingPrice = 95;
secondRow.landingPrice = 75;
editableGroup.variants.push(secondRow);

// Change price of row 1 only
editableGroup.variants[0].sellingPrice = 55;

assert(editableGroup.variants[0].sellingPrice === 55, 'Row 0 selling price updated to 55');
assert(editableGroup.variants[1].sellingPrice === 95, 'Row 1 selling price remains unchanged at 95');

// -------------------------------------------------------------
// Test 5: Adding or Deleting Variant Affects Only Intended Group
// -------------------------------------------------------------
console.log('\n[Test 5: Adding or Deleting Variant Affects Only Intended Group]');
const groupA = createNewProductGroup('1', 'Macaroni', 'PASTIO');
const groupB = createNewProductGroup('2', 'Fusilli', 'PASTIO');

// Add to group A
groupA.variants.push(createBlankVariantRow('1 kg', 'Pouch'));
assert(groupA.variants.length === 2, 'Group A now has 2 variants');
assert(groupB.variants.length === 1, 'Group B variant count unchanged at 1');

// Delete from group A
groupA.variants.splice(0, 1);
assert(groupA.variants.length === 1, 'Group A now has 1 variant');
assert(groupB.variants.length === 1, 'Group B variant count unchanged');

// -------------------------------------------------------------
// Test 6: Direct Tests for Resolver, Key Generator & Metrics
// -------------------------------------------------------------
console.log('\n[Test 6: Direct Tests for Utilities]');
const resolved = resolveObservationProductIdentity({
  catalogueProductName: 'pasta',
  brandName: 'PASTIO',
  variant: 'Macaroni',
  landingPrice: 40,
  sellingPrice: 50,
  mrp: 55
});
assert(resolved.catalogueProductName === 'Macaroni', 'Resolver extracts Macaroni from generic pasta');

const groupKeyMac = getProductGroupKey(undefined, 'Macaroni', 'PASTIO');
const groupKeyFus = getProductGroupKey(undefined, 'Fusilli', 'PASTIO');
assert(groupKeyMac !== groupKeyFus, 'Generated keys for Macaroni and Fusilli differ');

const duplicated = duplicateVariantRow(editableGroup.variants[0]);
assert(duplicated._id === undefined, 'Duplicated row clears MongoDB _id');

const metrics = calculateVariantMetrics(100, 80, 110);
assert(metrics.profit === 20 && metrics.marginPercent === 20.0, 'Calculates 20 profit and 20% margin');

const validCheck = validateSurveySubmission({
  customerName: 'Test Shop',
  collectedBy: 'Test Staff',
  status: 'completed',
  productGroups: [editableGroup]
});
assert(validCheck.isValid === true, 'Survey passes validation');

console.log('\n================================================================');
console.log('🎉 ALL PRODUCT IDENTITY & GROUPING TESTS PASSED!');
console.log('================================================================');
