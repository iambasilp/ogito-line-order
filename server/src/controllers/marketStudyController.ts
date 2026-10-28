import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import MarketStudy from '../models/MarketStudy';

export class MarketStudyController {
  // Get all market studies with filtering, searching, and aggregate statistics
  static async getMarketStudies(req: AuthRequest, res: Response) {
    try {
      const { search, brand, customerType, collectedBy, location, label, fromDate, toDate } = req.query;

      const query: any = {};

      if (brand && brand !== 'all' && brand !== 'All') {
        query.brandName = brand;
      }

      if (customerType && customerType !== 'all' && customerType !== 'All') {
        query.customerType = customerType;
      }

      if (collectedBy && collectedBy !== 'all' && collectedBy !== 'All') {
        query.collectedBy = collectedBy;
      }

      if (location && location !== 'all' && location !== 'All') {
        query.marketLocation = location;
      }

      if (label && label !== 'all' && label !== 'All') {
        query.labels = label;
      }

      if (fromDate || toDate) {
        query.collectionDate = {};
        if (fromDate) {
          const from = new Date(fromDate as string);
          from.setHours(0, 0, 0, 0);
          query.collectionDate.$gte = from;
        }
        if (toDate) {
          const to = new Date(toDate as string);
          to.setHours(23, 59, 59, 999);
          query.collectionDate.$lte = to;
        }
      }

      if (search) {
        const searchRegex = new RegExp(String(search).trim(), 'i');
        query.$or = [
          { productName: searchRegex },
          { customerName: searchRegex },
          { brandName: searchRegex },
          { marketLocation: searchRegex },
          { collectedBy: searchRegex },
          { packagingType: searchRegex },
          { weight: searchRegex },
          { labels: searchRegex }
        ];
      }

      const studies = await MarketStudy.find(query).sort({ collectionDate: -1, createdAt: -1 });

      // Calculate stats based on all records or filtered records
      const allRecords = await MarketStudy.find();
      const uniqueBrands = Array.from(new Set(allRecords.map(r => r.brandName).filter(Boolean)));
      const uniqueLocations = Array.from(new Set(allRecords.map(r => r.marketLocation).filter(Boolean)));
      const uniqueCollectors = Array.from(new Set(allRecords.map(r => r.collectedBy).filter(Boolean)));
      const allLabels = allRecords.flatMap(r => r.labels || []).filter(Boolean);
      const uniqueLabels = Array.from(new Set(allLabels)).sort();

      let totalMRP = 0;
      let totalLanding = 0;
      let totalSelling = 0;
      let validMarginCount = 0;
      let totalMarginPct = 0;

      studies.forEach(s => {
        totalMRP += s.mrp || 0;
        totalLanding += s.landingPrice || 0;
        totalSelling += s.sellingPrice || 0;

        if (s.sellingPrice > 0 && s.landingPrice > 0) {
          const margin = ((s.sellingPrice - s.landingPrice) / s.sellingPrice) * 100;
          totalMarginPct += margin;
          validMarginCount++;
        }
      });

      const count = studies.length;
      const summary = {
        totalEntries: count,
        totalAllEntries: allRecords.length,
        uniqueBrandsCount: uniqueBrands.length,
        uniqueBrands,
        uniqueLocations,
        uniqueCollectors,
        uniqueLabels,
        avgMRP: count > 0 ? Math.round((totalMRP / count) * 100) / 100 : 0,
        avgLandingPrice: count > 0 ? Math.round((totalLanding / count) * 100) / 100 : 0,
        avgSellingPrice: count > 0 ? Math.round((totalSelling / count) * 100) / 100 : 0,
        avgMarginPercent: validMarginCount > 0 ? Math.round((totalMarginPct / validMarginCount) * 10) / 10 : 0
      };

      res.json({
        studies,
        summary
      });
    } catch (error) {
      console.error('Error fetching market studies:', error);
      res.status(500).json({ error: 'Failed to fetch market study data' });
    }
  }

  // Create a new market study entry
  static async createMarketStudy(req: AuthRequest, res: Response) {
    try {
      const {
        productName,
        labels,
        customerName,
        customerType,
        collectedBy,
        brandName,
        weight,
        packagingType,
        landingPrice,
        sellingPrice,
        mrp,
        marketLocation,
        notes,
        collectionDate
      } = req.body;

      if (!productName || !customerName || !brandName) {
        return res.status(400).json({
          error: 'Product Name, Customer/Shop Name, and Brand Name are required'
        });
      }

      // Default collectedBy to logged in user if not provided
      const finalCollectedBy = collectedBy || req.user?.username || 'Unknown';

      // Sanitize labels array
      const sanitizedLabels = Array.isArray(labels)
        ? Array.from(new Set(labels.map((l: any) => String(l).trim()).filter(Boolean)))
        : [];

      const study = new MarketStudy({
        productName: productName.trim(),
        labels: sanitizedLabels,
        customerName: customerName.trim(),
        customerType: customerType ? customerType.trim() : 'Retailer',
        collectedBy: finalCollectedBy.trim(),
        brandName: brandName.trim(),
        weight: weight ? weight.trim() : '',
        packagingType: packagingType ? packagingType.trim() : '',
        landingPrice: Number(landingPrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        mrp: Number(mrp) || 0,
        marketLocation: marketLocation ? marketLocation.trim() : '',
        notes: notes ? notes.trim() : '',
        collectionDate: collectionDate ? new Date(collectionDate) : new Date(),
        createdBy: req.user?.id
      });

      await study.save();
      res.status(201).json(study);
    } catch (error) {
      console.error('Error creating market study:', error);
      res.status(500).json({ error: 'Failed to create market study entry' });
    }
  }

  // Update an existing market study entry
  static async updateMarketStudy(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const {
        productName,
        labels,
        customerName,
        customerType,
        collectedBy,
        brandName,
        weight,
        packagingType,
        landingPrice,
        sellingPrice,
        mrp,
        marketLocation,
        notes,
        collectionDate
      } = req.body;

      const updateData: any = {};
      if (productName !== undefined) updateData.productName = productName.trim();
      if (labels !== undefined) {
        updateData.labels = Array.isArray(labels)
          ? Array.from(new Set(labels.map((l: any) => String(l).trim()).filter(Boolean)))
          : [];
      }
      if (customerName !== undefined) updateData.customerName = customerName.trim();
      if (customerType !== undefined) updateData.customerType = customerType.trim();
      if (collectedBy !== undefined) updateData.collectedBy = collectedBy.trim();
      if (brandName !== undefined) updateData.brandName = brandName.trim();
      if (weight !== undefined) updateData.weight = weight.trim();
      if (packagingType !== undefined) updateData.packagingType = packagingType.trim();
      if (landingPrice !== undefined) updateData.landingPrice = Number(landingPrice) || 0;
      if (sellingPrice !== undefined) updateData.sellingPrice = Number(sellingPrice) || 0;
      if (mrp !== undefined) updateData.mrp = Number(mrp) || 0;
      if (marketLocation !== undefined) updateData.marketLocation = marketLocation.trim();
      if (notes !== undefined) updateData.notes = notes.trim();
      if (collectionDate !== undefined) updateData.collectionDate = new Date(collectionDate);

      const updated = await MarketStudy.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true
      });

      if (!updated) {
        return res.status(404).json({ error: 'Market study record not found' });
      }

      res.json(updated);
    } catch (error) {
      console.error('Error updating market study:', error);
      res.status(500).json({ error: 'Failed to update market study record' });
    }
  }

  // Delete a market study entry
  static async deleteMarketStudy(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await MarketStudy.findByIdAndDelete(id);

      if (!deleted) {
        return res.status(404).json({ error: 'Market study record not found' });
      }

      res.json({ message: 'Market study record deleted successfully' });
    } catch (error) {
      console.error('Error deleting market study:', error);
      res.status(500).json({ error: 'Failed to delete market study record' });
    }
  }
}
