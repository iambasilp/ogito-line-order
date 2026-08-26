import { Request, Response } from 'express';
import Freezer from '../models/Freezer';

// Auto-generate Freezer ID: FZR-000001
const generateNextFreezerId = async (): Promise<string> => {
  const lastFreezer = await Freezer.findOne({}, { freezerId: 1 }).sort({ freezerId: -1 });
  
  let nextNumber = 1;
  if (lastFreezer && lastFreezer.freezerId.startsWith('FZR-')) {
    const lastNumberStr = lastFreezer.freezerId.replace('FZR-', '');
    const lastNumber = parseInt(lastNumberStr, 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }
  
  return `FZR-${nextNumber.toString().padStart(6, '0')}`;
};

export const getFreezers = async (req: Request, res: Response) => {
  try {
    const { search, status, condition, area, salesman, customerName } = req.query;
    
    let query: any = {};
    
    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      query.$or = [
        { freezerId: searchRegex },
        { serialNumber: searchRegex },
        { customerName: searchRegex },
        { model: searchRegex }
      ];
    }
    
    if (status) query.status = status;
    if (condition) query.condition = condition;
    if (area) query.area = new RegExp(area as string, 'i');
    if (salesman) query.salesman = new RegExp(salesman as string, 'i');
    if (customerName) query.customerName = new RegExp(customerName as string, 'i');

    const freezers = await Freezer.find(query).sort({ freezerId: 1 });
    res.json(freezers);
  } catch (error: any) {
    console.error('Error fetching freezers:', error);
    res.status(500).json({ message: 'Error fetching freezers', error: error.message });
  }
};

export const getFreezerById = async (req: Request, res: Response) => {
  try {
    const freezer = await Freezer.findOne({ freezerId: req.params.id });
    if (!freezer) {
      return res.status(404).json({ message: 'Freezer not found' });
    }
    res.json(freezer);
  } catch (error: any) {
    console.error('Error fetching freezer:', error);
    res.status(500).json({ message: 'Error fetching freezer', error: error.message });
  }
};

export const createFreezer = async (req: Request, res: Response) => {
  try {
    // Generate new ID
    const freezerId = await generateNextFreezerId();
    
    const newFreezer = new Freezer({
      ...req.body,
      freezerId
    });
    
    const savedFreezer = await newFreezer.save();
    res.status(201).json(savedFreezer);
  } catch (error: any) {
    console.error('Error creating freezer:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Freezer ID or Serial Number already exists' });
    }
    res.status(500).json({ message: 'Error creating freezer', error: error.message });
  }
};

export const updateFreezer = async (req: Request, res: Response) => {
  try {
    const { freezerId, ...updateData } = req.body; // Prevent updating freezerId
    
    const freezer = await Freezer.findOneAndUpdate(
      { freezerId: req.params.id },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!freezer) {
      return res.status(404).json({ message: 'Freezer not found' });
    }
    
    res.json(freezer);
  } catch (error: any) {
    console.error('Error updating freezer:', error);
    res.status(500).json({ message: 'Error updating freezer', error: error.message });
  }
};

export const deleteFreezer = async (req: Request, res: Response) => {
  try {
    // Soft delete by setting status to Retired
    const freezer = await Freezer.findOneAndUpdate(
      { freezerId: req.params.id },
      { $set: { status: 'Retired' } },
      { new: true }
    );
    
    if (!freezer) {
      return res.status(404).json({ message: 'Freezer not found' });
    }
    
    res.json({ message: 'Freezer retired successfully', freezer });
  } catch (error: any) {
    console.error('Error retiring freezer:', error);
    res.status(500).json({ message: 'Error retiring freezer', error: error.message });
  }
};
