import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import MarketStudySurvey, { IMarketStudySurvey } from '../models/MarketStudySurvey';
import MarketStudyCatalogue from '../models/MarketStudyCatalogue';
import { initializeMarketStudyCatalogue, migrateLegacyMarketStudies } from '../services/marketStudyInit';

export class MarketStudyController {
  // ==========================================
  // CATALOGUE CONTROLLERS (Admin / CEO)
  // ==========================================

  /**
   * Get all catalogue products
   */
  static async getCatalogue(req: AuthRequest, res: Response) {
    try {
      // Auto-initialize if empty
      await initializeMarketStudyCatalogue();

      const { all, search } = req.query;
      const query: any = {};

      // If 'all' is not requested, or user is not admin/ceo, show only active products
      if (all !== 'true' && all !== '1') {
        query.isActive = true;
      }

      if (search) {
        query.name = new RegExp(String(search).trim(), 'i');
      }

      const products = await MarketStudyCatalogue.find(query).sort({
        displayOrder: 1,
        name: 1
      });

      res.json({ products });
    } catch (error) {
      console.error('Error fetching catalogue products:', error);
      res.status(500).json({ error: 'Failed to fetch catalogue products' });
    }
  }

  /**
   * Create a new catalogue product
   */
  static async createCatalogueProduct(req: AuthRequest, res: Response) {
    try {
      const { name, displayOrder, isActive } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Product name is required' });
      }

      const trimmedName = name.trim();

      // Check for duplicate name
      const existing = await MarketStudyCatalogue.findOne({
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
      });

      if (existing) {
        return res.status(400).json({
          error: `A catalogue product named "${existing.name}" already exists.`
        });
      }

      // Default display order to next highest number
      let order = Number(displayOrder);
      if (isNaN(order)) {
        const lastProduct = await MarketStudyCatalogue.findOne().sort({ displayOrder: -1 });
        order = lastProduct ? (lastProduct.displayOrder || 0) + 1 : 1;
      }

      const product = new MarketStudyCatalogue({
        name: trimmedName,
        displayOrder: order,
        isActive: isActive !== false,
        createdBy: req.user?.id,
        updatedBy: req.user?.id
      });

      await product.save();
      res.status(201).json({ product });
    } catch (error) {
      console.error('Error creating catalogue product:', error);
      res.status(500).json({ error: 'Failed to create catalogue product' });
    }
  }

  /**
   * Update an existing catalogue product
   */
  static async updateCatalogueProduct(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, displayOrder, isActive } = req.body;

      const product = await MarketStudyCatalogue.findById(id);
      if (!product) {
        return res.status(404).json({ error: 'Catalogue product not found' });
      }

      if (name !== undefined) {
        const trimmedName = name.trim();
        if (!trimmedName) {
          return res.status(400).json({ error: 'Product name cannot be empty' });
        }

        // Check if name is taken by another product
        const duplicate = await MarketStudyCatalogue.findOne({
          _id: { $ne: id },
          name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
        });

        if (duplicate) {
          return res.status(400).json({
            error: `Another catalogue product is already named "${duplicate.name}".`
          });
        }

        product.name = trimmedName;
      }

      if (displayOrder !== undefined) {
        product.displayOrder = Number(displayOrder) || 0;
      }

      if (isActive !== undefined) {
        product.isActive = Boolean(isActive);
      }

      product.updatedBy = (req.user?.id as any) || product.updatedBy;
      await product.save();

      res.json({ product });
    } catch (error) {
      console.error('Error updating catalogue product:', error);
      res.status(500).json({ error: 'Failed to update catalogue product' });
    }
  }

  /**
   * Reorder catalogue products
   */
  static async reorderCatalogue(req: AuthRequest, res: Response) {
    try {
      const { items } = req.body; // Array of { id, displayOrder }

      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Items must be an array of { id, displayOrder }' });
      }

      const updates = items.map((item: any) =>
        MarketStudyCatalogue.findByIdAndUpdate(item.id, {
          displayOrder: Number(item.displayOrder) || 0,
          updatedBy: req.user?.id
        })
      );

      await Promise.all(updates);
      res.json({ message: 'Catalogue order updated successfully' });
    } catch (error) {
      console.error('Error reordering catalogue:', error);
      res.status(500).json({ error: 'Failed to reorder catalogue' });
    }
  }

  /**
   * Check if catalogue product has historical survey observations
   */
  static async checkCatalogueUsage(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const product = await MarketStudyCatalogue.findById(id);
      if (!product) {
        return res.status(404).json({ error: 'Catalogue product not found' });
      }

      const count = await MarketStudySurvey.countDocuments({
        $or: [
          { 'observations.catalogueProductId': id },
          { 'observations.catalogueProductName': product.name }
        ]
      });

      res.json({
        inUse: count > 0,
        usageCount: count,
        productName: product.name
      });
    } catch (error) {
      console.error('Error checking catalogue usage:', error);
      res.status(500).json({ error: 'Failed to check catalogue usage' });
    }
  }

  /**
   * Delete or deactivate catalogue product
   */
  static async deleteCatalogueProduct(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { force } = req.query;

      const product = await MarketStudyCatalogue.findById(id);
      if (!product) {
        return res.status(404).json({ error: 'Catalogue product not found' });
      }

      const usageCount = await MarketStudySurvey.countDocuments({
        $or: [
          { 'observations.catalogueProductId': id },
          { 'observations.catalogueProductName': product.name }
        ]
      });

      // If product has been used in historical surveys and not forced to delete, deactivate safely
      if (usageCount > 0 && force !== 'true') {
        product.isActive = false;
        product.updatedBy = (req.user?.id as any) || product.updatedBy;
        await product.save();
        return res.json({
          message: `Product is referenced in ${usageCount} historical survey(s). It has been safely deactivated instead of deleted.`,
          deactivated: true,
          product
        });
      }

      await MarketStudyCatalogue.findByIdAndDelete(id);
      res.json({ message: 'Catalogue product deleted successfully' });
    } catch (error) {
      console.error('Error deleting catalogue product:', error);
      res.status(500).json({ error: 'Failed to delete catalogue product' });
    }
  }

  // ==========================================
  // SURVEY CONTROLLERS (Multi-Product & Multi-Variant)
  // ==========================================

  /**
   * Create a new shop-based market survey with multiple products and variants
   */
  static async createSurvey(req: AuthRequest, res: Response) {
    try {
      const {
        customerId,
        customerName,
        customerType,
        marketLocation,
        routeId,
        surveyDate,
        collectedBy,
        notes,
        status,
        observations
      } = req.body;

      if (!customerName || !customerName.trim()) {
        return res.status(400).json({ error: 'Customer / Shop name is required' });
      }

      const finalStatus = status === 'draft' ? 'draft' : 'completed';

      // For completed surveys, validate that at least one observation exists
      if (finalStatus === 'completed' && (!Array.isArray(observations) || observations.length === 0)) {
        return res.status(400).json({
          error: 'Please add at least one product observation before completing the survey.'
        });
      }

      // Sanitize observations
      const sanitizedObservations = Array.isArray(observations)
        ? observations.map((obs: any) => {
            const landing = Number(obs.landingPrice) || 0;
            const selling = Number(obs.sellingPrice) || 0;
            const mrp = Number(obs.mrp) || 0;

            return {
              catalogueProductId: obs.catalogueProductId || undefined,
              catalogueProductName: String(obs.catalogueProductName || 'General Product').trim(),
              brandName: String(obs.brandName || '').trim(),
              variant: String(obs.variant || '').trim(),
              weight: String(obs.weight || '').trim(),
              packagingType: String(obs.packagingType || '').trim(),
              landingPrice: Math.max(0, landing),
              sellingPrice: Math.max(0, selling),
              mrp: Math.max(0, mrp),
              promotionNotes: String(obs.promotionNotes || '').trim(),
              notes: String(obs.notes || '').trim(),
              createdAt: obs.createdAt ? new Date(obs.createdAt) : new Date()
            };
          })
        : [];

      // Validate observation brand names if completed
      if (finalStatus === 'completed') {
        for (const obs of sanitizedObservations) {
          if (!obs.brandName) {
            return res.status(400).json({
              error: `Please provide a Brand Name for "${obs.catalogueProductName}".`
            });
          }
        }
      }

      const finalCollector =
        collectedBy?.trim() || req.user?.username || req.user?.id || 'Staff';

      const survey = new MarketStudySurvey({
        customerId: customerId || undefined,
        customerName: customerName.trim(),
        customerType: customerType ? customerType.trim() : 'Retailer',
        marketLocation: marketLocation ? marketLocation.trim() : '',
        routeId: routeId || undefined,
        surveyDate: surveyDate ? new Date(surveyDate) : new Date(),
        surveyorId: req.user?.id,
        collectedBy: finalCollector,
        notes: notes ? notes.trim() : '',
        status: finalStatus,
        observations: sanitizedObservations,
        createdBy: req.user?.id,
        updatedBy: req.user?.id
      });

      await survey.save();
      res.status(201).json({ survey });
    } catch (error) {
      console.error('Error creating market survey:', error);
      res.status(500).json({ error: 'Failed to create market survey' });
    }
  }

  /**
   * Update an existing survey and its observations
   */
  static async updateSurvey(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const {
        customerId,
        customerName,
        customerType,
        marketLocation,
        routeId,
        surveyDate,
        collectedBy,
        notes,
        status,
        observations
      } = req.body;

      const survey = await MarketStudySurvey.findById(id);
      if (!survey) {
        return res.status(404).json({ error: 'Market survey not found' });
      }

      if (customerName !== undefined) {
        const trimmed = customerName.trim();
        if (!trimmed) {
          return res.status(400).json({ error: 'Customer / Shop name is required' });
        }
        survey.customerName = trimmed;
      }

      if (customerId !== undefined) survey.customerId = customerId || undefined;
      if (customerType !== undefined) survey.customerType = customerType.trim();
      if (marketLocation !== undefined) survey.marketLocation = marketLocation.trim();
      if (routeId !== undefined) survey.routeId = routeId || undefined;
      if (surveyDate !== undefined) survey.surveyDate = new Date(surveyDate);
      if (collectedBy !== undefined) survey.collectedBy = collectedBy.trim();
      if (notes !== undefined) survey.notes = notes.trim();
      if (status !== undefined) survey.status = status === 'draft' ? 'draft' : 'completed';

      if (observations !== undefined && Array.isArray(observations)) {
        survey.observations = observations.map((obs: any) => {
          const landing = Number(obs.landingPrice) || 0;
          const selling = Number(obs.sellingPrice) || 0;
          const mrp = Number(obs.mrp) || 0;

          return {
            _id: obs._id || undefined,
            catalogueProductId: obs.catalogueProductId || undefined,
            catalogueProductName: String(obs.catalogueProductName || 'General Product').trim(),
            brandName: String(obs.brandName || '').trim(),
            variant: String(obs.variant || '').trim(),
            weight: String(obs.weight || '').trim(),
            packagingType: String(obs.packagingType || '').trim(),
            landingPrice: Math.max(0, landing),
            sellingPrice: Math.max(0, selling),
            mrp: Math.max(0, mrp),
            promotionNotes: String(obs.promotionNotes || '').trim(),
            notes: String(obs.notes || '').trim(),
            createdAt: obs.createdAt ? new Date(obs.createdAt) : new Date()
          } as any;
        });
      }

      survey.updatedBy = (req.user?.id as any) || survey.updatedBy;
      await survey.save();

      res.json({ survey });
    } catch (error) {
      console.error('Error updating market survey:', error);
      res.status(500).json({ error: 'Failed to update market survey' });
    }
  }

  /**
   * Get single survey by ID with all its observations
   */
  static async getSurveyById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const survey = await MarketStudySurvey.findById(id).populate('customerId', 'name route phone');
      if (!survey) {
        return res.status(404).json({ error: 'Market survey not found' });
      }
      res.json({ survey });
    } catch (error) {
      console.error('Error fetching survey by id:', error);
      res.status(500).json({ error: 'Failed to fetch survey' });
    }
  }

  /**
   * Delete a survey
   */
  static async deleteSurvey(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await MarketStudySurvey.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Market survey not found' });
      }
      res.json({ message: 'Market survey and its observations deleted successfully' });
    } catch (error) {
      console.error('Error deleting survey:', error);
      res.status(500).json({ error: 'Failed to delete survey' });
    }
  }

  /**
   * Delete a specific observation from a survey
   */
  static async deleteObservation(req: AuthRequest, res: Response) {
    try {
      const { surveyId, obsId } = req.params;
      const survey = await MarketStudySurvey.findByIdAndUpdate(
        surveyId,
        { $pull: { observations: { _id: obsId } } },
        { new: true }
      );

      if (!survey) {
        return res.status(404).json({ error: 'Survey not found' });
      }

      res.json({ message: 'Observation removed successfully', survey });
    } catch (error) {
      console.error('Error removing observation:', error);
      res.status(500).json({ error: 'Failed to remove observation' });
    }
  }

  // ==========================================
  // FLATTENED OBSERVATIONS & DASHBOARD REPORTING
  // ==========================================

  /**
   * Get flattened observations with filters, table formatting, and KPI summaries
   */
  static async getObservations(req: AuthRequest, res: Response) {
    try {
      // Ensure migration & catalogue initialized
      await initializeMarketStudyCatalogue();
      await migrateLegacyMarketStudies();

      const {
        search,
        brand,
        customerType,
        collectedBy,
        location,
        product,
        variant,
        weight,
        packagingType,
        status,
        fromDate,
        toDate
      } = req.query;

      const surveyQuery: any = {};

      if (customerType && customerType !== 'all') {
        surveyQuery.customerType = customerType;
      }

      if (collectedBy && collectedBy !== 'all') {
        surveyQuery.collectedBy = collectedBy;
      }

      if (location && location !== 'all') {
        surveyQuery.marketLocation = location;
      }

      if (status && status !== 'all') {
        surveyQuery.status = status;
      } else {
        // By default show completed observations in analytics
        surveyQuery.status = { $in: ['completed', 'draft'] };
      }

      if (fromDate || toDate) {
        surveyQuery.surveyDate = {};
        if (fromDate) {
          const from = new Date(fromDate as string);
          from.setHours(0, 0, 0, 0);
          surveyQuery.surveyDate.$gte = from;
        }
        if (toDate) {
          const to = new Date(toDate as string);
          to.setHours(23, 59, 59, 999);
          surveyQuery.surveyDate.$lte = to;
        }
      }

      const surveys = await MarketStudySurvey.find(surveyQuery).sort({
        surveyDate: -1,
        createdAt: -1
      });

      // Flatten observations while preserving survey context
      let flatList: any[] = [];
      const searchRegex = search ? new RegExp(String(search).trim(), 'i') : null;

      for (const s of surveys) {
        for (const obs of s.observations) {
          // Filter by brand
          if (brand && brand !== 'all' && obs.brandName?.toLowerCase() !== String(brand).toLowerCase()) {
            continue;
          }

          // Filter by product
          if (
            product &&
            product !== 'all' &&
            obs.catalogueProductName?.toLowerCase() !== String(product).toLowerCase()
          ) {
            continue;
          }

          // Filter by variant
          if (
            variant &&
            variant !== 'all' &&
            obs.variant?.toLowerCase() !== String(variant).toLowerCase()
          ) {
            continue;
          }

          // Filter by weight
          if (
            weight &&
            weight !== 'all' &&
            obs.weight?.toLowerCase() !== String(weight).toLowerCase()
          ) {
            continue;
          }

          // Filter by packaging
          if (
            packagingType &&
            packagingType !== 'all' &&
            obs.packagingType?.toLowerCase() !== String(packagingType).toLowerCase()
          ) {
            continue;
          }

          // Text Search Match
          if (searchRegex) {
            const match =
              searchRegex.test(s.customerName) ||
              searchRegex.test(s.marketLocation || '') ||
              searchRegex.test(s.collectedBy) ||
              searchRegex.test(obs.catalogueProductName) ||
              searchRegex.test(obs.brandName) ||
              searchRegex.test(obs.variant || '') ||
              searchRegex.test(obs.weight || '') ||
              searchRegex.test(obs.packagingType || '') ||
              searchRegex.test(obs.notes || '') ||
              searchRegex.test(obs.promotionNotes || '');

            if (!match) continue;
          }

          const landing = obs.landingPrice || 0;
          const selling = obs.sellingPrice || 0;
          const mrp = obs.mrp || 0;

          const retailerProfit = selling > 0 && landing > 0 ? selling - landing : 0;
          const marginPercent =
            selling > 0 && landing > 0
              ? Math.round(((selling - landing) / selling) * 1000) / 10
              : 0;
          const mrpDiscount = mrp > 0 && selling > 0 ? mrp - selling : 0;
          const mrpDiscountPercent =
            mrp > 0 && selling > 0 ? Math.round(((mrp - selling) / mrp) * 1000) / 10 : 0;

          flatList.push({
            _id: obs._id,
            surveyId: s._id,
            customerId: s.customerId,
            customerName: s.customerName,
            customerType: s.customerType || 'Retailer',
            marketLocation: s.marketLocation || '',
            routeId: s.routeId,
            surveyDate: s.surveyDate,
            collectedBy: s.collectedBy,
            surveyNotes: s.notes || '',
            surveyStatus: s.status,
            catalogueProductId: obs.catalogueProductId,
            catalogueProductName: obs.catalogueProductName,
            brandName: obs.brandName,
            variant: obs.variant || '',
            weight: obs.weight || '',
            packagingType: obs.packagingType || '',
            landingPrice: landing,
            sellingPrice: selling,
            mrp: mrp,
            retailerProfit,
            marginPercent,
            mrpDiscount,
            mrpDiscountPercent,
            promotionNotes: obs.promotionNotes || '',
            notes: obs.notes || '',
            createdAt: obs.createdAt || s.createdAt
          });
        }
      }

      // Calculate KPI Aggregates
      const allSurveys = await MarketStudySurvey.find();
      const allObservations = allSurveys.flatMap((s) => s.observations);

      const uniqueBrands = Array.from(
        new Set(allObservations.map((o) => o.brandName).filter(Boolean))
      ).sort();
      const uniqueLocations = Array.from(
        new Set(allSurveys.map((s) => s.marketLocation).filter(Boolean))
      ).sort();
      const uniqueCollectors = Array.from(
        new Set(allSurveys.map((s) => s.collectedBy).filter(Boolean))
      ).sort();
      const uniqueProducts = Array.from(
        new Set(allObservations.map((o) => o.catalogueProductName).filter(Boolean))
      ).sort();
      const uniqueVariants = Array.from(
        new Set(allObservations.map((o) => o.variant).filter(Boolean))
      ).sort();

      let totalMRP = 0;
      let totalLanding = 0;
      let totalSelling = 0;
      let totalProfitSum = 0;
      let validMarginCount = 0;

      flatList.forEach((item) => {
        totalMRP += item.mrp || 0;
        totalLanding += item.landingPrice || 0;
        totalSelling += item.sellingPrice || 0;

        if (item.sellingPrice > 0 && item.landingPrice > 0) {
          totalProfitSum += item.sellingPrice - item.landingPrice;
          validMarginCount++;
        }
      });

      const count = flatList.length;
      const uniqueShopsCount = new Set(flatList.map((item) => item.customerName)).size;
      const uniqueObservedProductsCount = new Set(
        flatList.map((item) => item.catalogueProductName)
      ).size;

      const summary = {
        totalObservations: count,
        totalSurveysCount: surveys.length,
        totalShopsSurveyed: uniqueShopsCount,
        totalProductsObserved: uniqueObservedProductsCount,
        uniqueBrandsCount: uniqueBrands.length,
        uniqueBrands,
        uniqueLocations,
        uniqueCollectors,
        uniqueProducts,
        uniqueVariants,
        avgMRP: count > 0 ? Math.round((totalMRP / count) * 100) / 100 : 0,
        avgLandingPrice: count > 0 ? Math.round((totalLanding / count) * 100) / 100 : 0,
        avgSellingPrice: count > 0 ? Math.round((totalSelling / count) * 100) / 100 : 0,
        avgMarginPercent:
          totalSelling > 0
            ? Math.round((totalProfitSum / totalSelling) * 1000) / 10
            : validMarginCount > 0
            ? Math.round((totalProfitSum / validMarginCount) * 10) / 10
            : 0
      };

      res.json({
        observations: flatList,
        surveys,
        summary
      });
    } catch (error) {
      console.error('Error fetching market study observations:', error);
      res.status(500).json({ error: 'Failed to fetch market study observations' });
    }
  }
}
