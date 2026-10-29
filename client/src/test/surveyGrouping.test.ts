import {
  getProductGroupKey,
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
console.log('RUNNING SURVEY GROUPING & MULTI-VARIANT COMPREHENSIVE TESTS');
console.log('================================================================\n');

// -------------------------------------------------------------
// Scenario A: Same product, different sizes
// -------------------------------------------------------------
console.log('[Scenario A: Same product, different sizes]');
const scenarioA_group = createNewProductGroup('cat-prod-1', 'PASTIO Macaroni', 'PASTIO', 'Pouch');
scenarioA_group.variants[0].weight = '500 g';
scenarioA_group.variants[0].landingPrice = 40;
scenarioA_group.variants[0].sellingPrice = 50;
scenarioA_group.variants[0].mrp = 55;

const variant2 = createBlankVariantRow('1 kg', 'Pouch');
variant2.landingPrice = 75;
variant2.sellingPrice = 95;
variant2.mrp = 105;
scenarioA_group.variants.push(variant2);

assert(scenarioA_group.brandName === 'PASTIO', 'Brand name is entered once at product group level');
assert(scenarioA_group.variants.length === 2, 'Product group contains two independent variant rows');

const scenarioA_flattened = flattenProductGroupsIntoObservations([scenarioA_group]);
assert(scenarioA_flattened.length === 2, 'Flattens to exactly 2 persisted observations');
assert(scenarioA_flattened[0].brandName === 'PASTIO' && scenarioA_flattened[1].brandName === 'PASTIO', 'Both observations inherit brand name');
assert(scenarioA_flattened[0].weight === '500 g' && scenarioA_flattened[1].weight === '1 kg', 'Sizes are preserved independently');
assert(scenarioA_flattened[0].landingPrice === 40 && scenarioA_flattened[1].landingPrice === 75, 'Landing prices preserved');
assert(scenarioA_flattened[0].sellingPrice === 50 && scenarioA_flattened[1].sellingPrice === 95, 'Selling prices preserved');

// -------------------------------------------------------------
// Scenario B: Different products, same brand
// -------------------------------------------------------------
console.log('\n[Scenario B: Different products, same brand]');
const macaroniGroup = createNewProductGroup('cat-prod-1', 'PASTIO Macaroni', 'PASTIO', 'Pouch');
const fusilliGroup = createNewProductGroup('cat-prod-2', 'PASTIO Fusilli', 'PASTIO', 'Pouch');

const keyMacaroni = getProductGroupKey('cat-prod-1', 'PASTIO Macaroni', 'PASTIO');
const keyFusilli = getProductGroupKey('cat-prod-2', 'PASTIO Fusilli', 'PASTIO');

assert(keyMacaroni !== keyFusilli, 'Macaroni and Fusilli have distinct group keys despite identical brand');

const flattenedB = flattenProductGroupsIntoObservations([macaroniGroup, fusilliGroup]);
const groupedB = groupObservationsIntoProducts(flattenedB);

assert(groupedB.length === 2, 'Distinct catalogue products remain in two separate groups when grouped back');
assert(groupedB[0].catalogueProductName === 'PASTIO Macaroni' && groupedB[1].catalogueProductName === 'PASTIO Fusilli', 'Product names preserved on distinct groups');

// -------------------------------------------------------------
// Scenario C: Same product, different packaging
// -------------------------------------------------------------
console.log('\n[Scenario C: Same product, different packaging]');
const obsPouch: any = {
  catalogueProductId: 'cat-prod-1',
  catalogueProductName: 'PASTIO Macaroni',
  brandName: 'PASTIO',
  variant: 'Regular',
  weight: '500 g',
  packagingType: 'Pouch',
  landingPrice: 40,
  sellingPrice: 50,
  mrp: 55
};

const obsBox: any = {
  catalogueProductId: 'cat-prod-1',
  catalogueProductName: 'PASTIO Macaroni',
  brandName: 'PASTIO',
  variant: 'Regular',
  weight: '1 kg',
  packagingType: 'Box / Family Pack',
  landingPrice: 85,
  sellingPrice: 110,
  mrp: 120
};

const groupedC = groupObservationsIntoProducts([obsPouch, obsBox]);
assert(groupedC.length === 1, 'Same product and brand grouped into single product card');
assert(groupedC[0].variants.length === 2, 'Contains 2 variants');
assert(groupedC[0].variants[0].packagingType === 'Pouch', 'Variant 1 retains Pouch packaging');
assert(groupedC[0].variants[1].packagingType === 'Box / Family Pack', 'Variant 2 retains Box packaging');

const reFlattenedC = flattenProductGroupsIntoObservations(groupedC);
assert(reFlattenedC[0].packagingType === 'Pouch', 'Re-flattened observation 1 preserves Pouch');
assert(reFlattenedC[1].packagingType === 'Box / Family Pack', 'Re-flattened observation 2 preserves Box / Family Pack');

// -------------------------------------------------------------
// Scenario D: Edit existing survey with 6 observations under 3 products
// -------------------------------------------------------------
console.log('\n[Scenario D: Edit existing survey with 6 observations under 3 products]');
const existingObservations: any[] = [
  // Product 1: Macaroni PASTIO (2 sizes)
  { _id: 'mongo-id-1', catalogueProductId: 'cat-1', catalogueProductName: 'Macaroni', brandName: 'PASTIO', weight: '500 g', packagingType: 'Pouch', landingPrice: 40, sellingPrice: 50, mrp: 55 },
  { _id: 'mongo-id-2', catalogueProductId: 'cat-1', catalogueProductName: 'Macaroni', brandName: 'PASTIO', weight: '1 kg', packagingType: 'Pouch', landingPrice: 75, sellingPrice: 95, mrp: 105 },
  // Product 2: Fusilli PASTIO (1 size)
  { _id: 'mongo-id-3', catalogueProductId: 'cat-2', catalogueProductName: 'Fusilli', brandName: 'PASTIO', weight: '500 g', packagingType: 'Pouch', landingPrice: 42, sellingPrice: 52, mrp: 58 },
  // Product 3: Macaroni Bambino (3 sizes)
  { _id: 'mongo-id-4', catalogueProductId: 'cat-1', catalogueProductName: 'Macaroni', brandName: 'Bambino', weight: '400 g', packagingType: 'Pouch', landingPrice: 35, sellingPrice: 45, mrp: 50 },
  { _id: 'mongo-id-5', catalogueProductId: 'cat-1', catalogueProductName: 'Macaroni', brandName: 'Bambino', weight: '850 g', packagingType: 'Pouch', landingPrice: 70, sellingPrice: 88, mrp: 95 },
  { _id: 'mongo-id-6', catalogueProductId: 'cat-1', catalogueProductName: 'Macaroni', brandName: 'Bambino', weight: '1 kg', packagingType: 'Box', landingPrice: 80, sellingPrice: 100, mrp: 110 }
];

const loadedGroups = groupObservationsIntoProducts(existingObservations);
assert(loadedGroups.length === 3, 'Observations cleanly grouped into exactly 3 product cards');

// Verify Macaroni PASTIO group
const pastioMac = loadedGroups.find(g => g.catalogueProductName === 'Macaroni' && g.brandName === 'PASTIO');
assert(Boolean(pastioMac) && pastioMac?.variants.length === 2, 'Macaroni PASTIO has 2 variants');
assert(pastioMac?.variants[0]._id === 'mongo-id-1', 'Preserved mongo-id-1');
assert(pastioMac?.variants[1]._id === 'mongo-id-2', 'Preserved mongo-id-2');

// Verify Fusilli PASTIO group
const pastioFus = loadedGroups.find(g => g.catalogueProductName === 'Fusilli' && g.brandName === 'PASTIO');
assert(Boolean(pastioFus) && pastioFus?.variants.length === 1, 'Fusilli PASTIO has 1 variant');
assert(pastioFus?.variants[0]._id === 'mongo-id-3', 'Preserved mongo-id-3');

// Verify Macaroni Bambino group
const bambinoMac = loadedGroups.find(g => g.catalogueProductName === 'Macaroni' && g.brandName === 'Bambino');
assert(Boolean(bambinoMac) && bambinoMac?.variants.length === 3, 'Macaroni Bambino has 3 variants');
assert(bambinoMac?.variants[0]._id === 'mongo-id-4', 'Preserved mongo-id-4');
assert(bambinoMac?.variants[1]._id === 'mongo-id-5', 'Preserved mongo-id-5');
assert(bambinoMac?.variants[2]._id === 'mongo-id-6', 'Preserved mongo-id-6');

// Roundtrip flattening test
const savedAgain = flattenProductGroupsIntoObservations(loadedGroups);
assert(savedAgain.length === 6, 'All 6 observations roundtripped without data loss');
const savedIds = savedAgain.map(o => o._id).sort();
assert(JSON.stringify(savedIds) === JSON.stringify(['mongo-id-1', 'mongo-id-2', 'mongo-id-3', 'mongo-id-4', 'mongo-id-5', 'mongo-id-6'].sort()), 'All MongoDB _ids strictly preserved on roundtrip');

// -------------------------------------------------------------
// Scenario E: Add, duplicate and delete variants
// -------------------------------------------------------------
console.log('\n[Scenario E: Add, duplicate and delete variants]');
const originalRow = bambinoMac!.variants[0];
const clonedRow = duplicateVariantRow(originalRow);

assert(clonedRow._id === undefined, 'Duplicated row clears MongoDB _id to avoid collision');
assert(clonedRow.id !== originalRow.id, 'Duplicated row has a fresh unique client id');
assert(clonedRow.weight === originalRow.weight && clonedRow.sellingPrice === originalRow.sellingPrice, 'Values properly copied');

// Add cloned row to group
bambinoMac!.variants.splice(1, 0, clonedRow);
assert(bambinoMac!.variants.length === 4, 'Variant added to group');

// Delete a row
bambinoMac!.variants.splice(0, 1);
assert(bambinoMac!.variants.length === 3, 'Deleted 1 variant');
assert(bambinoMac!.variants[0].id === clonedRow.id, 'Remaining first item is cloned item');

// -------------------------------------------------------------
// Scenario F: Draft and validation
// -------------------------------------------------------------
console.log('\n[Scenario F: Draft and validation]');
const validCheck = validateSurveySubmission({
  customerName: 'Metro Store',
  collectedBy: 'Agent 007',
  status: 'completed',
  productGroups: loadedGroups
});
assert(validCheck.isValid === true, 'Valid survey passes validation');

// Missing brand name on completed survey
const invalidGroup = createNewProductGroup('cat-x', 'Product X', '', 'Pouch');
invalidGroup.variants[0].weight = '500 g';
invalidGroup.variants[0].sellingPrice = 100;

const missingBrandCheck = validateSurveySubmission({
  customerName: 'Metro Store',
  collectedBy: 'Agent 007',
  status: 'completed',
  productGroups: [invalidGroup]
});
assert(missingBrandCheck.isValid === false, 'Fails when brand name is empty on completed survey');
assert(missingBrandCheck.error?.includes('Brand Name') === true, 'Error message mentions Brand Name');

// Missing weight on variant
invalidGroup.brandName = 'Brand X';
invalidGroup.variants[0].weight = '';
const missingWeightCheck = validateSurveySubmission({
  customerName: 'Metro Store',
  collectedBy: 'Agent 007',
  status: 'completed',
  productGroups: [invalidGroup]
});
assert(missingWeightCheck.isValid === false, 'Fails when weight is empty on completed survey');
assert(missingWeightCheck.error?.includes('Weight / Volume') === true, 'Error message mentions Weight / Volume');

// Draft allows partial data
const draftCheck = validateSurveySubmission({
  customerName: 'Metro Store',
  collectedBy: 'Agent 007',
  status: 'draft',
  productGroups: [invalidGroup]
});
assert(draftCheck.isValid === true, 'Draft passes validation with partial records');

// -------------------------------------------------------------
// Scenario G: Profit and margin calculation accuracy
// -------------------------------------------------------------
console.log('\n[Scenario G: Profit and margin calculation accuracy]');
const metric1 = calculateVariantMetrics(200, 160, 220);
assert(metric1.profit === 40, 'Profit is 40 (200 - 160)');
assert(metric1.marginPercent === 20.0, 'Margin is 20.0% ((40 / 200) * 100)');
assert(metric1.mrpDiff === 20, 'MRP saving is 20 (220 - 200)');
assert(metric1.isSellingAboveMrp === false, 'Selling is not above MRP');
assert(metric1.isLandingAboveSelling === false, 'Landing is not above selling');

// Selling above MRP
const metric2 = calculateVariantMetrics(250, 160, 220);
assert(metric2.isSellingAboveMrp === true, 'Correctly flags selling > MRP');

// Zero selling price does not produce NaN or Infinity
const metricZero = calculateVariantMetrics(0, 50, 100);
assert(!isNaN(metricZero.marginPercent) && isFinite(metricZero.marginPercent), 'Zero selling price produces valid finite number, no NaN or Infinity');
assert(metricZero.marginPercent === 0, 'Zero selling price gives 0% margin');

// Empty price inputs do not produce NaN
const metricEmpty = calculateVariantMetrics('', '', '');
assert(!isNaN(metricEmpty.profit) && !isNaN(metricEmpty.marginPercent), 'Empty price inputs produce valid numbers');

console.log('\n================================================================');
console.log('🎉 ALL SCENARIO TESTS PASSED SUCCESSFULLY!');
console.log('================================================================');
