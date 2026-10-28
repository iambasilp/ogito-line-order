import MarketStudyCatalogue from '../models/MarketStudyCatalogue';
import MarketStudySurvey from '../models/MarketStudySurvey';
import MarketStudy from '../models/MarketStudy';

/**
 * Initializes the default 10 placeholder products if catalogue is empty
 */
export async function initializeMarketStudyCatalogue(): Promise<void> {
  try {
    const count = await MarketStudyCatalogue.countDocuments();
    if (count === 0) {
      console.log('Initializing Market Study Product Catalogue with 10 placeholder products...');
      const placeholders = Array.from({ length: 10 }, (_, i) => ({
        name: `Product ${i + 1}`,
        isActive: true,
        displayOrder: i + 1
      }));
      await MarketStudyCatalogue.insertMany(placeholders);
      console.log('✓ Successfully initialized Market Study Catalogue with Product 1 through Product 10');
    }
  } catch (error) {
    console.error('Error initializing Market Study catalogue:', error);
  }
}

/**
 * Non-destructive migration: if legacy single-record MarketStudy items exist,
 * safely import them as single-observation surveys into MarketStudySurvey
 * so they remain completely visible, editable, and counted in all analytics.
 */
export async function migrateLegacyMarketStudies(): Promise<void> {
  try {
    const surveyCount = await MarketStudySurvey.countDocuments();
    const legacyCount = await MarketStudy.countDocuments();

    if (surveyCount === 0 && legacyCount > 0) {
      console.log(`Migrating ${legacyCount} legacy MarketStudy records to MarketStudySurvey...`);
      const legacyRecords = await MarketStudy.find();

      const surveysToInsert = legacyRecords.map((r) => {
        const variantLabel = Array.isArray(r.labels) && r.labels.length > 0 
          ? r.labels.join(', ') 
          : '';

        return {
          customerName: r.customerName || 'Unknown Shop',
          customerType: r.customerType || 'Retailer',
          marketLocation: r.marketLocation || '',
          surveyDate: r.collectionDate || r.createdAt || new Date(),
          collectedBy: r.collectedBy || 'Staff',
          notes: r.notes || '',
          status: 'completed',
          observations: [
            {
              catalogueProductName: r.productName || 'General Product',
              brandName: r.brandName || 'Unknown Brand',
              variant: variantLabel,
              weight: r.weight || '',
              packagingType: r.packagingType || '',
              landingPrice: r.landingPrice || 0,
              sellingPrice: r.sellingPrice || 0,
              mrp: r.mrp || 0,
              promotionNotes: '',
              notes: r.notes || '',
              createdAt: r.collectionDate || r.createdAt || new Date()
            }
          ],
          createdBy: r.createdBy,
          createdAt: r.createdAt || new Date(),
          updatedAt: r.updatedAt || new Date()
        };
      });

      if (surveysToInsert.length > 0) {
        await MarketStudySurvey.insertMany(surveysToInsert);
        console.log(`✓ Migrated ${surveysToInsert.length} legacy MarketStudy records into MarketStudySurvey`);
      }
    }
  } catch (error) {
    console.error('Error running legacy MarketStudy migration:', error);
  }
}
