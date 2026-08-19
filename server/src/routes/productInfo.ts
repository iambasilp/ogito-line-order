import express from 'express';
import { authenticate } from '../middleware/auth';
import ProductInfo from '../models/ProductInfo';

const router = express.Router();

// Get all product info
router.get('/', authenticate, async (req, res) => {
  try {
    const productInfos = await ProductInfo.find().sort({ createdAt: -1 });
    res.json(productInfos);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create product info
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, image } = req.body;
    
    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    const productInfo = new ProductInfo({
      name,
      description,
      image
    });

    await productInfo.save();
    res.status(201).json(productInfo);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product info
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, description, image } = req.body;
    
    const productInfo = await ProductInfo.findByIdAndUpdate(
      req.params.id,
      { name, description, image },
      { new: true, runValidators: true }
    );

    if (!productInfo) {
      return res.status(404).json({ error: 'Product info not found' });
    }

    res.json(productInfo);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete product info
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const productInfo = await ProductInfo.findByIdAndDelete(req.params.id);
    
    if (!productInfo) {
      return res.status(404).json({ error: 'Product info not found' });
    }

    res.json({ message: 'Product info deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
